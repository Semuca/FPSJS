//import {PhysicsScene, PhysicsObjec} from "./physics.js";
import {Model, Objec, RotPos} from "./objec.js";

//What is placed on the page.
export class Window {
  //Constructor requires an identifier for a canvas
  //TIDYING STATUS: GREEN
  constructor(canvasID) {
    this.canvas = document.getElementById(canvasID);
    this.gl = this.canvas.getContext("webgl2");
    this.camera = new Camera();

    //Ensure webgl is properly set up
    if (!this.gl) {
      alert("Unable to initialize WebGL. Your browser or machine may not support it.");
      return;
    }

    this.shaders = []; //Not entirely set on how I want the window to be constructed, or the relationships between shaders, windows, the canvas and cameras, yet
    this.textures = []; //For the context of webgl, we need to track what objects use what texture
  }

  //Not entirely set on the structure here, maybe think about it later
  AddShader(vsSource, fsSource, type) {
    let shader = new Shader(this, this.gl, this.camera, type);
    shader.CompileProgram(vsSource, fsSource);
    this.shaders.push(shader);
  }

  //Gets new texture ID
  GetNewTextureId() {
    for (let i = 0; i < this.textures.length; i++) { //O(n) time. I think this theoretically could be O(logN), but i don't think it's that important
      if (this.textures[i] != i) {
        this.textures.splice(i, 0, i);
        return i;
      }
    }
    this.textures.push(this.textures.length);
    return this.textures.length - 1;
  }
}

//A viewpoint into the world. Main features is having a shader and a rotpos. Should probably implement this later
export class Camera {
  constructor() {
    this.rotpos = new RotPos([0.0, 0.0, 0.0]);
  }
}

export class Shader {
  //Should start bringing private variables into these classes

  //Constructor requires webgl context
  //TIDYING STATUS: GREEN
  constructor(window, gl, camera, type) {
    this.window = window;
    this.gl = gl;
    this.objects = [];
    this.models = {};

    this.camera = camera;
    this.type = type;
    //Temporary
    //this.rotpos.position = vec3.fromValues(0.0, -2.0, -14.0);
    //quat.fromEuler(this.rotpos.rotation, -25.0, 180.0, 0.0);
  }

  //Compiles a shader program from source code
  //TIDYING STATUS: GREEN
  CompileProgram(vertexSource, fragmentSource) {
    //Automatically cull backfaces for now, change later if needed
    this.gl.enable(this.gl.CULL_FACE);

    //If there's already a shader program in here, deallocate the memory
    if (this.programInfo === null) {
      console.log("painis"); //Really?
    }

    //Loads shaders from source urls
    this.vertexShader = this.CreateShader(this.gl.VERTEX_SHADER, vertexSource);
    this.fragmentShader = this.CreateShader(this.gl.FRAGMENT_SHADER, fragmentSource);

    //Attaches shaders, links the program
    this.shaderProgram = this.gl.createProgram();
    this.gl.attachShader(this.shaderProgram, this.vertexShader);
    this.gl.attachShader(this.shaderProgram, this.fragmentShader);
    this.gl.linkProgram(this.shaderProgram);

    //Ensures OpenGL has loaded correctly
    if (!this.gl.getProgramParameter(this.shaderProgram, this.gl.LINK_STATUS)) {
      alert('Unable to initialize the shader program: ' + this.gl.getProgramInfoLog(this.shaderProgram));
      return null;
    }

    this.AssembleProgramInfo();
    this.AdditionalSetup();
  }

  ReplaceVertexShader(source) {
    this.gl.shaderSource(this.vertexShader, source);
    this.gl.compileShader(this.vertexShader);
    this.gl.linkProgram(this.shaderProgram);
    this.AssembleProgramInfo();

    this.AdditionalSetup();
  }

  //Loads a vertex/fragment shader from source code and return it's id
  //TIDYING STATUS: GREEN
  CreateShader(type, source) {
    //Create shader
    const shader = this.gl.createShader(type); //Maybe should rename these variables. They aren't 'shaders', they're ids to shaders

    //Pass in source code and compile
    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);

