import * as T from 'three';
// eslint-disable-next-line import/no-unresolved
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

import fragment from '../shaders/fragment.glsl';
import vertex from '../shaders/vertex.glsl';
import { GUI } from 'dat.gui';

const device = {
  width: window.innerWidth,
  height: window.innerHeight,
  pixelRatio: window.devicePixelRatio
};

export default class Three {
  constructor(canvas) {
    this.canvas = canvas;

    this.scene = new T.Scene();

    this.camera = new T.PerspectiveCamera(
      75,
      device.width / device.height,
      0.1,
      100
    );
    this.camera.position.set(0, 0, 0.7);
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

    this.clock = new T.Clock();

    this.gui = new GUI();

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
    layersFolder.add(this.layers, 'methane');
    layersFolder.add(this.layers, 'cow');
    layersFolder.add(this.layers, 'someCrop');
  }

  setLights() {
    this.ambientLight = new T.AmbientLight(new T.Color(1, 1, 1, 1));
    this.scene.add(this.ambientLight);
  }

  setGeometry() {
    this.planeGeometry = new T.PlaneGeometry(1, 1, 128, 128);
    this.planeMaterial = new T.ShaderMaterial({
      side: T.DoubleSide,
      wireframe: true,
      fragmentShader: fragment,
      vertexShader: vertex,
      uniforms: {
        progress: { type: 'f', value: 0 }
      }
    });

    this.planeMesh = new T.Mesh(this.planeGeometry, this.planeMaterial);
    this.planeMesh.rotation.x = -80 * Math.PI / 180.0
    this.scene.add(this.planeMesh);
  }

  render() {
    const elapsedTime = this.clock.getElapsedTime();

    //this.planeMesh.rotation.x = 0.2 * elapsedTime;
    //this.planeMesh.rotation.y = 0.1 * elapsedTime;

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
