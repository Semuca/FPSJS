import { Shader } from './shader';
import { Scene } from './scene';
import { RotPos2D } from './objec';
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
  cameras: Camera[] = [];

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
        this.resizing_lines = this.get_lines_from_cameras(
          (this.camera_tree as HorizontalCameraLine<Camera>[] | VerticalCameraLine<Camera>[])[0],
          hovered_cameras,
        );
      } else if (hovered_cameras.length == 1) {
        if (hovered_cameras.at(0)?.camera_data.onMouseDown(e, hovered_cameras.at(0)!)) this.draw(); // requestAnimationFrame?
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
          const top_items: [Camera, number, boolean][] =
            horizontal_line.top instanceof Camera
              ? [[horizontal_line.top, 1, true]]
              : split_by(horizontal_line.top, 1, horizontal_line.top, true);
          const bottom_items: [Camera, number, boolean][] =
            horizontal_line.bottom instanceof Camera
              ? [[horizontal_line.bottom, 1, false]]
              : split_by(horizontal_line.bottom, 1, horizontal_line.bottom, false);
          const items: [[Camera, number, boolean][], number][] = [
            [top_items, 1],
            [bottom_items, -1],
          ];

          items.forEach(([items, dir]) => {
            items.forEach(([camera, mod, most]) => {
              const mov = (dir * e.movementY) / mod;
              if (most === false) {
                camera.camera_data.tlCorner[1] =
                  (camera.camera_data.tlCorner[1] * this.canvas.height - mov) / this.canvas.height;
              }
              camera.pxHeight += mov;
              camera.camera_data.height = camera.pxHeight / this.canvas.height;
            });
          });
        });

        vertical_lines.forEach((vertical_line) => {
          const left_items: [Camera, number, boolean][] =
            vertical_line.left instanceof Camera
              ? [[vertical_line.left, 1, true]]
              : split_by(vertical_line.left, 1, vertical_line.left, true);
          const right_items: [Camera, number, boolean][] =
            vertical_line.right instanceof Camera
              ? [[vertical_line.right, 1, false]]
              : split_by(vertical_line.right, 1, vertical_line.right, false);
          const items: [[Camera, number, boolean][], number][] = [
            [left_items, 1],
            [right_items, -1],
          ];

          items.forEach(([items, dir]) => {
            items.forEach(([camera, mod, most]) => {
              const mov = (dir * e.movementX) / mod;
              if (most === false) {
                camera.camera_data.tlCorner[0] =
                  (camera.camera_data.tlCorner[0] * this.canvas.width - mov) / this.canvas.width;
              }
              camera.pxWidth += mov;
              camera.camera_data.width = camera.pxWidth / this.canvas.width;
            });
          });
        });

        this.on_resize();
        this.draw();

        return;
      }

      const hovered_cameras = this.getCamerasFromCursor(e);

      // If there are multiple cameras, start resizing
      if (hovered_cameras.length >= 2) {
        const hovered_lines = this.get_lines_from_cameras(
          (this.camera_tree as HorizontalCameraLine<Camera>[] | VerticalCameraLine<Camera>[])[0],
          hovered_cameras,
        );
        if (hovered_lines[0].length == 0) {
          document.body.style.cursor = 'ew-resize';
        } else if (hovered_lines[1].length == 0) {
          document.body.style.cursor = 'ns-resize';
        } else {
          document.body.style.cursor = 'move';
        }
      } else if (hovered_cameras.length == 1) {
        document.body.style.cursor = hovered_cameras.at(0)?.camera_data.cursor ?? 'default';
      }

      if (hovered_cameras.length == 1) {
        hovered_cameras.at(0)?.camera_data.onMouseMove(e);
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
      this.keysDown[e.key] = true;
      if (this.scene.keyDownCallbacks[e.key]) {
        this.scene.keyDownCallbacks[e.key]();
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keysDown[e.key] = false;
      if (this.scene.keyUpCallbacks[e.key]) {
        this.scene.keyUpCallbacks[e.key]();
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
    ): [Camera[], HorizontalCameraLine<Camera>] => {
      const top_cam: [Camera[], VerticalCameraLine<Camera>?] =
        camera_tree.top instanceof CameraData
          ? [[new Camera(this, camera_tree.top)], undefined]
          : camera_tree_walk_vert(camera_tree.top);
      const bottom_cam: [Camera[], VerticalCameraLine<Camera>?] =
        camera_tree.bottom instanceof CameraData
          ? [[new Camera(this, camera_tree.bottom)], undefined]
          : camera_tree_walk_vert(camera_tree.bottom);
      return [
        top_cam[0].concat(bottom_cam[0]).filter(Boolean),
        new HorizontalCameraLine(
          top_cam[1] ?? top_cam[0][0],
          bottom_cam[1] ?? bottom_cam[0][0],
          camera_tree.pos,
        ),
      ];
    };

    const camera_tree_walk_vert = (
      camera_tree: VerticalCameraLine<CameraData>,
    ): [Camera[], VerticalCameraLine<Camera>] => {
      const left_cam: [Camera[], HorizontalCameraLine<Camera>?] =
        camera_tree.left instanceof CameraData
          ? [[new Camera(this, camera_tree.left)], undefined]
          : camera_tree_walk_horiz(camera_tree.left);
      const right_cam: [Camera[], HorizontalCameraLine<Camera>?] =
        camera_tree.right instanceof CameraData
          ? [[new Camera(this, camera_tree.right)], undefined]
          : camera_tree_walk_horiz(camera_tree.right);
      return [
        left_cam[0].concat(right_cam[0]).filter(Boolean),
        new VerticalCameraLine(
          left_cam[1] ?? left_cam[0][0],
          right_cam[1] ?? right_cam[0][0],
          camera_tree.pos,
        ),
      ];
    };

    if (scene.camera_tree instanceof CameraData) {
      this.camera_tree = new Camera(this, scene.camera_tree);
      this.cameras = [this.camera_tree];
    } else if (scene.camera_tree.at(0) instanceof HorizontalCameraLine) {
      const results = (scene.camera_tree as HorizontalCameraLine<CameraData>[]).map((line) =>
        camera_tree_walk_horiz(line),
      );
      this.camera_tree = results.map((result) => result[1]);
      this.cameras = results.flatMap((result) => result[0]);
    } else if (scene.camera_tree.at(0) instanceof VerticalCameraLine) {
      const results = (scene.camera_tree as VerticalCameraLine<CameraData>[]).map((line) =>
        camera_tree_walk_vert(line),
      );

      this.camera_tree = results.map((result) => result[1]);
      this.cameras = results.flatMap((result) => result[0]);
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
        if (object.rotpos instanceof RotPos2D) object.rotpos.calculate_dim(camera);
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

  get_lines_from_cameras(
    camera_tree: HorizontalCameraLine<Camera> | VerticalCameraLine<Camera>,
    hovered_cameras: Camera[],
  ): [HorizontalCameraLine<Camera>[], VerticalCameraLine<Camera>[]] {
    if (camera_tree instanceof VerticalCameraLine) {
      const left =
        camera_tree.left instanceof Camera
          ? hovered_cameras.find((camera) => camera == camera_tree.left)
          : this.get_lines_from_cameras(camera_tree.left, hovered_cameras);
      const right =
        camera_tree.right instanceof Camera
          ? hovered_cameras.find((camera) => camera == camera_tree.right)
          : this.get_lines_from_cameras(camera_tree.right, hovered_cameras);

      const existing_left_lines: [HorizontalCameraLine<Camera>[], VerticalCameraLine<Camera>[]] =
        Array.isArray(left) ? left : [[], []];
      const existing_right_lines: [HorizontalCameraLine<Camera>[], VerticalCameraLine<Camera>[]] =
        Array.isArray(right) ? right : [[], []];
      const existing_lines: [HorizontalCameraLine<Camera>[], VerticalCameraLine<Camera>[]] = [
        existing_left_lines[0].concat(existing_right_lines[0]),
        existing_left_lines[1].concat(existing_right_lines[1]),
      ];

      if (left && right) return [existing_lines[0], existing_lines[1].concat([camera_tree])];
      return existing_lines;
    } else {
      const top =
        camera_tree.top instanceof Camera
          ? hovered_cameras.find((camera) => camera == camera_tree.top)
          : this.get_lines_from_cameras(camera_tree.top, hovered_cameras);
      const bottom =
        camera_tree.bottom instanceof Camera
          ? hovered_cameras.find((camera) => camera == camera_tree.bottom)
          : this.get_lines_from_cameras(camera_tree.bottom, hovered_cameras);

      const existing_left_lines: [HorizontalCameraLine<Camera>[], VerticalCameraLine<Camera>[]] =
        Array.isArray(top) ? top : [[], []];
      const existing_right_lines: [HorizontalCameraLine<Camera>[], VerticalCameraLine<Camera>[]] =
        Array.isArray(bottom) ? bottom : [[], []];
      const existing_lines: [HorizontalCameraLine<Camera>[], VerticalCameraLine<Camera>[]] = [
        existing_left_lines[0].concat(existing_right_lines[0]),
        existing_left_lines[1].concat(existing_right_lines[1]),
      ];

      if (top && bottom) return [existing_lines[0].concat([camera_tree]), existing_lines[1]];
      return existing_lines;
    }
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
