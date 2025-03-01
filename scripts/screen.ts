import { Shader } from './shader';
import { Scene } from './scene';
import { Scale2D } from './objec';
import { Camera } from './camera';

export enum SCREENACTION {
  IDLE,
  RESIZING,
}

// Fills up one canvas
export class FScreen {
  canvas: HTMLCanvasElement;
  gl: WebGL2RenderingContext;

  scene: Scene;
  shaders: Shader[] = [];
  cameras: Camera[] = [];

  margin: number = 5;
  screenAction = SCREENACTION.IDLE;
  resizingCameras: Camera[] = [];

  textures: Record<number, WebGLTexture> = {}; //For the context of webgl, we need to track what objects use what texture

  // Manage what keys are being held down
  // https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/code
  keysDown: Record<string, boolean> = {};

  //Constructor requires an identifier for a canvas
  constructor(canvasID: string, scene: Scene) {
    this.canvas = document.getElementById(canvasID) as HTMLCanvasElement;
    this.canvas.width = this.canvas.clientWidth;
    this.canvas.height = this.canvas.clientHeight;

    this.gl = this.canvas.getContext('webgl2') as WebGL2RenderingContext;
    this.scene = scene;

    //Ensure webgl is properly set up
    if (!this.gl) {
      alert('Unable to initialize WebGL. Your browser or machine may not support it.');
      return;
    }

    this.set_scene(this.scene);

    document.addEventListener('mousedown', (e) => {
      const focussedCameras = this.getCamerasFromCursor(e);

      // If there are multiple cameras, start resizing
      if (focussedCameras.length >= 2) {
        this.screenAction = SCREENACTION.RESIZING;
        this.resizingCameras = focussedCameras;
      } else if (focussedCameras.length == 1) {
        focussedCameras.at(0)?.camera_data.onMouseDown(e);
      }
    });

    document.addEventListener('mousemove', (e) => {
      if (this.screenAction === SCREENACTION.RESIZING) {
        this.resizingCameras[0].pxWidth += e.movementX;
        this.resizingCameras[0].camera_data.width =
          this.resizingCameras[0].pxWidth / this.canvas.width;

        this.resizingCameras[1].camera_data.tlCorner[0] = this.resizingCameras[0].camera_data.width;
        this.resizingCameras[1].pxWidth -= e.movementX;
        this.resizingCameras[1].camera_data.width =
          this.resizingCameras[1].pxWidth / this.canvas.width;

        this.on_resize();
        this.draw();

        return;
      }

      const focussedCameras = this.getCamerasFromCursor(e);

      // If there are multiple cameras, start resizing
      if (focussedCameras.length >= 2) {
        document.body.style.cursor = 'ew-resize';
      } else if (focussedCameras.length == 1) {
        document.body.style.cursor = focussedCameras.at(0)?.camera_data.cursor ?? 'default';
      }

      if (focussedCameras.length == 1) {
        focussedCameras.at(0)?.camera_data.onMouseMove(e);
      }
    });

    document.addEventListener('mouseup', (e) => {
      // If just done resizing, end here
      if (this.screenAction === SCREENACTION.RESIZING) {
        this.screenAction = SCREENACTION.IDLE;
        this.resizingCameras = [];
        return;
      }

      const focussedCameras = this.getCamerasFromCursor(e);

      if (focussedCameras.length == 1) {
        focussedCameras.at(0)?.camera_data.onMouseUp(e);
      }
    });

    document.addEventListener('wheel', (e) => {
      // If just done resizing, end here
      if (this.screenAction === SCREENACTION.RESIZING) return;

      const focussedCameras = this.getCamerasFromCursor(e);

      if (focussedCameras.length == 1) {
        focussedCameras.at(0)?.camera_data.onWheel(e);
      }
    });

    window.addEventListener('keydown', (e) => {
      this.keysDown[e.code] = true;
      if (this.scene.keyDownCallbacks[e.code]) {
        this.scene.keyDownCallbacks[e.code]();
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keysDown[e.code] = false;
      if (this.scene.keyUpCallbacks[e.code]) {
        this.scene.keyUpCallbacks[e.code]();
      }
    });

    window.addEventListener('resize', () => {
      this.canvas.width = this.canvas.clientWidth;
      this.canvas.height = this.canvas.clientHeight;

      this.cameras.forEach((camera) => {
        camera.recalculate_px_dim();
      });

      this.on_resize();
      this.draw();
    });
  }

  set_scene(scene: Scene) {
    this.shaders.forEach((shader) => {
      shader.Destructor();
    });

    this.scene = scene;
    this.shaders = this.scene.shader_data.map((shader_data) => new Shader(this, shader_data));
    this.cameras = this.scene.camera_data.map((camera_data) => new Camera(this, camera_data));

    Object.entries(this.scene.textures).forEach(([id, texture_source]) => {
      //Creates texture and binds it to WebGL
      const texture = this.gl.createTexture();
      this.textures[parseInt(id)] = texture;
      this.gl.activeTexture(this.gl.TEXTURE0 + parseInt(id));
      this.gl.bindTexture(this.gl.TEXTURE_2D, texture);

      //Puts image into texture
      this.gl.texImage2D(
        this.gl.TEXTURE_2D,
        0,
        this.gl.RGBA,
        this.gl.RGBA,
        this.gl.UNSIGNED_BYTE,
        texture_source,
      );

      //Adjusts texture parameters
      this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST); //This removes blurring
      this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
      this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
      this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);

      this.gl.generateMipmap(this.gl.TEXTURE_2D);
    });

    this.on_resize();
  }

  on_resize() {
    this.shaders
      .flatMap((shader) => shader.shader_data.models)
      .flatMap((model) => model.objects)
      .forEach((object) => {
        // Need to find a better way to do this
        const camera = this.cameras.find(
          (camera) => camera.camera_data.worldIndex === object.worldIndex,
        ) as Camera;
        if (object.rotpos.scale instanceof Scale2D)
          object.rotpos.scale.calculate_dim(camera.pxWidth, camera.pxHeight);
      });
  }

  draw() {
    this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
    this.cameras.forEach((camera) => camera.Draw());
  }

  getCamerasFromCursor(e: MouseEvent) {
    return this.cameras.filter(
      (camera) =>
        camera.camera_data.tlCorner[0] * this.canvas.width - this.margin <= e.pageX &&
        e.pageX <=
          camera.camera_data.tlCorner[0] * this.canvas.width + camera.pxWidth + this.margin &&
        camera.camera_data.tlCorner[1] * this.canvas.height - this.margin <= e.pageY &&
        e.pageY <=
          camera.camera_data.tlCorner[1] * this.canvas.height + camera.pxHeight + this.margin,
    );
  }
}
//Toggles fullscreen
export function toggleFullScreen(): void {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen();
  } else {
    document.exitFullscreen();
  }
}
