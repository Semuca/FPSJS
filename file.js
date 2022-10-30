import {Window, Shader, Objec, RotPos} from "./shader.js";
import {PhysicsScene, PhysicsObjec} from "./physics.js";

let terminal = document.getElementById("texty");

let time = 0;
let pointerLockActivation = 0;
let isPaused = false;

let rotX = 0;
let rotY = 0;

let objectFocus = 0;

let models = {};
let physicsScene = new PhysicsScene();

let keysDown = {}

const temp = new Window("canvas");
LoadShader(temp, "lineVertexShader.vs", "lineFragmentShader.fs").then( (response) => {
  LoadWireframeModel("lineObject.txt").then( (response) => {
    //Setup
    temp.shaders[0].AddObject(new Objec(models["lineObject.txt"], new RotPos([6.0, 0.0, 0.0]), physicsScene));
    temp.shaders[0].AddObject(new Objec(models["lineObject.txt"], new RotPos([0.0, 0.0, 6.0], undefined, [3.0, 0.5, 1.0]), physicsScene));

    requestAnimationFrame(RenderLoop);
  });

});
/*LoadShader(temp, "lineVertexShader.vs", "lineFragmentShader.fs").then( (response) => {
  temp.shaders[1].AddObject(new Objec({ "ARRAY_BUFFER" : { "aVertexPosition" : [[0, 0, 0, 0, 1, 0], 3, 12, 0]} }, new RotPos([2.0, 0.0, 0.0])));
});*/
/*
LoadShader(temp, "spriteVertexShader.vs", "spriteFragmentShader.fs").then( (response) => {
  temp.shaders[2].AddObject(new Objec());
});*/

//Should only be called once per animation frame. Starts a loop of updating shaders.
function RenderLoop(now) {

  //Don't update if mouse pointer is not locked
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
      activeShaders[i].gl.useProgram(activeShaders[i].shaderProgram);
    }

    if (temp.shaders[i].objects.length === 0) { //This is a hack, remove it later
      activeShaders[i].DrawScene();
      continue;
    }

    let movementVector = [0.0, 0.0, 0.0]

    if (keysDown["KeyA"] === true) {
      movementVector[0] += 0.3;
    }
    if (keysDown["KeyW"] === true) {
      movementVector[2] += 0.3;
    }
    if (keysDown["KeyS"] === true) {
      movementVector[2] -= 0.3;
    }
    if (keysDown["KeyD"] === true) {
      movementVector[0] -= 0.3;
    }

    if (temp.shaders[i].objects[objectFocus].physics.enabled === true) {
      temp.shaders[i].objects[objectFocus].physics.Move(movementVector);
    } else {
      vec3.add(temp.shaders[i].objects[objectFocus].rotpos.position, temp.shaders[i].objects[objectFocus].rotpos.position, movementVector);
    }
    
    /*
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
    



    if (temp.shaders[0].objects.length > 0 && temp.shaders[1].objects.length > 0) {

      let vec = vec3.create();
      quat.getAxisAngle(vec, temp.shaders[0].objects[0].rotpos.rotation);

      if (vec[0] != temp.shaders[1].objects[0].objectData["ARRAY_BUFFER"]["aVertexPosition"][0][3] &&
          vec[1] != temp.shaders[1].objects[0].objectData["ARRAY_BUFFER"]["aVertexPosition"][0][4] &&
          vec[2] != temp.shaders[1].objects[0].objectData["ARRAY_BUFFER"]["aVertexPosition"][0][5]) {
        temp.shaders[1].objects[0].ModifyAttribute("aVertexPosition", 0, [0, 0, 0, vec[0], vec[1], vec[2]]);
      }
    }
    */

    activeShaders[i].DrawScene();
  }

  if (isPaused === false) {
    requestAnimationFrame(RenderLoop);
  }
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

async function LoadWireframeModel(url) {
  let data = await LoadFileText("Models/" + url);
  let stringAttributes = ProcessObjectData(data);
  models[url] = { //Hardcoded, I know, but can fix that later
    "ARRAY_BUFFER" : {
      "aVertexPosition" : [stringAttributes[0], 3, 12, 0]
    },

    "ELEMENT_ARRAY_BUFFER" : [stringAttributes[1]]
  };
}

