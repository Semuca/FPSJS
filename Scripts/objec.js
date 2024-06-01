"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RotPos = exports.Objec = exports.Model = void 0;
const gl_matrix_1 = require("gl-matrix");
const physics_js_1 = require("./physics.js");
//Stores data about an unloaded, uninstantiated object that is generic. I.e what shaders does this object work with?
class Model {
    modelData;
    //List of all objects referenced by model
    objects = [];
    vao;
    buffers = {};
    shader;
    textureId;
    constructor(modelData) {
        this.modelData = modelData;
        this.textureId = undefined;
    }
    //Don't know if this is a good function to keep, but good for debug purposes
    ModifyAttribute(attrib, updatedAttrib) {
        this.modelData["ARRAY_BUFFER"][attrib][0] = updatedAttrib;
        this.shader.gl.bindBuffer(this.shader.gl.ARRAY_BUFFER, this.buffers[attrib]);
        this.shader.gl.bufferData(this.shader.gl.ARRAY_BUFFER, new Float32Array(updatedAttrib), this.shader.gl.STATIC_DRAW);
    }
}
exports.Model = Model;
//Instance of object
class Objec {
    rotpos;
    physics;
    texId;
    hidden = false;
    worldIndex = 0;
    tags = new Set();
    matrix = gl_matrix_1.mat4.create();
    callbackFn = (screen, object) => { };
    constructor(rotpos, worldIndex) {
        this.rotpos = rotpos;
        this.worldIndex = worldIndex;
    }
    AddTags(tags) {
        tags.forEach(tag => this.tags.add(tag));
    }
    TiePhysicsObjec(physicsScene) {
        this.physics = new physics_js_1.PhysicsObjec(this, physicsScene); //For this, i have to include physics.js. Would prefer not to do this, might try and seperate it better later
    }
    GetMatrix() {
        if (this.rotpos.position.length != 3 || this.rotpos.scale.length != 3)
            return;
        gl_matrix_1.mat4.fromRotationTranslationScale(this.matrix, this.rotpos.rotation, this.rotpos.position, this.rotpos.scale);
        return this.matrix;
    }
    Destructor() {
        //TODO: Release hooks like resizing/ physics calculations here
    }
}
exports.Objec = Objec;
//A position and rotation that is used for every physical thing in a scene
//TIDYING STATUS: GREEN
class RotPos {
    position;
    rotation;
    scale;
    //Constructor passing in position and rotation
    constructor(position, rotation, scale) {
        //If position is undefined, default set to 3 dimensional
        this.position = position ?? gl_matrix_1.vec3.create();
        //Gotta think about passing 2d scales and rotations, but for now this should do
        if (scale && scale.length == 2) {
            this.rotation = gl_matrix_1.quat.create();
            if (rotation != undefined) {
                gl_matrix_1.quat.setAxisAngle(this.rotation, [0.0, 0.0, 1.0], rotation);
            }
            this.scale = scale ?? gl_matrix_1.vec2.fromValues(1, 1);
        }
        else {
            this.rotation = rotation ?? gl_matrix_1.quat.create();
            this.scale = scale ?? gl_matrix_1.vec3.fromValues(1, 1, 1);
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
exports.RotPos = RotPos;
