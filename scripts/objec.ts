import { mat4, quat, vec2, vec3 } from 'gl-matrix';
// import { PhysicsObjec, PhysicsScene } from "./physics.js";
import { FScreen } from './screen';
import { Camera } from './camera';

export interface ModelData {
  ARRAY_BUFFER: Record<string, [number[], number, number, number]>;
  ELEMENT_ARRAY_BUFFER?: number[];
  TEXTURE?: string;
}

// Stores data about an unloaded, uninstantiated object that is generic. I.e what shaders does this object work with?
export class Model {
  name: string;
  modelData: ModelData;

  // List of all objects referenced by model
  objects: Objec[] = [];

  vao?: WebGLVertexArrayObject;
  buffers: Record<string, WebGLBuffer> = {};

  textureId?: number;

  constructor(name: string, modelData: ModelData, vao?: WebGLVertexArrayObject) {
    this.name = name;
    this.modelData = modelData;
    this.vao = vao;
  }

  create_objec(objec: Objec) {
    this.objects.push(objec);
  }
}

//Instance of object
export class Objec {
  model: Model;
  rotpos: RotPos | RotPos2D;

  texId?: number;
  overridden_attribs: Record<string, AllowSharedBufferSource> = {};

  hidden = false;
  worldIndex = 0;

  tags = new Set<string>();
  matrix = mat4.create();

  callbackFn: (_screen: FScreen, _object: Objec) => void = () => {};

  constructor({
    model,
    rotpos,
    texId,
    overridden_attribs = {},
    worldIndex = 0,
    tags = [],
  }: {
    model: Model;
    rotpos: RotPos | RotPos2D;
    texId?: number;
    overridden_attribs?: Record<string, AllowSharedBufferSource>;
    worldIndex?: number;
    tags?: string[];
  }) {
    this.model = model;
    this.rotpos = rotpos;
    this.texId = texId;
    this.overridden_attribs = overridden_attribs;
    this.worldIndex = worldIndex;
    tags.forEach((tag) => this.tags.add(tag));
  }

  // TiePhysicsObjec(physicsScene: PhysicsScene): void {
  //   this.physics = new PhysicsObjec(this, physicsScene); //For this, i have to include physics.js. Would prefer not to do this, might try and seperate it better later
  // }

  GetMatrix() {
    if (this.rotpos instanceof RotPos2D) {
      mat4.fromRotationTranslationScale(
        this.matrix,
        this.rotpos.rotation,
        this.rotpos.position.dim,
        [this.rotpos.scale.dim[0], this.rotpos.scale.dim[1], 1],
      );
    } else {
      mat4.fromRotationTranslationScale(
        this.matrix,
        this.rotpos.rotation,
        this.rotpos.position,
        this.rotpos.scale,
      );
    }
    return this.matrix;
  }

  Destructor() {
    this.model.objects.splice(this.model.objects.indexOf(this), 1);
  }
}

//A position and rotation that is used for every physical thing in a scene
export class RotPos {
  position: vec3;
  rotation: quat;
  scale: vec3;

  //Constructor passing in position and rotation
  constructor({
    position = vec3.create(),
    rotation = quat.fromValues(0, 0, 0, 1),
    scale = vec3.fromValues(1, 1, 1),
  }: {
    position?: vec3;
    rotation?: quat;
    scale?: vec3;
  }) {
    this.position = position;
    this.rotation = rotation;
    this.scale = scale;
  }

  get forward() {
    const vec = [0, 0, 0];
    vec[0] = 2 * (this.rotation[0] * this.rotation[2] + this.rotation[3] * this.rotation[1]);
    vec[1] = 2 * (this.rotation[1] * this.rotation[0] - this.rotation[3] * this.rotation[0]);
    vec[2] = 1 - 2 * (this.rotation[0] * this.rotation[0] + this.rotation[1] * this.rotation[1]);
    return vec;
  }

  get up() {
    const vec = [0, 0, 0];
    vec[0] = 2 * (this.rotation[0] * this.rotation[1] - this.rotation[3] * this.rotation[2]);
    vec[1] = 1 - 2 * (this.rotation[0] * this.rotation[0] + this.rotation[2] * this.rotation[2]);
    vec[2] = 2 * (this.rotation[1] * this.rotation[2] + this.rotation[3] * this.rotation[0]);
    return vec;
  }

