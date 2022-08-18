import {Queue} from "./queue.js";

//What is placed on the page.
export class Window {
  //Constructor requires an identifier for a canvas
  //TIDYING STATUS: GREEN
  constructor(canvasID) {
    this.canvas = document.getElementById(canvasID);
    this.gl = this.canvas.getContext("webgl2");

    //Ensure webgl is properly set up
    if (!this.gl) {
      alert("Unable to initialize WebGL. Your browser or machine may not support it.");
      return;
    }

    this.shaders = []; //Not entirely set on how I want the window to be constructed, or the relationships between shaders, windows, the canvas and cameras, yet
  }

  //Not entirely set on the structure here, maybe think about it later
  AddShader(vsSource, fsSource) {
    let shader = new Shader(this.gl);
    shader.CompileProgram(vsSource, fsSource);
    this.shaders.push(shader);
  }
}

//A viewpoint into the world. Main features is having a shader and a rotpos. Should probably implement this later
class Camera {

}

export class Shader {
  //Should start bringing private variables into these classes

  //Constructor requires webgl context
  //TIDYING STATUS: GREEN
  constructor(gl) {
    this.gl = gl;
    this.objects = [];
    this.rotpos = new RotPos(); //This shouldn't exist for a shader, but I have no other of storing camera position right now
    this.queue = new Queue();
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
    const vertexShader = this.CreateShader(this.gl.VERTEX_SHADER, vertexSource);
    const fragmentShader = this.CreateShader(this.gl.FRAGMENT_SHADER, fragmentSource);

    //Attaches shaders, links the program
    const shaderProgram = this.gl.createProgram();
    this.gl.attachShader(shaderProgram, vertexShader);
    this.gl.attachShader(shaderProgram, fragmentShader);
    this.gl.linkProgram(shaderProgram);

    //Ensures OpenGL has loaded correctly
    if (!this.gl.getProgramParameter(shaderProgram, this.gl.LINK_STATUS)) {
      alert('Unable to initialize the shader program: ' + this.gl.getProgramInfoLog(shaderProgram));
      return null;
    }

    //Set up program info object      --- MAYBE PUT THIS INTO ITS OWN FUNCTION
    this.programInfo = {
      program: shaderProgram,
      attribLocations: {},
      uniformLocations: {},
    };

    //Fills program info object with attribute and uniform locations
    const attribCount = this.gl.getProgramParameter(shaderProgram, this.gl.ACTIVE_ATTRIBUTES);
    const uniformCount = this.gl.getProgramParameter(shaderProgram, this.gl.ACTIVE_UNIFORMS);

    //Fill attribute locations in programInfo so we can send data to them later
    for (var i = 0; i < attribCount; i++) {
      const attribInfo = this.gl.getActiveAttrib(shaderProgram, i);
      this.programInfo.attribLocations[attribInfo.name] = this.gl.getAttribLocation(shaderProgram, attribInfo.name);
    }

    //Fill uniform locations in programInfo so we can send data to them later
    for (var i = 0; i < uniformCount; i++) {
      const uniformInfo = this.gl.getActiveUniform(shaderProgram, i);
      this.programInfo.uniformLocations[uniformInfo.name] = this.gl.getUniformLocation(shaderProgram, uniformInfo.name);
    }

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

  //Adds an Objec to the queue to process and connect the object to the shader
  AddObject(obj) {
    this.queue.enqueue(obj);
  }

  //Brings an object from data into opengl
  //TIDYING STATUS: ORANGE
  CreateObject(obj) { // _obj should be of type Objec

    //I should set the buffers of object to be the size of all the buffers that need keeping track of, but i can't be bothered. push works fine for now

    //The vertex array object is what can basically keep track of all our buffers and object data. Really handy
    obj.vao = this.gl.createVertexArray();
    this.gl.bindVertexArray(obj.vao);

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

    let keys = Object.keys(obj.objectData["ARRAY_BUFFER"]);

    for (let i = 0; i < keys.length; i++) {
      let buffer = obj.objectData["ARRAY_BUFFER"][keys[i]];
      obj.buffers.push(this.InitBuffer(this.gl.ARRAY_BUFFER, new Float32Array(buffer[0])));
      this.SetVertexAttribArray(this.programInfo.attribLocations[keys[i]], buffer[1], this.gl.FLOAT, false, buffer[2], buffer[3]);
    }

    if (obj.objectData["ELEMENT_ARRAY_BUFFER"] != undefined) {
      this.InitBuffer(this.gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(obj.objectData["ELEMENT_ARRAY_BUFFER"][0]));
    }

    if (obj.objectData["TEXTURE"] != undefined) {
      obj.texture = this.CreateTexture(obj.objectData["TEXTURE"]);
    }

    this.objects.push(obj);
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
  CreateTexture(tex) {
    //Creates texture and binds it to WebGL
    let texture = this.gl.createTexture();
    this.gl.activeTexture(this.gl.TEXTURE0 + this.objects.length); //I should have some way of storing which textures are currently occupied. However for now it's not that big of an issue
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

  //Needs a better name. A lot of this can be tidied up by moving it to the camera class
  AdditionalSetup() {
    //Various miscellaneous options
    this.gl.clearColor(0.0, 0.0, 0.0, 1.0); //Clear to black, fully opaque
    this.gl.clearDepth(1.0); //Clear everything
    this.gl.enable(this.gl.DEPTH_TEST); //Enable depth testing
    this.gl.depthFunc(this.gl.LEQUAL); //Near things obscure far things
    this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height); //This needs to be repeated on canvas size change

    const fieldOfView = 45 * Math.PI / 180;
    const aspectRatio = this.gl.canvas.clientWidth / this.gl.canvas.clientHeight;
    const zNear = 0.1;
    const zFar = 100.0;

    const projectionMatrix = mat4.create(); //This is just camera settings
    mat4.perspective(projectionMatrix, fieldOfView, aspectRatio, zNear, zFar);

    this.viewMatrix = mat4.create(); //And this is just determined from the rotpos from the camera
    mat4.translate(this.viewMatrix, this.viewMatrix, this.rotpos.position);

    this.gl.useProgram(this.programInfo.program);

    this.gl.uniformMatrix4fv(
      this.programInfo.uniformLocations.uProjectionMatrix,
      false,
      projectionMatrix);

    this.gl.uniformMatrix4fv(
      this.programInfo.uniformLocations.uViewMatrix,
      false,
      this.viewMatrix);
  }

DrawScene() {
    while (this.queue.length != 0) {
      const obj = this.queue.dequeue();
      this.CreateObject(obj);
    }

    const offset = 0;
    //const vertexCount = 36; //Should be done automatically for each object

    for (let objectNum = 0; objectNum < this.objects.length; objectNum++) {
      //const offset = this.objects[objectNum].objectData["ARRAY_BUFFER"]["aVertexPosition"][3]; //ew ew ew ew ew
      const vertexCount = this.objects[objectNum].objectData["ARRAY_BUFFER"]["aVertexPosition"][1] * this.objects[objectNum].objectData["ARRAY_BUFFER"]["aVertexPosition"][2];

      this.gl.bindVertexArray(this.objects[objectNum].vao);

      //Tell opengl which texture we're currently using, then tell our shader which texture we're using
      if (this.objects[objectNum].objectData["TEXTURE"] != undefined) {
        this.gl.activeTexture(this.gl.TEXTURE0 + objectNum);
        this.gl.uniform1i(this.programInfo.uniformLocations.uSampler, objectNum);
    }

      //Sets position of object (Not orientation and scale yet, sadly)
    this.gl.uniformMatrix4fv(
        this.programInfo.uniformLocations.uModelMatrix,
        false,
        this.objects[objectNum].translationMatrix);

        if (this.objects[objectNum].objectData["ELEMENT_ARRAY_BUFFER"] != undefined) {
        this.gl.drawElements(this.gl.TRIANGLES, vertexCount, this.gl.UNSIGNED_SHORT, offset);
        } else {
        this.gl.drawArrays(this.gl.LINES, offset, vertexCount);
        }
    }
}
}

//Instance of object
export class Objec {
    constructor(objectData, rotpos) {
        this.objectData = objectData;
        this.rotpos = rotpos;

        this.buffers = [];
        this.texture = null;
        this.vao = null;

        this.translationMatrix = mat4.create();
        mat4.fromTranslation(this.translationMatrix, this.rotpos.position);
    }

    OutputData() {
      let keys = Object.keys(obj.objectData);
      for (let i = 0; i < keys.length; i++) {
        const key = obj.objectData[keys[i]];
        for (let j = 0; j < key.length; j++) {
          const element = array[j];
          
        }
      }

    }
}

  //A position and rotation that is used for every physical thing in a scene
  //TIDYING STATUS: GREEN
export class RotPos {
    //Constructor passing in position and rotation
    constructor(position, rotation) {
        this.position = (position === undefined) ? vec3.create() : position;
        this.rotation = (rotation === undefined) ? quat.create() : rotation;
    }
}