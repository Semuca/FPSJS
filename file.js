import "./queue.js";
import { Queue } from "./queue.js"; //why are there two?

//// DEBUG:
//const test = document.getElementById("test");
let time = 0;
let loopStarted = false;
let pointerLockActivation = 0;

let rotX = 0;
let rotY = 0;

const FORWARD = vec3.fromValues(1, 0, 0); // Maybe these are all right? Idk, haven't really checked
const UP = vec3.fromValues(0, 1, 0);
const RIGHT = vec3.fromValues(0, 0, 1);

//What is placed on the page.
class Window {
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

class Shader {
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
  CreateShader(type, source) { //Is this a good name? What's it really 'loading'? Load, in my mind, should be reserved for fetching data
    //Create shader
    const shader = this.gl.createShader(type);

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

    /*
    //Should setting these buffers be done in the object?
    obj.buffers[0] = this.InitBuffer(this.gl.ARRAY_BUFFER, new Float32Array(_obj.str[0]));
    this.SetVertexAttribArray(this.programInfo.attribLocations.aVertexPosition, 3, this.gl.FLOAT, false, 12, 0); //bad magic numbers are bad

    //Loads texture, activates, and binds it. Not sure, think this could be it's own function. Also shouldn't the object load it's texture?
    obj.texture = this.CreateTexture(_obj.tex);

    obj.buffers[2] = this.InitBuffer(this.gl.ARRAY_BUFFER, new Float32Array(_obj.str[2]));
    this.SetVertexAttribArray(this.programInfo.attribLocations.aTexturePosition, 2, this.gl.FLOAT, false, 8, 0); //Feels like this data should be downloaded when an object is loaded
    obj.buffers[1] = this.InitBuffer(this.gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(_obj.str[1]));
    */

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
  CreateTexture(tex) { //Argument needs a better name
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
    this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);

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

    if (loopStarted === false) {
      loopStarted = true;
      requestAnimationFrame(RenderLoop);
    }
  }

