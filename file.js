import {Window, Objec, RotPos} from "./shader.js";

let time = 0;
let pointerLockActivation = 0;

let rotX = 0;
let rotY = 0;


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
  const vSource = await LoadFileText("Shaders/" + vsUrl);
  const fSource = await LoadFileText("Shaders/" + fsUrl);

  window.AddShader(vSource, fSource);
}

//Loads an object from url data
async function LoadObject(shader, url, texUrl, pos) {
  let data = await LoadFileText("Models/" + url);
  let stringAttributes = ProcessObjectData(data);
  let image = await LoadImage("Textures/" + texUrl);
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
/*
LoadShader(temp, "spriteVertexShader.vs", "spriteFragmentShader.fs").then( (response) => {
  temp.shaders[2].AddObject(new Objec());
});*/

requestAnimationFrame(RenderLoop);

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
  rotX += e.movementX;
  rotY += e.movementY;

});

document.addEventListener("onresize", e => {
  for (let i = 0; i < array.length; i++) {
    temp.shaders[i].gl.viewport(0, 0, temp.shaders[i].gl.canvas.width, temp.shaders[i].gl.canvas.height);
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
