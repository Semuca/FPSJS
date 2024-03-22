import { Screen } from "./shader.js";
import { PhysicsScene } from "./physics.js";
import { LoadMap } from "./loading.js";

let time = 0;
let pointerLockActivation = 0;
let isPaused = false;

let rotX = 180;
let rotY = 0;

let keysDown = {};

//Gets the shader that the model belongs to from name. Assumes models have a one-to-one relation with shaders
let physicsScene = new PhysicsScene();

const temp = new Screen("canvas");
temp.AddCamera([0.0, 0.0], [1.0, 1.0], "3D", 0);
LoadMap(temp, "osiris.json", physicsScene, RenderLoop);

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

  let _vec = vec3.fromValues(Math.cos(rotX / 180), 10 * Math.sin(-rotY / 540), Math.sin(rotX / 180));
  let _cameraRight = vec3.create();
  let _cameraUp = vec3.fromValues(0.0, 1.0, 0.0);
  vec3.cross(_cameraRight, _cameraUp, _vec);
  vec3.normalize(_cameraRight, _cameraRight);
  vec3.cross(_cameraUp, _vec, _cameraRight);

  const movX = ((keysDown["KeyA"] ? 1 : 0) - (keysDown["KeyD"] ? 1 : 0)) / 10;
  const movZ = ((keysDown["KeyW"] ? 1 : 0) - (keysDown["KeyS"] ? 1 : 0)) / 10;
  const movVec = [movX * _cameraRight[0] + movZ * _vec[0], 0.0, movX * _cameraRight[2] + movZ * _vec[2]]; //Need to make this always have a constant length for consistent movement regardless of the y looking

  vec3.add(temp.cameras[0].rotpos.position, temp.cameras[0].rotpos.position, movVec);
  vec3.add(_vec, _vec, temp.cameras[0].rotpos.position);

  temp.cameras.forEach((camera) => {
    mat4.lookAt(camera.viewMatrix, camera.rotpos.position, _vec, _cameraUp);
    camera.PreDraw();
    temp.shaders[0].DrawScene(0);
  });

  if (isPaused === false) {
    requestAnimationFrame(RenderLoop);
  }
}

//What's the difference between window.addeventlistener and document.addeventlistener?
canvas.addEventListener("click", function (e) {
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

  temp.cameras.forEach((camera) => {
    camera.SetViewport();
    camera.aspectRatio = temp.canvas.width / temp.canvas.height;
    camera.RecalculateProjMatrix();
  });
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
