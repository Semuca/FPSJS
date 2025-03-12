import { mat4 } from 'gl-matrix';
import { RotPos } from './objec';
import { Scene } from './scene';
import { FScreen } from './screen';
import { Point2D } from './geometry';

export enum LeftOrRight {
  Left,
  Right,
}

export enum TopOrBottom {
  Top,
  Bottom,
}

export class ZoomCameraBound {
  constructor(
    public zoom: number,
    public side?: { type: LeftOrRight | TopOrBottom; value: number },
  ) {}
}

export class HorizontalCameraBound {
  constructor(
    public left: number,
    public right: number,
    public side?: { type: TopOrBottom; value: number },
  ) {}
}

export class VerticalCameraBound {
  constructor(
    public top: number,
    public bottom: number,
    public side?: { type: LeftOrRight; value: number },
  ) {}
}

export class CameraData {
  scene: Scene;

  tlCorner: [number, number];
  // width and height in percent
  width: number;
  height: number;
  worldIndex: number;

  bounds: ZoomCameraBound | HorizontalCameraBound | VerticalCameraBound;
  zNear = 0.1;
  zFar = 100.0;

  rotpos: RotPos = new RotPos([0.0, 0.0, 0.0], undefined, [1.0, 1.0, 1.0]);

  onMouseDown: (e: MouseEvent) => void = () => {};
  onMouseMove: (e: MouseEvent) => void = () => {};
  onMouseUp: (e: MouseEvent) => void = () => {};
  onWheel: (e: WheelEvent) => void = () => {};

  cursor: string = 'default';

  constructor({
    scene,
    tlCorner = [0, 0],
    width = 1,
    height = 1,
    bounds = new ZoomCameraBound(1),
    worldIndex = 0,
  }: {
    scene: Scene;
    tlCorner?: [number, number];
    width?: number;
    height?: number;
    bounds?: ZoomCameraBound | HorizontalCameraBound | VerticalCameraBound;
    worldIndex?: number;
  }) {
    this.scene = scene;
    this.scene.AddCameraTree(this);
    this.tlCorner = tlCorner;
    this.width = width;
    this.height = height;
    this.bounds = bounds;
    this.worldIndex = worldIndex;
  }
}

//A viewpoint into the world. Main features is having a shader and a rotpos. Should probably implement this later
export class Camera {
  window: FScreen;
  camera_data: CameraData;

  aspectRatio: number;

  pxWidth!: number;
  pxHeight!: number;

  // I would like the field of view to be directly proportional to the screen size, but can't figure it out right now
  fieldOfView: number = (45 * Math.PI) / 180;

  orthoMatrix: mat4 = mat4.create();
  perspectiveMatrix: mat4 = mat4.create();
  viewMatrix: mat4 = mat4.create();

  constructor(window: FScreen, camera_data: CameraData) {
    //Set window and viewport
    this.window = window;
    this.camera_data = camera_data;

    //Other default camera values
    this.aspectRatio = this.window.canvas.width / this.window.canvas.height;

    this.recalculate_px_dim();

    //Set up projection and view matrix
    this.RecalculateProjMatrix();
    this.UpdatePos();
  }

  recalculate_px_dim() {
    //Pixel values of camera. ?Does floor matter?
    this.pxWidth = Math.floor(this.window.canvas.width * this.camera_data.width);
    this.pxHeight = Math.floor(this.window.canvas.height * this.camera_data.height);
  }

  //(Should get a better name) Calculates projection matrix based on whether the camera is 2D or 3D
  RecalculateProjMatrix() {
    if (this.camera_data.bounds instanceof ZoomCameraBound) {
      mat4.ortho(
        this.orthoMatrix,
        this.pxWidth / this.camera_data.bounds.zoom,
        -this.pxWidth / this.camera_data.bounds.zoom,
        -this.pxHeight / this.camera_data.bounds.zoom,
        this.pxHeight / this.camera_data.bounds.zoom,
        -1.0,
        1.0,
      );
    } else if (this.camera_data.bounds instanceof HorizontalCameraBound) {
      const height_bound = this.pxHeight / (this.pxWidth / this.camera_data.bounds.left);
      const rec = {
        [TopOrBottom.Top]: (top: number) => {
          return [top, -height_bound * 2 + top];
        },
        [TopOrBottom.Bottom]: (bottom: number) => {
          return [height_bound * 2 + bottom, bottom];
        },
      };

      const side = this.camera_data.bounds.side;
      const [top, bottom] =
        side?.type === undefined ? [height_bound, -height_bound] : rec[side?.type](side.value);

      mat4.ortho(
        this.orthoMatrix,
        this.camera_data.bounds.left,
        this.camera_data.bounds.right,
        bottom,
        top,
        -1.0,
        1.0,
      );
    } else {
      const width_bound = this.pxWidth / (this.pxHeight / this.camera_data.bounds.top);
      const rec = {
        [LeftOrRight.Left]: (left: number) => {
          return [left, -width_bound * 2 + left];
        },
        [LeftOrRight.Right]: (right: number) => {
          return [width_bound * 2 + right, right];
        },
      };

      const side = this.camera_data.bounds.side;
      const [left, right] =
        side?.type === undefined ? [width_bound, -width_bound] : rec[side?.type](side.value);

      mat4.ortho(
        this.orthoMatrix,
        left,
        right,
        this.camera_data.bounds.bottom,
        this.camera_data.bounds.top,
        -1.0,
        1.0,
      );
    }

    mat4.perspective(
      this.perspectiveMatrix,
      this.fieldOfView,
      this.aspectRatio,
      this.camera_data.zNear,
      this.camera_data.zFar,
    );
  }

