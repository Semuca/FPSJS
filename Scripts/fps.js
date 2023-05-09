import {Window} from "./shader.js";
import {PhysicsScene} from "./physics.js";
import {LoadMap} from "./loading.js";

let terminal = document.getElementById("texty"); //Need a better system for built-in html ui sometime in the futures

let time = 0;
let pointerLockActivation = 0;
let isPaused = false;

let rotX = 180;
let rotY = 0;

let keysDown = {};

//Gets the shader that the model belongs to from name. Assumes models have a one-to-one relation with shaders
let models = {};
let physicsScene = new PhysicsScene();

const temp = new Window("canvas");
LoadMap(temp, models, "osiris.txt", physicsScene, RenderLoop);

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
  
    if (keysDown["Digit1"]) { //Look left
      let _tempQ = quat.create();
      quat.setAxisAngle(_tempQ, [0, 1, 0], 1 / 40);
      quat.multiply(temp.shaders[0].objects[0].rotpos.rotation, _tempQ, temp.shaders[0].objects[0].rotpos.rotation);
    }
    if (keysDown["Digit3"]) { //Look up
      let _tempQ = quat.create();
      quat.setAxisAngle(_tempQ, temp.shaders[0].objects[0].rotpos.right, - 1 / 40);
      quat.multiply(temp.shaders[0].objects[0].rotpos.rotation, _tempQ, temp.shaders[0].objects[0].rotpos.rotation);
    }
  
    let _vec = vec3.fromValues(Math.cos(rotX / 180), 10 * Math.sin(-rotY / 540), Math.sin(rotX / 180));
    let _cameraRight = vec3.create();
    let _cameraUp = vec3.fromValues(0.0, 1.0, 0.0);
    vec3.cross(_cameraRight, _cameraUp, _vec);
    vec3.normalize(_cameraRight, _cameraRight);
    vec3.cross(_cameraUp, _vec, _cameraRight);
  
    let movZ = ((keysDown["KeyW"] ? 1 : 0) - (keysDown["KeyS"] ? 1 : 0)) / 10;
    let movVec = [movZ * _vec[0], 0.0, movZ * _vec[2]]; //Need to make this always have a constant length for consistent movement regardless of the y looking
  
    vec3.add(_vec, _vec, temp.camera.rotpos.position);
  
  
    vec3.add(temp.camera.rotpos.position, temp.camera.rotpos.position, movVec);


  
    for (var i = 0; i < activeShaders.length; i++) {
      /*if (activeShaders.length > 1) {   Don't think this is necessary
        activeShaders[i].gl.useProgram(activeShaders[i].shaderProgram);
      }*/
  
      if (activeShaders[i].type == "3D") {
        mat4.lookAt(activeShaders[i].viewMatrix, temp.camera.rotpos.position, _vec, _cameraUp);
  
        activeShaders[i].gl.uniformMatrix4fv(
          activeShaders[i].programInfo.uniformLocations.uViewMatrix,
          false,
          activeShaders[i].viewMatrix);
      }
  
      activeShaders[i].DrawScene();
    }
  
    if (isPaused === false) {
      requestAnimationFrame(RenderLoop);
    }
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
    /*
    //Create new object at origin on 'C'
    if (e.code === "KeyC") {
      temp.shaders[0].CreateObject(new Objec(models["lineObject.txt"].modelData, new RotPos([0.0, 0.0, 0.0]), physicsScene));
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
  
    //Switch object shaders
    if (e.code === "KeyB") {
      shaderFocus += 1;
      if (shaderFocus >= temp.shaders.length) {
        shaderFocus = 0;
      }
      return;
    }*/
  });
  
  
  document.addEventListener("mousemove", e => {
    if (document.pointerLockElement === null || isPaused === true) {
      return;
    }
  
    rotX += e.movementX;
    rotY += e.movementY;
  });
  
  
  //Resizing for the window. What's the difference between "resize" and "onresize"?
  window.addEventListener("resize", e => {
    temp.canvas.width = temp.canvas.clientWidth;
    temp.canvas.height = temp.canvas.clientHeight;

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
  