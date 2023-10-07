import * as T from 'three';
// eslint-disable-next-line import/no-unresolved
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

import fragment from '../shaders/fragment.glsl';
import vertex from '../shaders/vertex.glsl';
import { GUI } from 'dat.gui';
import GeoTIFF, { fromBlob, fromUrl, fromFile } from 'geotiff';
// import tiffile from '../assets/EMIT_L2B_CH4PLM_001_20230502T042258_000905.tif'

const device = {
  width: window.innerWidth,
  height: window.innerHeight,
  pixelRatio: window.devicePixelRatio
};


const lerp = (a, b, t) => (1 - t) * a + t * b;

function transform(a, b, M, roundToInt = false) {
  const round = (v) => (roundToInt ? v | 0 : v);
  return [
    round(M[0] + M[1] * a + M[2] * b),
    round(M[3] + M[4] * a + M[5] * b),
  ];
}

const toPlaneUV = (lat, lon) => {
}

export default class Three {
  constructor(canvas) {
    this.canvas = canvas;

    this.scene = new T.Scene();

    this.camera = new T.PerspectiveCamera(
      75,
      device.width / device.height,
      0.00001,
      100
    );
    this.camera.position.set(0, 1, 0);
    this.scene.add(this.camera);

    this.renderer = new T.WebGLRenderer({
      canvas: this.canvas,
      alpha: true,
      antialias: true,
      preserveDrawingBuffer: true
    });
    this.renderer.setSize(device.width, device.height);
    this.renderer.setPixelRatio(Math.min(device.pixelRatio, 2));

    this.controls = new OrbitControls(this.camera, this.canvas);
    this.controls.enableRotate = false;

    this.clock = new T.Clock();

    this.gui = new GUI();

    this.loadMethaneAssets();

    this.generateTexture();

    this.loadAssets();
    this.setup_params();
    this.renderUI();
    this.setLights();
    this.setGeometry();
    this.render();
    this.setResize();
  }


  setup_params() {
    this.scaleX = 1;
    this.scaleY = 1;
    this.scaleZ = 1;

    this.layers = {
      earth: true,
      methane: true,
      cow: true,
      someCrop: true,
    }
    // this.positionX = 0;
    // this.positionY = 0;
    // this.positionZ = 0;
    // this.rotationX = 0;
    // this.rotationY = 90;
    // this.rotationZ = 0;
    // this.boxColor = color;
    // this.castShadow = true;
    // this.boxOpacity = 1;
  }

  renderUI() {
    var f1 = this.gui.addFolder('Scale');
    f1.open();
    f1.add(this, 'scaleX', 0.1, 5)
    f1.add(this, 'scaleY', 0.1, 5)
    f1.add(this, 'scaleZ', 0.1, 5)

    var layersFolder = this.gui.addFolder('Layer');
    layersFolder.open();
    layersFolder.add(this.layers, 'earth')
    layersFolder.add(this.layers, 'methane');
    layersFolder.add(this.layers, 'cow');
    layersFolder.add(this.layers, 'someCrop');
  }

  setLights() {
    this.ambientLight = new T.AmbientLight(new T.Color(1, 1, 1, 1));
    this.scene.add(this.ambientLight);
  }

  setGeometry() {
    this.planeGeometry = new T.PlaneGeometry(10000, 1.0);
    // this.planeMaterial = new T.ShaderMaterial({
    //   side: T.DoubleSide,
    //   wireframe: true,
    //   fragmentShader: fragment,
    //   vertexShader: vertex,
    //   uniforms: {
    //     progress: { type: 'f', value: 0 }
    //   }
    // });
    this.planeMaterial = new T.MeshBasicMaterial({map: this.earthtex})
    this.planeMesh = new T.Mesh(this.planeGeometry, this.planeMaterial);
    this.planeMesh.rotation.x = -90 * Math.PI / 180.0
    this.scene.add(this.planeMesh);

    this.methaneGeometry = new T.PlaneGeometry(10000, 1.0);
    this.methaneMaterial = new T.MeshBasicMaterial()
    this.methaneMaterial.transparent = true;
    this.methaneMaterial.opacity = 0.5;
    this.methaneMaterial.needsUpdate = true;
    this.methaneMesh = new T.Mesh(this.methaneGeometry, this.methaneMaterial);
    this.methaneMesh.rotation.x = -90 * Math.PI / 180.0
    this.scene.add(this.methaneMesh)
  }