  DrawScene() {
    while (this.queue.length != 0) {
      const obj = this.queue.dequeue();
      this.CreateObject(obj);
    }

    //Implement this when I figure out how quaternions work
    /*
    mat4.fromRotationTranslation(this.viewMatrix, this.rotpos.rotation, this.rotpos.position);
    this.gl.uniformMatrix4fv( //I don't know how necessary this is
      this.programInfo.uniformLocations.uViewMatrix,
      false,
      this.viewMatrix);*/

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
class Objec {
  constructor(objectData, rotpos) {
    this.objectData = objectData;
    this.rotpos = rotpos;

    this.buffers = [];
    this.texture = null;
    this.vao = null;

    this.translationMatrix = mat4.create();
    mat4.fromTranslation(this.translationMatrix, this.rotpos.position);
  }
}

/*
class ObjectData { //Shouldn't this have a rotpos?
  constructor() {
    

    //Should store the information that is generic to all objects of a certain type (i.e attribute information, texture) so we don't need to re-load them
  }
}*/

//A position and rotation that is used for every physical thing in a scene
//TIDYING STATUS: GREEN
class RotPos {
  //Constructor passing in position and rotation
  constructor(position, rotation) {
    this.position = (position === undefined) ? vec3.create() : position;
    this.rotation = (rotation === undefined) ? quat.create() : rotation;
  }

  get forward() {
    let localForward = vec3.create();
    vec3.getAxisAngle(localForward, this.rotation);
    return localForward;
  }

  get right() {

  }

  get up() {
    let localUp = vec3.create();
    let localForward = this.forward;
    vec3.cross(localUp, );
  }
}

//Should only be called once per animation frame. Starts a loop of updating shaders.
function RenderLoop(now) {
  if (document.pointerLockElement === null) {
    requestAnimationFrame(RenderLoop);
    return;
  }
  now *= 0.001;  // convert to seconds
  const deltaTime = now - time;
  time = now;

  let activeShaders = temp.shaders;

  if (activeShaders.length > 0) {
    temp.gl.clear(temp.gl.COLOR_BUFFER_BIT | temp.gl.DEPTH_BUFFER_BIT); //Temporary solution
  }

  for (var i = 0; i < activeShaders.length; i++) {
    if (activeShaders.length > 1) {
      activeShaders[i].gl.useProgram(activeShaders[i].programInfo.program);
    }
    
    //This whole movement script means nothing if we can't see anything
    let movZ = (pressedKeys[keyEnums["KeyW"]] - pressedKeys[keyEnums["KeyS"]]) / 10;
    vec3.add(activeShaders[i].rotpos.position, activeShaders[i].rotpos.position, [movZ * Math.cos(rotX / 180), 0.0, movZ * Math.sin(rotX / 180)]);

    let _vec = vec3.fromValues(Math.cos(rotX / 180), 10 * Math.sin(-rotY / 540), Math.sin(rotX / 180)); //All this should be done on a mousemove event
    let _cameraRight = vec3.create();
    let _cameraUp = vec3.fromValues(0.0, 1.0, 0.0);
    vec3.cross(_cameraRight, _cameraUp, _vec);
    vec3.normalize(_cameraRight, _cameraRight);
    vec3.cross(_cameraUp, _vec, _cameraRight);

    vec3.add(_vec, _vec, activeShaders[i].rotpos.position);

    mat4.lookAt(activeShaders[i].viewMatrix, activeShaders[i].rotpos.position, _vec, _cameraUp);

    activeShaders[i].gl.uniformMatrix4fv(
      activeShaders[i].programInfo.uniformLocations.uViewMatrix,
      false,
      activeShaders[i].viewMatrix);
    
    activeShaders[i].DrawScene();
  }

  requestAnimationFrame(RenderLoop);
}

//Basic and probably slow object loading system, nature of storage means there's quite a bit
//of string manipulation to be done when loading. Should probably fix later, but it's not that big of a deal for now.
//Like the rest of the async stuff, should probably be handled outside all the main classes
//TIDYING STATUS: DEEP ORANGE
function ProcessObjectData(data) {
  let stringAttributes = data.split("\r\n\r\n");

  for (var i = 0; i < stringAttributes.length; i++) {
    stringAttributes[i] = stringAttributes[i].replace(/\n/g, "");
    stringAttributes[i] = stringAttributes[i].replace(/ /g, "");
    stringAttributes[i] = stringAttributes[i].split(",");
  }
    
  for (var i = 0; i < stringAttributes.length; i++) {
    for (var j = 0; j < stringAttributes[i].length; j++) {
      stringAttributes[i][j] = parseFloat(stringAttributes[i][j]);
    }
  }

  return stringAttributes;
}

//Loads values from text files given by the url
//TIDYING STATUS: GREEN
async function LoadFileText(url) {
  const retrievedText = await fetch(url);
  const text = await retrievedText.text();
  return text;
}

//Loads image from url
//TIDYING STATUS: GREEN
async function LoadImage(url) {
  let val = new Promise((resolve, reject) => {
    let img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
  return await val; //I'm not sure if this await is needed, i need to read more on promises
}

//Loads a shader from url data
async function LoadShader(window, vsUrl, fsUrl) {
  const vSource = await LoadFileText(vsUrl);
  const fSource = await LoadFileText(fsUrl);

  window.AddShader(vSource, fSource);
}

//Loads an object from url data
async function LoadObject(shader, url, texUrl, pos) {
  let data = await LoadFileText(url);
  let stringAttributes = ProcessObjectData(data);
  let image = await LoadImage(texUrl);
  //shader.AddObject({str: stringAttributes, tex: image, pos: pos});
  shader.AddObject(new Objec({ //Hardcoded, I know, but can fix that later
    "ARRAY_BUFFER" : {
      "aVertexPosition" : [stringAttributes[0], 3, 12, 0],
      "aTexturePosition" : [stringAttributes[2], 2, 8, 0]
    },

    "ELEMENT_ARRAY_BUFFER" : [stringAttributes[1]],

    "TEXTURE" : image
  }, pos));
}

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

//Everything above should be seperated into it's own module.
const temp = new Window("canvas");
LoadShader(temp, "vertexShader.vs", "fragmentShader.fs").then( (response) => {
  LoadObject(temp.shaders[0], "prism.txt", "texture.png", new RotPos([0.0, 0.0, 6.0]));
  LoadObject(temp.shaders[0], "object.txt", "door.png", new RotPos([6.0, 0.0, 0.0]));
});
LoadShader(temp, "lineVertexShader.vs", "lineFragmentShader.fs").then( (response) => {
  temp.shaders[1].AddObject(new Objec({ "ARRAY_BUFFER" : { "aVertexPosition" : [[0, 0, 0, 0, 1, 0], 3, 12, 0]} }, new RotPos()));
});

//What's the difference between window.addeventlistener and document.addeventlistener
window.addEventListener("click", function(e) {
  if (document.pointerLockElement === null) { //Might need to add mozPointerLock, whatever that is
    const now = performance.now();
    if (now - pointerLockActivation > 2500) { //I wouldn't consider this a good solution, but it seems to be the only one that removes a DOMerror
      temp.canvas.requestPointerLock = temp.canvas.requestPointerLock || temp.canvas.mozRequestPointerLock; //Do I need to do this every time?
      temp.canvas.requestPointerLock()
      pointerLockActivation = now;
    }
  }
});

const keyEnums = {"KeyW":0, "KeyA":1, "KeyS":2, "KeyD":3}; //Why do I need to use this system?
let pressedKeys = [0, 0, 0, 0];

window.addEventListener("keydown", e => {
  setPressedKey(e.code, 1);
});
window.addEventListener("keyup", e => {
  setPressedKey(e.code, 0);
});

function setPressedKey(code, value) {
  if (keyEnums[code] || code === "KeyW") {
    pressedKeys[keyEnums[code]] = value;
  }
}

document.addEventListener("mousemove", e => {
  if (document.pointerLockElement === null) {
    return;
  }

  rotY += e.movementY;
  rotX += e.movementX;

  /*
  quat.rotateY(activeShaders[0].rotpos.rotation, activeShaders[0].rotpos.rotation, e.movementX / 180);
  
  let localForward = vec3.create();
  quat.getAxisAngle(localForward, activeShaders[0].rotpos.rotation);

  let globalUp = vec3.fromValues(0, 1, 0); //Should be global const
  
  let localRight = vec3.create(); //This is only true because the camera is stable, should change this later to be based more on the quaternion itself
  vec3.cross(localRight, localForward, globalUp);

  quat.setAxisAngle(activeShaders[0].rotpos.rotation, localRight, rotY);

  //Need to generate a vector on the xy plane that is also a cross product of the current orientation, then rotate the quaternion along that
  //i.e rotate along the local left of the camera
  //quat.rotateX(activeShaders[0].rotpos.rotation, activeShaders[0].rotpos.rotation, e.movementY / 540);
  */

  /*
  if (rotY + e.movementY > -140) {
    if (rotY + e.movementY < 140) {
      quat.rotateX(activeShaders[0].rotpos.rotation, activeShaders[0].rotpos.rotation, e.movementY / 540);
      rotY += e.movementY;
    } else {
      quat.rotateX(activeShaders[0].rotpos.rotation, activeShaders[0].rotpos.rotation, 140 - rotY / 540);
      rotY = 140;
    }
  } else {
    quat.rotateX(activeShaders[0].rotpos.rotation, activeShaders[0].rotpos.rotation, 140 + rotY / 540);
    rotY = -140;
  }*/
});

document.addEventListener("keydown", e => {
  if (e.key === "Enter") {
    toggleFullScreen();
  }
}, false);

function toggleFullScreen() {
  if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
  } else {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    }
  }
}
