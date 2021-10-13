//// DEBUG:
//const test = document.getElementById("test");
let time = 0;
let activeShaders = [];
let loopStarted = false;
let rotX = 0;
let rotY = 0;

class Window {
  constructor(canvasID) {
    this.canvas = document.getElementById("canvas");
    this.gl = this.canvas.getContext("webgl2");

    //Ensure webgl is properly set up
    if (!this.gl) {
      alert("Unable to initialize WebGL. Your browser or machine may not support it.");
      return;
    }

    //This data needs to be loaded in the future, and shaders shouldn't be automatically set
    this.shader = new Shader(this.gl, "vertexShader.vs", "fragmentShader.fs");
  }
}

class Shader {
  constructor(gl, vertexUrl, fragmentUrl) {
    this.gl = gl;
    this.objects = [];
    const _pos = vec3.create();
    const _rota = quat.create();
    this.rotpos = new RotPos(_pos, _rota);
    this.GetSource(vertexUrl, fragmentUrl);
  }

  //Loads the vertex and fragment shader source code
  async GetSource(vertexUrl, fragmentUrl) {
    const vSource = await LoadFileText(vertexUrl);
    const fSource = await LoadFileText(fragmentUrl);

    this.CompileShader(vSource, fSource);
  }

  //Loads a type of shader from url (Eg. Vertex or Fragment)
  LoadShader(type, source) {
    const shader = this.gl.createShader(type);

    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);

    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      alert("An error occured compiling the shaders: " + this.gl.getShaderInfoLog(shader));
      this.gl.deleteShader(shader);
      return null;
    }

    return shader;
  }

  async CompileShader(vertexSource, fragmentSource) {
    //Automatically cull backfaces for now, change later if needed
    this.gl.enable(this.gl.CULL_FACE);

    //If there's already a shader program in here, deallocate the memory
    if (this.programInfo === null) {
      console.log("painis");
    }

    //Loads shaders from source urls
    const vertexShader = this.LoadShader(this.gl.VERTEX_SHADER, vertexSource);
    const fragmentShader = this.LoadShader(this.gl.FRAGMENT_SHADER, fragmentSource);

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

    for (var i = 0; i < attribCount; i++) {
      const attribInfo = this.gl.getActiveAttrib(shaderProgram, i);
      this.programInfo.attribLocations[attribInfo.name] = this.gl.getAttribLocation(shaderProgram, attribInfo.name);
    }

    for (var i = 0; i < uniformCount; i++) {
      const uniformInfo = this.gl.getActiveUniform(shaderProgram, i);
      this.programInfo.uniformLocations[uniformInfo.name] = this.gl.getUniformLocation(shaderProgram, uniformInfo.name);
    }

    await this.LoadObject("object.txt");

    this.AdditionalSetup();
  }

  async LoadObject(url) { //Messy. Clean this up later.
    let obj = new Object();
    let stringAttributes = await obj.LoadObject(url);

    obj.vao = this.gl.createVertexArray();
    this.gl.bindVertexArray(obj.vao);

    obj.buffers[0] = this.InitBuffer(this.gl.ARRAY_BUFFER, new Float32Array(stringAttributes[0]));
    this.SetVertexAttribArray(this.programInfo.attribLocations.aVertexPosition, 3, this.gl.FLOAT, false, 12, 0);

    obj.texture = await this.LoadTexture("texture.png");
    this.gl.activeTexture(this.gl.TEXTURE0 + this.objects.length);
    this.gl.bindTexture(this.gl.TEXTURE_2D, obj.texture);

    obj.buffers[2] = this.InitBuffer(this.gl.ARRAY_BUFFER, new Float32Array(stringAttributes[2]));
    this.SetVertexAttribArray(this.programInfo.attribLocations.aTexturePosition, 2, this.gl.FLOAT, false, 8, 0);
    obj.buffers[1] = this.InitBuffer(this.gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(stringAttributes[1]));

    this.objects.push(obj);
  }

  //Inserts data into an attribute. DATA SHOULD BE IN A NEW FLOAT32ARRAY FORM OR Uint16Array OR SOMETHING SIMILAR,
  InitBuffer(bufferType, data) {
    const buffer = this.gl.createBuffer();
    this.gl.bindBuffer(bufferType, buffer);
    this.gl.bufferData(bufferType, data, this.gl.STATIC_DRAW);
    return buffer;
  }

  //Set the layout of the buffer (attribute) attached to GL_ARRAY_BUFFER. THIS NEEDS TO BE CLEARED WHEN A NEW SOURCE REPLACES THIS
  SetVertexAttribArray(attribLocation, numComponents, type, normalize, stride, offset) {
    this.gl.vertexAttribPointer(attribLocation, numComponents, type, normalize, stride, offset);
    this.gl.enableVertexAttribArray(attribLocation);
  }

  //Loads texture into OpenGL
  async LoadTexture(url) {
    let texture = this.gl.createTexture();
    this.gl.bindTexture(this.gl.TEXTURE_2D, texture);

    const image = await LoadImage(url);

    this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, image);
    this.gl.generateMipmap(this.gl.TEXTURE_2D);

    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
    return texture;
  }

  //Needs a better name
  AdditionalSetup() {
    this.gl.clearColor(0.0, 0.0, 0.0, 1.0); //Clear to black, fully opaque
    this.gl.clearDepth(1.0); //Clear everything
    this.gl.enable(this.gl.DEPTH_TEST); //Enable depth testing
    this.gl.depthFunc(this.gl.LEQUAL); //Near things obscure far things
    this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);

    const fieldOfView = 45 * Math.PI / 180;
    const aspect = this.gl.canvas.clientWidth / this.gl.canvas.clientHeight;
    const zNear = 0.1;
    const zFar = 100.0;

    const projectionMatrix = mat4.create();
    mat4.perspective(projectionMatrix, fieldOfView, aspect, zNear, zFar);

    this.modelMatrix = mat4.create(); //This should be for every object
    mat4.translate(this.modelMatrix, this.modelMatrix, [0.0, 0.0, -6.0]);

    this.viewMatrix = mat4.create();
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

    this.gl.uniformMatrix4fv(
      this.programInfo.uniformLocations.uModelMatrix,
      false,
      this.modelMatrix);

    // Tell the shader we bound the texture to texture unit 0
    this.gl.uniform1i(this.programInfo.uniformLocations.uSampler, 0);

    activeShaders.push(this);
    if (loopStarted === false) {
      loopStarted = true;
      requestAnimationFrame(RenderLoop);
    }
  }

  DrawScene() {
    //Clear canvas before drawing
    this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);

    const offset = 0;
    const vertexCount = 36;
    this.gl.bindVertexArray(this.objects[0].vao); //WTF? Why does this work now?
    this.gl.activeTexture(this.gl.TEXTURE0); // + i
    this.gl.drawElements(this.gl.TRIANGLES, vertexCount, this.gl.UNSIGNED_SHORT, offset);
  }
}

