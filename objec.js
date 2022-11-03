import {PhysicsObjec} from "./physics.js";

//Stores data about an unloaded, uninstantiated object that is generic. I.e what shaders does this object work with?
export class Model { //Should store the information that is generic to all objects of a certain type (i.e attribute information, texture) so we don't need to re-load them
    constructor(shaderId, modelData) {
        this.shaderId = shaderId;
        this.modelData = modelData;
    }
}

//Instance of object
export class Objec {
    constructor(objectData, rotpos, physicsScene) {
      this.objectData = objectData;
      this.rotpos = rotpos;
  
      this.buffers = [];
      this.texture = null;
      this.vao = null;
      this.shader = null;
  
      this.physics = new PhysicsObjec(this, physicsScene); //For this, i have to include physics.js. Would prefer not to do this, might try and seperate it better later
  
      this.matrix = mat4.create();
    }
  
    GetMatrix() {
      mat4.fromRotationTranslationScale(this.matrix, this.rotpos.rotation, this.rotpos.position, this.rotpos.scale);
      return this.matrix;
    }
  
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
      this.position = (position === undefined) ? vec3.create() : position;
      this.rotation = (rotation === undefined) ? quat.create() : rotation;
      this.scale = (scale === undefined) ? vec3.fromValues(1, 1, 1) : scale;
    }
  
    /*
    get forward() { //You know, I don't think I like writing with glMatrix library. Maybe make my own?
      const up = this.up;
      /*
      let forward = vec3.create();
  
      if ((up[0] < 0 && up[2] < 0) || (up[0] > 0 && up[2] > 0)) { //For the chunks of 3d space where x and z coordinate space are both positive or both negative:
        forward[1] = Math.cos(Math.asin(Math.abs(up[1]))); //Angle of up vector is theta, then the angle of forward vector is 90 - theta, height is sin(90 - theta) = cos(theta)
        if (up[0] > 0) {
          forward[1] *= -1; //Height is negative
        }
        forward[0] = Math.sqrt((1 - forward[1]) / (Math.pow(up[2] / up[0], 2) + 1));
        forward[2] = Math.sqrt((1 - forward[1]) / (Math.pow(up[0] / up[2], 2) + 1));
      }
    }
  
    get right() {
  
    }
  
    get up() {
      let localForward = vec3.create();
      vec3.getAxisAngle(localForward, this.rotation);
      return localForward;
    }*/
}