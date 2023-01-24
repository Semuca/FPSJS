import {PhysicsObjec} from "./physics.js";

//Stores data about an unloaded, uninstantiated object that is generic. I.e what shaders does this object work with?
export class Model { //Should store the information that is generic to all objects of a certain type (i.e attribute information, texture) so we don't need to re-load them
    constructor(modelData) {
        this.modelData = modelData;
        this.textureId = undefined;
        this.objects = [];

        this.buffers = [];
        this.vao = null; //Need to find difference between null and undefined
        this.shader = null;
    }
}

//Instance of object
export class Objec {
    constructor(model, rotpos) {
      this.objectData = model.modelData; //Is this necessary?
      this.rotpos = rotpos;
      //if (this.objectData["ARRAY_BUFFER"]["aVertexPosition"][1] == 2) {
      //} else {
      //}
  
      this.matrix = mat4.create();
    }

    TiePhysicsObjec(physicsScene) {
      this.physics = new PhysicsObjec(this, physicsScene); //For this, i have to include physics.js. Would prefer not to do this, might try and seperate it better later
    }
  
    GetMatrix() {
      if (this.rotpos.position.length == 2) {
        mat4.fromRotationTranslationScale(this.matrix, this.rotpos.rotation, [this.rotpos.position[0], this.rotpos.position[1], 0.0], [this.rotpos.scale[0], this.rotpos.scale[1], 0.0]);
      } else {
        mat4.fromRotationTranslationScale(this.matrix, this.rotpos.rotation, this.rotpos.position, this.rotpos.scale);
      }
      return this.matrix;
    }
  
    //No longer should be kept in objec, should be kept in model
    //Don't know if this is a good function to keep, but for debug purposes I need it           Also I know I shouldn't have bufferVal, but it's a debug parameter
    ModifyAttribute(attrib, bufferVal, updatedAttrib) {
      this.objectData["ARRAY_BUFFER"][attrib][0] = updatedAttrib;
      this.shader.gl.bindBuffer(this.shader.gl.ARRAY_BUFFER, this.buffers[bufferVal]);
      this.shader.gl.bufferData(this.shader.gl.ARRAY_BUFFER, new Float32Array(updatedAttrib), this.shader.gl.STATIC_DRAW);
  
      //this.gl.bindBuffer(bufferType, buffer);
      //this.gl.bufferData(bufferType, data, this.gl.STATIC_DRAW); //Static_draw is hardcoded?
    }
  }
  
//A position and rotation that is used for every physical thing in a scene
//TIDYING STATUS: GREEN
export class RotPos {
    //Constructor passing in position and rotation
    constructor(position, rotation, scale) {

      //If position is undefined, default set to 3 dimensional
      this.position = (position === undefined) ? vec3.create() : position;

      //Gotta think about passing 2d scales and rotations, but for now this should do
      if (this.position.length == 2) {
        this.rotation = quat.create();
        if (rotation != undefined) {
          quat.setAxisAngle(this.rotation, [0.0, 0.0, 1.0], rotation);
        }
        this.scale = (scale === undefined) ? vec2.fromValues(1, 1) : scale;
      } else {
        this.rotation = (rotation === undefined) ? quat.create() : rotation;
        this.scale = (scale === undefined) ? vec3.fromValues(1, 1, 1) : scale;
      }
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