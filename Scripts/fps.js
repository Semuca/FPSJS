import { Screen, toggleFullScreen } from "./screen.js";
import { PhysicsScene } from "./physics.js";
import { LoadMap } from "./loading.js";
import { IntersectionSegmentAndSegment, Point2D, Segment2D } from "./geometry.js";

let time = 0;
let pointerLockActivation = 0;
let isPaused = false;

let rotX = 0;
let rotY = 0;

const speed = 0.1;

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

  const activeShaders = temp.shaders;

  if (activeShaders.length > 0) {
    temp.gl.clear(temp.gl.COLOR_BUFFER_BIT | temp.gl.DEPTH_BUFFER_BIT); //Temporary solution
  }

  const _vec = vec3.fromValues(Math.cos(rotX / 180), 10 * Math.sin(-rotY / 540), Math.sin(rotX / 180));
  const _cameraRight = vec3.create();
  const _cameraUp = vec3.fromValues(0.0, 1.0, 0.0);
  vec3.cross(_cameraRight, _cameraUp, _vec);
  vec3.normalize(_cameraRight, _cameraRight);
  vec3.cross(_cameraUp, _vec, _cameraRight);

  // Calculate movement
  const movX = ((temp.keysDown["KeyA"] ? 1 : 0) - (temp.keysDown["KeyD"] ? 1 : 0)) / 10;
  const movZ = ((temp.keysDown["KeyW"] ? 1 : 0) - (temp.keysDown["KeyS"] ? 1 : 0)) / 10;
  const movVec = [movX * _cameraRight[0] + movZ * _vec[0], 0.0, movX * _cameraRight[2] + movZ * _vec[2]];
  vec3.normalize(movVec, movVec)
  vec3.scale(movVec, movVec, speed)

  // Calculate collision detection
  // TLDR calculate segment from 3d past position to 3d future position
  if (!vec3.equals(movVec, [0, 0, 0])) {
    const proposedMoveVec = vec3.create();
    vec3.add(proposedMoveVec, temp.cameras[0].rotpos.position, movVec);

    const currentPoint = new Point2D(temp.cameras[0].rotpos.position[2], temp.cameras[0].rotpos.position[0]);
    const proposedMovePoint = new Point2D(proposedMoveVec[2], proposedMoveVec[0]);
    const moveSegment = new Segment2D(currentPoint, proposedMovePoint);

    // Calculate if the plane segment intersects with it
    // Get shortest distance
    let i = 0;
    temp.shaders[0].models["plane.json"].objects.forEach((object) => {
      const rotationVec = vec3.create();
      const angle = quat.getAxisAngle(rotationVec, object.rotpos.rotation);

      const scale = object.rotpos.scale[0];
      const xBonus = Math.cos(angle) * scale;
      const yBonus = Math.sin(angle) * scale * (rotationVec[1] < 0 ? 1 : -1);

      const point1 = new Point2D(object.rotpos.position[2] + yBonus, object.rotpos.position[0] + xBonus);
      const point2 = new Point2D(object.rotpos.position[2] - yBonus, object.rotpos.position[0] - xBonus);
      const wallSegment = new Segment2D(point1, point2);


      const intersection = IntersectionSegmentAndSegment(moveSegment, wallSegment, logging);

      if (intersection instanceof Point2D) {
        // Move back along the segment the distance of the radius (towards point 1)
        const radius = 0.05;
        const x = intersection.x - radius * Math.cos(moveSegment.angle);
        const y = intersection.y - radius * Math.sin(moveSegment.angle);

        proposedMoveVec[0] = y;
        proposedMoveVec[2] = x;
      }

      i++;
    });

    temp.cameras[0].rotpos.position = proposedMoveVec;
  }



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