  loadAssets() {
    this.earthtex = new T.TextureLoader().load('src/assets/8081_earthmap10k.jpg');
    this.earthtex.wrapS = T.RepeatWrapping;
    this.earthtex.repeat.set(5000, 1);
  }

  async loadMethaneAssets() {
    // TODO: use local file
    const tifurl = new URL('../assets/EMIT_L2B_CH4PLM_001_20230502T042258_000905.tif', import.meta.url).href;
    this.testasset = await fromUrl(tifurl);

    console.log(this.testasset);

    const image = await this.testasset.getImage(); // by default, the first image is read.

    // Construct the WGS-84 forward and inverse affine matrices:
    const { ModelPixelScale: s, ModelTiepoint: t } = image.fileDirectory;
    let [sx, sy, sz] = s;
    let [px, py, k, gx, gy, gz] = t;
    sy = -sy; // WGS-84 tiles have a "flipped" y component

    console.log('ModelPixelScale', s)

    const pixelToGPS = [gx, sx, 0, gy, 0, sy];
    console.log(`pixel to GPS transform matrix:`, pixelToGPS);

    const gpsToPixel = [-gx / sx, 1 / sx, 0, -gy / sy, 0, 1 / sy];
    console.log(`GPS to pixel transform matrix:`, gpsToPixel);

    const [gx1, gy1, gx2, gy2] = image.getBoundingBox();
    const lat = lerp(gy1, gy2, Math.random());
    const long = lerp(gx1, gx2, Math.random());
    console.log(`Looking up GPS coordinate (${lat.toFixed(6)},${long.toFixed(6)})`);

  }

  generateTexture() {
    const resolution = 2000;
    const textureScene = new T.Scene();
    textureScene.background = new T.Color(0x0000FF);

    const renderTarget = new T.WebGLRenderTarget(resolution, resolution);
    const textureCamera = new T.OrthographicCamera(-2, 2, -1, 1, 0.1, 100000.0);

    textureCamera.position.set(0, 0, 10);
    textureCamera.lookAt(0, 0, 0);

    // const loader = new THREE.TextureLoader();
    // const texture = await loader.loadAsync("https://threejs.org/examples/textures/uv_grid_opengl.jpg");
    // const geometry = new T.PlaneGeometry(50, 50);
    // const material = new T.MeshBasicMaterial();
    // const plane = new T.Mesh(geometry, material);
    // textureScene.add(plane);

    // this.renderer.setRenderTarget(renderTarget);
    // this.renderer.clear();
    this.renderer.render(textureScene, textureCamera, renderTarget);
    // this.renderer.setRenderTarget(null);

    return renderTarget.texture;
  }


  render() {
    const elapsedTime = this.clock.getElapsedTime();

    //this.planeMesh.rotation.x = 0.2 * elapsedTime;
    //this.planeMesh.rotation.y = 0.1 * elapsedTime;
    this.planeMesh.visible = this.layers.earth;
    this.methaneMesh.visible = this.layers.methane;

    this.renderer.render(this.scene, this.camera);
    requestAnimationFrame(this.render.bind(this));
  }

  setResize() {
    window.addEventListener('resize', this.onResize.bind(this));
  }

  onResize() {
    device.width = window.innerWidth;
    device.height = window.innerHeight;

    this.camera.aspect = device.width / device.height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(device.width, device.height);
    this.renderer.setPixelRatio(Math.min(device.pixelRatio, 2));
  }
}