  get right() {
    const vec = [0, 0, 0];
    vec[0] = 1 - 2 * (this.rotation[1] * this.rotation[1] + this.rotation[2] * this.rotation[2]);
    vec[1] = 2 * (this.rotation[0] * this.rotation[1] + this.rotation[3] * this.rotation[2]);
    vec[2] = 2 * (this.rotation[0] * this.rotation[2] - this.rotation[3] * this.rotation[1]);
    return vec;
  }
}

//A position and rotation that is used for 2D objects. The hope is to make some generic functionality between rotpos and rotpos2D
export class RotPos2D {
  position: Position2D;
  rotation: quat;
  scale: Scale2D;

  //Constructor passing in position and rotation
  constructor({
    position = new Position2D(
      { type: Position2DType.Px, value: 0 },
      { type: Position2DType.Px, value: 0 },
      0,
    ),
    rotation = Math.PI,
    scale = Scale2D.of_width_percent(1, { type: ScaleType.Percent, value: 1 }),
  }: {
    position?: Position2D;
    rotation?: number;
    scale?: Scale2D;
  }) {
    this.position = position;

    this.rotation = quat.create();
    quat.setAxisAngle(this.rotation, [0.0, 1.0, 0.0], rotation);

    this.scale = scale;
  }

  calculate_dim(camera: Camera) {
    this.position.calculate_dim(camera);
    this.scale.calculate_dim(camera);
  }
}

export enum Position2DType {
  Px, // Misnomer?
  Percent,
}

type Position2DValue =
  | { type: Position2DType.Px; value: number }
  | { type: Position2DType.Percent; value: number };

export class Position2D {
  dim: vec3 = [0, 0, 0];

  constructor(
    public x: Position2DValue,
    public y: Position2DValue,
    z: number,
  ) {
    this.dim[2] = z;
  }

  calculate_dim(camera: Camera) {
    switch (this.x.type) {
      case Position2DType.Px:
        this.dim[0] = this.x.value / camera.pxWidth;
        break;
      case Position2DType.Percent:
        this.dim[0] = this.x.value;
        break;
    }

    switch (this.y.type) {
      case Position2DType.Px:
        this.dim[1] = this.y.value / camera.pxHeight;
        break;
      case Position2DType.Percent:
        this.dim[1] = this.y.value;
        break;
    }
  }
}

export enum ScaleType {
  Px, // Misnomer?
  Percent,
  Ratio,
}

type Scale =
  | { type: ScaleType.Px; value: number }
  | { type: ScaleType.Percent; value: number }
  | { type: ScaleType.Ratio; value: number };

export class Scale2D {
  dim: vec2 = [1, 1];

  private constructor(
    public width: Scale,
    public height: Scale,
  ) {}

  static of_px(width: number, height: number) {
    const result = new Scale2D(
      { type: ScaleType.Px, value: width },
      { type: ScaleType.Px, value: height },
    );
    result.dim = [width, height];
    return result;
  }

  static of_width_percent(width_percent: number, height?: Scale) {
    return new Scale2D(
      { type: ScaleType.Percent, value: width_percent },
      height ?? { type: ScaleType.Ratio, value: 1 },
    );
  }

  static of_height_percent(height_percent: number, width?: Scale) {
    return new Scale2D(width ?? { type: ScaleType.Ratio, value: 1 }, {
      type: ScaleType.Percent,
      value: height_percent,
    });
  }

  calculate_dim(camera: Camera) {
    switch (this.width.type) {
      case ScaleType.Px:
        this.dim[0] = this.width.value / camera.pxWidth;
        break;
      case ScaleType.Percent:
        this.dim[0] = this.width.value;
        break;
    }

    switch (this.height.type) {
      case ScaleType.Px:
        this.dim[1] = this.height.value / camera.pxWidth;
        break;
      case ScaleType.Percent:
        this.dim[1] = this.height.value;
        break;
      case ScaleType.Ratio:
        this.dim[1] = this.height.value * this.dim[0];
        break;
    }

    if (this.width.type === ScaleType.Ratio) this.dim[0] = this.width.value * this.dim[1];
  }
}
