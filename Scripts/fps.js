import { Screen, toggleFullScreen } from "./screen.js";
import { PhysicsScene } from "./physics.js";
import { LoadMap } from "./loading.js";

let time = 0;
let pointerLockActivation = 0;
let isPaused = false;

let rotX = 180;
let rotY = 0;

//Gets the shader that the model belongs to from name. Assumes models have a one-to-one relation with shaders
let physicsScene = new PhysicsScene();

const temp = new Screen("canvas");
const cam = temp.AddCamera([0.0, 0.0], [1.0, 1.0], "3D", 0);
LoadMap(temp, "map.json", physicsScene, RenderLoop);

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

  const movX = ((temp.keysDown["KeyA"] ? 1 : 0) - (temp.keysDown["KeyD"] ? 1 : 0)) / 10;
  const movZ = ((temp.keysDown["KeyW"] ? 1 : 0) - (temp.keysDown["KeyS"] ? 1 : 0)) / 10;
  const movVec = [movX * _cameraRight[0] + movZ * _vec[0], 0.0, movX * _cameraRight[2] + movZ * _vec[2]]; //Need to make this always have a constant length for consistent movement regardless of the y looking

  vec3.add(temp.cameras[0].rotpos.position, temp.cameras[0].rotpos.position, movVec);
  vec3.add(_vec, _vec, temp.cameras[0].rotpos.position);

  temp.cameras.forEach((camera) => {
    mat4.lookAt(camera.viewMatrix, camera.rotpos.position, _vec, _cameraUp);
    camera.PreDraw();
    temp.shaders.forEach((shader) => shader.DrawScene(0));
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

temp.keyDownCallbacks["Enter"] = () => {
  toggleFullScreen();
}

cam.onMouseMove = (e) => {
  if (document.pointerLockElement === null || isPaused === true) {
    return;
  }

  rotX += e.movementX;
  rotY += e.movementY;
}

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