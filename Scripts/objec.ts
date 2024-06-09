import { mat4, quat, vec2, vec3 } from 'gl-matrix';
// import { PhysicsObjec, PhysicsScene } from "./physics.js";
import { Shader } from './shader.js';
import { FScreen } from './screen.js';
import { ModelData } from './loading.js';

//Stores data about an unloaded, uninstantiated object that is generic. I.e what shaders does this object work with?
export class Model {
  //Should store the information that is generic to all objects of a certain type (i.e attribute information, texture) so we don't need to re-load them
  modelData: ModelData;
  //List of all objects referenced by model
  objects: Objec[] = [];

  vao: WebGLVertexArrayObject;
  buffers: Record<string, WebGLBuffer> = {};
  shader: Shader;

  textureId: number | undefined;

  constructor(modelData: ModelData, shader: Shader, vao: WebGLVertexArrayObject) {
    this.modelData = modelData;
    this.textureId = undefined;
    this.shader = shader;
    this.vao = vao;
  }

  //Don't know if this is a good function to keep, but good for debug purposes
  // ModifyAttribute(attrib, updatedAttrib) {
  //   this.modelData["ARRAY_BUFFER"][attrib][0] = updatedAttrib;
  //   this.shader.gl.bindBuffer(this.shader.gl.ARRAY_BUFFER, this.buffers[attrib]);
  //   this.shader.gl.bufferData(this.shader.gl.ARRAY_BUFFER, new Float32Array(updatedAttrib), this.shader.gl.STATIC_DRAW);
  // }
}

//Instance of object
export class Objec {
  rotpos: RotPos | RotPos2D;
  texId?: number;
  hidden = false;
  worldIndex = 0;
  tags = new Set<string>();
  matrix = mat4.create();
  callbackFn = (_screen: FScreen, _object: Objec) => {};

  constructor(rotpos: RotPos | RotPos2D, worldIndex: number = 0, texId?: number) {
    this.rotpos = rotpos;
    this.worldIndex = worldIndex;
    this.texId = texId;
  }

  AddTags(tags: string[]): void {
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
        [this.rotpos.position[0], this.rotpos.position[1], 0],
        [this.rotpos.scale[0], this.rotpos.scale[1], 1],
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
    //TODO: Release hooks like resizing/ physics calculations here
  }
}

//A position and rotation that is used for every physical thing in a scene
export class RotPos {
  position: vec3;
  rotation: quat;
  scale: vec3;

  //Constructor passing in position and rotation
  constructor(position: vec3, rotation?: quat, scale?: vec3) {
    this.position = position ?? vec3.create();
    this.rotation = rotation ?? quat.create();
    this.scale = scale ?? vec3.fromValues(1, 1, 1);
  }

  get forward() {
    let vec = [0, 0, 0];
    vec[0] = 2 * (this.rotation[0] * this.rotation[2] + this.rotation[3] * this.rotation[1]);
    vec[1] = 2 * (this.rotation[1] * this.rotation[0] - this.rotation[3] * this.rotation[0]);
    vec[2] = 1 - 2 * (this.rotation[0] * this.rotation[0] + this.rotation[1] * this.rotation[1]);
    return vec;
  }

  get up() {
    let vec = [0, 0, 0];
    vec[0] = 2 * (this.rotation[0] * this.rotation[1] - this.rotation[3] * this.rotation[2]);
    vec[1] = 1 - 2 * (this.rotation[0] * this.rotation[0] + this.rotation[2] * this.rotation[2]);
    vec[2] = 2 * (this.rotation[1] * this.rotation[2] + this.rotation[3] * this.rotation[0]);
    return vec;
  }

  get right() {
    let vec = [0, 0, 0];
    vec[0] = 1 - 2 * (this.rotation[1] * this.rotation[1] + this.rotation[2] * this.rotation[2]);
    vec[1] = 2 * (this.rotation[0] * this.rotation[1] + this.rotation[3] * this.rotation[2]);
    vec[2] = 2 * (this.rotation[0] * this.rotation[2] - this.rotation[3] * this.rotation[1]);
    return vec;
  }
}

//A position and rotation that is used for 2D objects. The hope is to make some generic functionality between rotpos and rotpos2D
export class RotPos2D {
  position: vec2;
  rotation: quat;
  scale: vec2;

  //Constructor passing in position and rotation
  constructor(position: vec2, rotation?: number, scale?: vec2) {
    this.position = position ?? vec2.create();

    this.rotation = quat.create();
    if (rotation != undefined) {
      quat.setAxisAngle(this.rotation, [0.0, 0.0, 1.0], rotation);
    }
    this.scale = scale ?? vec2.fromValues(1, 1);
  }
}