class Object {
  constructor() {
    this.buffers = [];
    this.texture = null;
    this.vao = null;
  }
  //Basic and probably slow object loading system, nature of storage means there's quite a bit
  //of string manipulation to be done when loading. Should probably fix later, but it's not that big of a deal for now.
  async LoadObject(url) {
    let data = await LoadFileText(url);
    let stringAttributes = data.split("\n\n");
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
    this.buffers = new Array(stringAttributes.length);
    return stringAttributes;
  }
}

//A position and rotation that is used for every physical thing in a scene
class RotPos {
  constructor(position, rotation) {
    this.position = position;
    this.rotation = rotation;
  }
}

//Should only be called once per animation frame. Starts a loop of updating shaders.
function RenderLoop(now) {
  now *= 0.001;  // convert to seconds
  const deltaTime = now - time;
  time = now;

  for (var i = 0; i < activeShaders.length; i++) {
    if (activeShaders.length > 1) {
      activeShaders[i].gl.useProgram(activeShaders[i].programInfo.program);
    }

    let movZ = (pressedKeys[keyEnums["KeyW"]] - pressedKeys[keyEnums["KeyS"]]) / 10;
    vec3.add(activeShaders[i].rotpos.position, activeShaders[i].rotpos.position, [movZ * Math.cos(rotX / 180), 0.0, movZ * Math.sin(rotX / 180)]);

    let _vec = vec3.fromValues(Math.cos(rotX / 180), 10 * Math.sin(-rotY / 540), Math.sin(rotX / 180));
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

//Loads values from text files given by the url
async function LoadFileText(url) {
  const retrievedText = await fetch(url);
  const text = await retrievedText.text();
  return text;
}

async function LoadImage(url) {
  let val = new Promise((resolve, reject) => {
    let img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
  return await val;
}

//Everything above should be seperated into it's own module.
const temp = new Window("canvas");

window.addEventListener("click", function(e) {
  temp.canvas.requestPointerLock = temp.canvas.requestPointerLock || temp.canvas.mozRequestPointerLock;
  temp.canvas.requestPointerLock()
});

const keyEnums = {"KeyW":0, "KeyA":1, "KeyS":2, "KeyD":3};
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
  rotX += e.movementX;
  if (rotY + e.movementY > -140 && rotY + e.movementY < 140) {
    rotY += e.movementY;
  }
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
