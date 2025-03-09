import { Shader } from './shader';
import { Scene } from './scene';
import { Scale2D } from './objec';
import { Camera, CameraData } from './camera';

export class HorizontalCameraLine<T> {
  constructor(
    public top: T | VerticalCameraLine<T>,
    public bottom: T | VerticalCameraLine<T>,
    public pos: number,
  ) {}
}

export class VerticalCameraLine<T> {
  constructor(
    public left: T | HorizontalCameraLine<T>,
    public right: T | HorizontalCameraLine<T>,
    public pos: number,
  ) {}
}

export type CameraTree<T> = T | HorizontalCameraLine<T>[] | VerticalCameraLine<T>[];

// Fills up one canvas
export class FScreen {
  canvas: HTMLCanvasElement;
  gl: WebGL2RenderingContext;

  scene: Scene;
  shaders: Shader[] = [];

  camera_tree!: CameraTree<Camera>;
  cameras!: Camera[];

  margin: number = 5;
  resizing_lines?: [HorizontalCameraLine<Camera>[], VerticalCameraLine<Camera>[]];

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
    this.set_scene(this.scene);

    //Ensure webgl is properly set up
    if (!this.gl) {
      alert('Unable to initialize WebGL. Your browser or machine may not support it.');
      return;
    }

    document.addEventListener('mousedown', (e) => {
      const hovered_cameras = this.getCamerasFromCursor(e);

      // If there are multiple cameras, start resizing
      if (hovered_cameras.length >= 2) {
        this.resizing_lines = hovered_cameras;
      } else if (hovered_cameras.length == 1) {
        hovered_cameras.at(0)?.camera_data.onMouseDown(e);
      }
    });

    document.addEventListener('mousemove', (e) => {
      if (this.resizing_lines !== undefined) {
        const [horizontal_lines, vertical_lines] = this.resizing_lines;

        const split_by = (
          what: Camera | HorizontalCameraLine<Camera> | VerticalCameraLine<Camera>,
          mod: number,
          by: HorizontalCameraLine<Camera> | VerticalCameraLine<Camera>,
          most: boolean,
        ): [Camera, number, boolean][] => {
          if (what instanceof Camera) {
            return [[what, mod, most]];
          } else if (what instanceof HorizontalCameraLine) {
            mod *= by instanceof VerticalCameraLine ? 2 : 1;
            return split_by(what.top, mod, by, most).concat(split_by(what.bottom, mod, by, false));
          } else {
            mod *= by instanceof HorizontalCameraLine ? 2 : 1;
            return split_by(what.left, mod, by, most).concat(split_by(what.right, mod, by, false));
          }
        };

        horizontal_lines.forEach((horizontal_line) => {
          split_by(horizontal_line, 0.5, horizontal_line, true).forEach(([camera, mod, most]) => {
            const mov = e.movementY / mod;
            if (most === false) {
              camera.camera_data.tlCorner[1] =
                (camera.camera_data.tlCorner[1] * this.canvas.height + mov) / this.canvas.height;
            }
            camera.pxHeight += mov;
            camera.camera_data.height = camera.pxHeight / this.canvas.height;
          });
        });

        vertical_lines.forEach((vertical_line) => {
          split_by(vertical_line, 0.5, vertical_line, true).forEach(([camera, mod, most]) => {
            const mov = e.movementX / mod;
            if (most === false) {
              camera.camera_data.tlCorner[0] =
                (camera.camera_data.tlCorner[0] * this.canvas.width + mov) / this.canvas.width;
            }
            camera.pxWidth += mov;
            camera.camera_data.width = camera.pxWidth / this.canvas.width;
          });
        });

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
      if (this.resizing_lines !== undefined) {
        this.resizing_lines = undefined;
        return;
      }

      const focussedCameras = this.getCamerasFromCursor(e);

      if (focussedCameras.length == 1) {
        focussedCameras.at(0)?.camera_data.onMouseUp(e);
      }
    });

    document.addEventListener('wheel', (e) => {
      // If just done resizing, end here
      if (this.resizing_lines !== undefined) return;

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

    const camera_tree_walk_horiz = (
      camera_tree: HorizontalCameraLine<CameraData>,
    ): HorizontalCameraLine<Camera> => {
      return new HorizontalCameraLine(
        camera_tree.top instanceof CameraData
          ? new Camera(this, camera_tree.top)
          : camera_tree_walk_vert(camera_tree.top),
        camera_tree.bottom instanceof CameraData
          ? new Camera(this, camera_tree.bottom)
          : camera_tree_walk_vert(camera_tree.bottom),
        camera_tree.pos,
      );
    };

    const camera_tree_walk_vert = (
      camera_tree: VerticalCameraLine<CameraData>,
    ): VerticalCameraLine<Camera> => {
      return new VerticalCameraLine(
        camera_tree.left instanceof CameraData
          ? new Camera(this, camera_tree.left)
          : camera_tree_walk_horiz(camera_tree.left),
        camera_tree.right instanceof CameraData
          ? new Camera(this, camera_tree.right)
          : camera_tree_walk_horiz(camera_tree.right),
        camera_tree.pos,
      );
    };

    if (scene.camera_tree instanceof CameraData) {
      this.camera_tree = new Camera(this, scene.camera_tree);
    } else if (scene.camera_tree.at(0) instanceof HorizontalCameraLine) {
      this.camera_tree = (scene.camera_tree as HorizontalCameraLine<CameraData>[]).map((line) =>
        camera_tree_walk_horiz(line),
      );
    } else if (scene.camera_tree.at(0) instanceof VerticalCameraLine) {
      this.camera_tree = (scene.camera_tree as VerticalCameraLine<CameraData>[]).map((line) =>
        camera_tree_walk_vert(line),
      );
    }

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