  //Change view matrix when camera moves
  UpdatePos() {
    mat4.fromRotationTranslation(
      this.viewMatrix,
      this.camera_data.rotpos.rotation,
      this.camera_data.rotpos.position,
    );
    this.SetUniform('uViewMatrix', this.viewMatrix);
  }

  CursorToWorldPosition(cursor_pos: [number, number]) {
    const ndc_x =
      ((cursor_pos[0] - this.camera_data.tlCorner[0] * this.window.canvas.width) / this.pxWidth) *
        2 -
      1;
    const ndc_y =
      -(
        (cursor_pos[1] - this.camera_data.tlCorner[1] * this.window.canvas.height) /
        this.pxHeight
      ) *
        2 +
      1;

    const get_mod = () => {
      if (this.camera_data.bounds instanceof ZoomCameraBound) {
        return [
          (ndc_x * this.pxWidth) / this.camera_data.bounds.zoom,
          (ndc_y * this.pxHeight) / this.camera_data.bounds.zoom,
        ];
      } else if (this.camera_data.bounds instanceof HorizontalCameraBound) {
        const orig = this.pxHeight / (this.pxWidth / this.camera_data.bounds.left);
        let next = ndc_y * orig;
        if (this.camera_data.bounds.side?.type === TopOrBottom.Top) {
          next = next - orig + this.camera_data.bounds.side.value;
        } else if (this.camera_data.bounds.side?.type === TopOrBottom.Bottom) {
          next = next + orig - this.camera_data.bounds.side.value;
        }

        return [ndc_x * this.camera_data.bounds.left, next];
      } else {
        const orig = this.pxWidth / (this.pxHeight / this.camera_data.bounds.top);
        let next = ndc_x * orig;
        if (this.camera_data.bounds.side?.type === LeftOrRight.Left) {
          next = next - orig + this.camera_data.bounds.side.value;
        } else if (this.camera_data.bounds.side?.type === LeftOrRight.Right) {
          next = next + orig - this.camera_data.bounds.side.value;
        }
        return [next, ndc_y * this.camera_data.bounds.top];
      }
    };

    const [_x, _y] = get_mod();

    const world_x = _x + this.camera_data.rotpos.position[0];
    const world_y = _y - this.camera_data.rotpos.position[1];

    return new Point2D(world_x, world_y);
  }

  SetUniform(uniform: string, property: Iterable<GLfloat>) {
    //Should have a list of shaders this camera uses, and run through those.
    this.window.shaders.forEach((shader) => {
      if (shader.programInfo.uniformLocations[uniform] && shader.shaderProgram) {
        this.window.gl.useProgram(shader.shaderProgram);

        if (Array.from(property).length == 2) {
          this.window.gl.uniform2fv(shader.programInfo.uniformLocations[uniform], property);
        } else {
          this.window.gl.uniformMatrix4fv(
            shader.programInfo.uniformLocations[uniform],
            false,
            property,
          );
        }
      }
    });
  }

  //Sets camera viewport in opengl - Important for cameras that change the amount of screen space they take up
  SetViewport() {
    this.window.gl.viewport(
      this.window.canvas.width * this.camera_data.tlCorner[0],
      this.window.canvas.height * this.camera_data.tlCorner[1],
      this.pxWidth,
      this.pxHeight,
    );
  }

  Draw() {
    this.RecalculateProjMatrix();
    this.SetUniform('u_resolution', [this.pxWidth, this.pxHeight]);
    this.SetUniform('uOrthoMatrix', this.orthoMatrix);
    const inverse = mat4.create();
    mat4.invert(inverse, this.orthoMatrix);
    this.SetUniform('uOrthoMatrix_inverse', inverse);
    this.SetUniform('uPerspectiveMatrix', this.perspectiveMatrix);
    this.UpdatePos();
    this.SetViewport();

    this.window.shaders.forEach((shader) => {
      shader.DrawScene(this.camera_data.worldIndex);
    });
  }
}