    //Handle errors
    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      alert("An error occured compiling the shaders: " + this.gl.getShaderInfoLog(shader));
      this.gl.deleteShader(shader);
      return null;
    }

    return shader;
  }

  AssembleProgramInfo() {
    //Set up program info object
    this.programInfo = {
      attribLocations: {},
      uniformLocations: {},
    };

    //Fills program info object with attribute and uniform locations
    const attribCount = this.gl.getProgramParameter(this.shaderProgram, this.gl.ACTIVE_ATTRIBUTES);
    const uniformCount = this.gl.getProgramParameter(this.shaderProgram, this.gl.ACTIVE_UNIFORMS);

    //Fill attribute locations in programInfo so we can send data to them later
    for (var i = 0; i < attribCount; i++) {
      const attribInfo = this.gl.getActiveAttrib(this.shaderProgram, i);
      this.programInfo.attribLocations[attribInfo.name] = this.gl.getAttribLocation(this.shaderProgram, attribInfo.name);
    }

    //Fill uniform locations in programInfo so we can send data to them later
    for (var i = 0; i < uniformCount; i++) {
      const uniformInfo = this.gl.getActiveUniform(this.shaderProgram, i);
      this.programInfo.uniformLocations[uniformInfo.name] = this.gl.getUniformLocation(this.shaderProgram, uniformInfo.name);
    }

  }

  //Brings a model from data into opengl. This model can then be instantiated
  //TIDYING STATUS: ORANGE
  CreateModel(name, modelData) {
    //console.log(modelData);
    this.models[name] = new Model(modelData);
    //I should set the buffers of object to be the size of all the buffers that need keeping track of, but i can't be bothered. push works fine for now

    //The vertex array object is what can basically keep track of all our buffers and object data. Really handy
    this.models[name].vao = this.gl.createVertexArray();
    this.gl.bindVertexArray(this.models[name].vao);
    this.models[name].shader = this;

    
    //Input: _obj should have javascript object, where labels that exactly match the attribInfo labels link to data that allows the gl context to assign a buffer
    /*

    E.g. for object.txt, _obj =

    {
      "ARRAY_BUFFER" : {
        "aVertexPosition" : {data, numComponents (in a unit), stride, offset},
        "aTexturePosition" :      "             "               "               "
      },
      "ELEMENT_ARRAY_BUFFER" : {data},
      "TEXTURE" : {img}
    }
    
    I have no idea if this will turn out to be the most efficient system, but I'm doing it for now
    */

    let keys = Object.keys(this.models[name].modelData["ARRAY_BUFFER"]);

    for (let i = 0; i < keys.length; i++) {
      let buffer = this.models[name].modelData["ARRAY_BUFFER"][keys[i]];
      this.models[name].buffers.push(this.InitBuffer(this.gl.ARRAY_BUFFER, new Float32Array(buffer[0])));
      this.SetVertexAttribArray(this.programInfo.attribLocations[keys[i]], buffer[1], this.gl.FLOAT, false, buffer[2], buffer[3]);
    }

    if (this.models[name].modelData["ELEMENT_ARRAY_BUFFER"] != undefined) {
      this.InitBuffer(this.gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(this.models[name].modelData["ELEMENT_ARRAY_BUFFER"][0]));
    }

    if (this.models[name].modelData["TEXTURE"] != undefined) {
      this.models[name].textureId = this.window.GetNewTextureId();
      this.models[name].texture = this.CreateTexture(this.models[name].modelData["TEXTURE"], this.models[name].textureId);
    }
  }

  //Creates an instance of a model in the world
  InstanceObject(name, rotpos, physicsScene) {
    this.models[name].objects.push(new Objec(this.models[name], rotpos, physicsScene));
  }

  //Inserts data into an attribute. DATA SHOULD BE IN A NEW FLOAT32ARRAY FORM OR Uint16Array OR SOMETHING SIMILAR <- to fix
  //TIDYING STATUS: GREEN
  InitBuffer(bufferType, data) {
    //Create buffer, bind it to a type, fill the target with data
    const buffer = this.gl.createBuffer();
    this.gl.bindBuffer(bufferType, buffer);
    this.gl.bufferData(bufferType, data, this.gl.STATIC_DRAW); //Static_draw is hardcoded?
    return buffer;
  }

  //Set the layout of the buffer (attribute) attached to GL_ARRAY_BUFFER. THIS NEEDS TO BE CLEARED WHEN A NEW SOURCE REPLACES THIS
  //What the hell, this needs a better description. Not even sure if this function is necessary, but keep it for now.
  //TIDYING STATUS: ???
  SetVertexAttribArray(attribLocation, numComponents, type, normalize, stride, offset) {
    this.gl.vertexAttribPointer(attribLocation, numComponents, type, normalize, stride, offset);
    this.gl.enableVertexAttribArray(attribLocation);
  }

  //Loads texture into WebGL
  //TIDYING STATUS: YELLOW
  CreateTexture(tex, texId) {
    //Creates texture and binds it to WebGL
    let texture = this.gl.createTexture();
    this.gl.activeTexture(this.gl.TEXTURE0 + texId);
    this.gl.bindTexture(this.gl.TEXTURE_2D, texture);

    //Puts image into texture
    this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, tex);
    this.gl.generateMipmap(this.gl.TEXTURE_2D); //WebGL 1 can only mipmap even-height and width textures. I know this is webgl2, but should think about compatability

    //Adjusts texture parameters
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
    return texture;
  }

  RecalculateProjMatrix() {
    if (this.type == "2D") {
      mat4.ortho(this.projectionMatrix, 0.0, this.gl.canvas.width, this.gl.canvas.height, 0.0, -1.0, 1.0);
    } else {
      mat4.perspective(this.projectionMatrix, this.fieldOfView, this.aspectRatio, this.zNear, this.zFar);
    }

    this.gl.useProgram(this.shaderProgram);
    this.gl.uniformMatrix4fv(
      this.programInfo.uniformLocations.uProjectionMatrix,
      false,
      this.projectionMatrix);
  }

  //Needs a better name. A lot of this can be tidied up by moving it to the camera class
  AdditionalSetup() {
    //Various miscellaneous options
    this.gl.clearColor(0.0, 0.0, 0.0, 1.0); //Clear to black, fully opaque
    this.gl.clearDepth(1.0); //Clear everything
    this.gl.enable(this.gl.DEPTH_TEST); //Enable depth testing
    this.gl.depthFunc(this.gl.LEQUAL); //Near things obscure far things
    
    this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height); //This needs to be repeated on canvas size change

    this.fieldOfView = 45 * Math.PI / 180; // I would like the field of view to be directly proportional to the screen size, but can't figure it out right now
    this.aspectRatio = this.gl.canvas.width / this.gl.canvas.height;
    this.zNear = 0.1;
    this.zFar = 100.0;

    this.projectionMatrix = mat4.create(); //This is just camera settings

    if (this.type == "3D") {
      this.viewMatrix = mat4.create(); //And this is just determined from the rotpos from the camera
      mat4.fromRotationTranslation(this.viewMatrix, this.camera.rotpos.rotation, this.camera.rotpos.position);

      this.gl.useProgram(this.shaderProgram);

      this.gl.uniformMatrix4fv(
        this.programInfo.uniformLocations.uViewMatrix,
        false,
        this.viewMatrix);
    }

    this.RecalculateProjMatrix();
  }
  
  DrawScene() {
    /*
    const offset = 0;
    //const vertexCount = 36; //Should be done automatically for each object

    for (let objectNum = 0; objectNum < this.objects.length; objectNum++) {
      //const offset = this.objects[objectNum].objectData["ARRAY_BUFFER"]["aVertexPosition"][3]; //ew ew ew ew ew

      this.gl.bindVertexArray(this.objects[objectNum].vao);

      //Sets position of object with orientation
      this.gl.uniformMatrix4fv(
        this.programInfo.uniformLocations.uModelMatrix,
        false,
        this.objects[objectNum].GetMatrix());

      if (this.objects[objectNum].objectData["ELEMENT_ARRAY_BUFFER"] != undefined) {
        const vertexCount = this.objects[objectNum].objectData["ELEMENT_ARRAY_BUFFER"][0].length;

        //Tell opengl which texture we're currently using, then tell our shader which texture we're using
        if (this.objects[objectNum].objectData["TEXTURE"] != undefined) {
          this.gl.activeTexture(this.gl.TEXTURE0 + objectNum);
          this.gl.uniform1i(this.programInfo.uniformLocations.uSampler, objectNum);
          this.gl.drawElements(this.gl.TRIANGLES, vertexCount, this.gl.UNSIGNED_SHORT, offset);
        } else {
          this.gl.drawElements(this.gl.LINES, vertexCount, this.gl.UNSIGNED_SHORT, offset);
        }
      } else {
        if (this.objects[objectNum].objectData["TEXTURE"] != undefined) {
          this.gl.activeTexture(this.gl.TEXTURE0 + objectNum);
          this.gl.uniform1i(this.programInfo.uniformLocations.uSampler, objectNum);
          this.gl.drawArrays(this.gl.TRIANGLES, offset, 2);
        } else {
          this.gl.drawArrays(this.gl.LINES, offset, 2); //bad hardcoding, oh well
        }
      }
    }*/

    const offset = 0;

    const _keys = Object.keys(this.models);

    //For each model...
    for (let modelNum = 0; modelNum < _keys.length; modelNum++) {
      let model = this.models[_keys[modelNum]];

      //Bind their vertex data
      this.gl.bindVertexArray(model.vao);

      //if (this.type == "2D") {
        //console.log(model.vao);
      //}

      //Get the number of points
      let vertexCount = undefined
      if (model.modelData["ELEMENT_ARRAY_BUFFER"] != undefined) { //kinda wasteful
        vertexCount = model.modelData["ELEMENT_ARRAY_BUFFER"][0].length;
      }

      //Set texture and mode
      let mode = this.gl.LINES;
      if (model.modelData["TEXTURE"] != undefined) {
        this.gl.activeTexture(this.gl.TEXTURE0 + model.textureId);
        this.gl.uniform1i(this.programInfo.uniformLocations.uSampler, model.textureId);
        mode = this.gl.TRIANGLES;
      }

      //Draw every object
      for (let objectNum = 0; objectNum < model.objects.length; objectNum++) {

        this.gl.uniformMatrix4fv(
          this.programInfo.uniformLocations.uModelMatrix,
          false,
          model.objects[objectNum].GetMatrix());
  
        if (model.modelData["ELEMENT_ARRAY_BUFFER"] != undefined) {
          //Tell opengl which texture we're currently using, then tell our shader which texture we're using
          this.gl.drawElements(mode, vertexCount, this.gl.UNSIGNED_SHORT, offset);
        } else {
          this.gl.drawArrays(mode, offset, 6); //bad hardcoding, oh well
        }
      }
    }
  }
}