//What's the difference between window.addeventlistener and document.addeventlistener?
canvas.addEventListener("click", function(e) {
  if (document.pointerLockElement === null) { //Might need to add mozPointerLock, whatever that is
    const now = performance.now();
    if (now - pointerLockActivation > 2500) { //I wouldn't consider this a good solution, but it seems to be the only one that removes a DOMerror
      temp.canvas.requestPointerLock = temp.canvas.requestPointerLock || temp.canvas.mozRequestPointerLock; //Do I need to do this every time?
      temp.canvas.requestPointerLock();
      pointerLockActivation = now;
    }
  }
});

//Sets the keysDown and the keysUp, means smoother movement
window.addEventListener("keyup", e => {
  if (isPaused === true) {
    return;
  }
  keysDown[e.code] = false;
});

window.addEventListener("keydown", e => {
  //If paused, we only want to compile the console
  if (isPaused === true) {
    if (e.code === "KeyC" && document.pointerLockElement != null) {
      temp.shaders[0].ReplaceVertexShader(terminal.value);
    }

    return;
  }

  //Set what keys are being currently held down
  keysDown[e.code] = true;

  //Toggle fullscreen on enter
  if (e.key === "Enter") {
    toggleFullScreen();
    return;
  }
  
  //Open terminal on '`'
  if (e.key === "`") {
    isPaused = !isPaused
    if (isPaused === false) {
      //Unpause the game
      terminal.hidden = true;
      requestAnimationFrame(RenderLoop);
    } else {
      terminal.hidden = false;
    }
    return;
  }

  //Create new object at origin on 'C'
  if (e.code === "KeyC") {
    temp.shaders[0].AddObject(new Objec(models["lineObject.txt"], new RotPos([0.0, 0.0, 0.0]), physicsScene));
    return;
  }

  //Swap the focus on object on 'X'
  if (e.code === "KeyX") {
    objectFocus += 1;
    if (objectFocus >= temp.shaders[0].objects.length) {
      objectFocus = 0;
    }
    return;
  }

  //Disable physics on 'Z'
  if (e.code === "KeyZ") {
    if (temp.shaders[0].objects[objectFocus].physics.enabled === false) {
      temp.shaders[0].objects[objectFocus].physics.enabled = true;
    } else {
      temp.shaders[0].objects[objectFocus].physics.enabled = false;
    }
    return;
  }

  //Delete currently focussed object on 'V'
  if (e.code === "KeyV") {
    temp.shaders[0].RemoveObject(objectFocus);
    if (objectFocus >= temp.shaders[0].objects.length) {
      objectFocus = 0;
    }
    return;
  }

  /*
  if (e.code === 'Digit1') {
    quat.rotateX(temp.shaders[0].objects[0].rotpos.rotation, temp.shaders[0].objects[0].rotpos.rotation, 1 / 120);
  }
  if (e.code === 'Digit2') {
    quat.rotateX(temp.shaders[0].objects[0].rotpos.rotation, temp.shaders[0].objects[0].rotpos.rotation, -1 / 120);
  }
  if (e.code === 'Digit3') {
    quat.rotateY(temp.shaders[0].objects[0].rotpos.rotation, temp.shaders[0].objects[0].rotpos.rotation, 1 / 120);
  }
  if (e.code === 'Digit4') {
    quat.rotateY(temp.shaders[0].objects[0].rotpos.rotation, temp.shaders[0].objects[0].rotpos.rotation, -1 / 120);
  }
  if (e.code === 'Digit5') {
    quat.rotateZ(temp.shaders[0].objects[0].rotpos.rotation, temp.shaders[0].objects[0].rotpos.rotation, 1 / 120);
  }
  if (e.code === 'Digit6') {
    quat.rotateZ(temp.shaders[0].objects[0].rotpos.rotation, temp.shaders[0].objects[0].rotpos.rotation, -1 / 120);
  }*/
  //Modify object 0 of shader 0 to rotate
});

/*
document.addEventListener("mousemove", e => {
  if (document.pointerLockElement === null || isPaused === true) {
    return;
  }
  rotX += e.movementX;
  rotY += e.movementY;

});
*/

//Resizing for the window. What's the difference between "resize" and "onresize"?
window.addEventListener("resize", e => {
  for (let i = 0; i < temp.shaders.length; i++) {
    temp.shaders[i].gl.viewport(0, 0, temp.canvas.width, temp.canvas.height);
    temp.shaders[i].aspectRatio = temp.canvas.width / temp.canvas.height;
    temp.shaders[i].RecalculateProjMatrix();
  }
});

//Toggles fullscreen
function toggleFullScreen() {
  if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
  } else {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    }
  }
}
