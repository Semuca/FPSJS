import { FScreen, toggleFullScreen } from './screen.js';
import { LoadMap } from './loading.js';
import { Circle2D, Point2D, Segment2D, translatePointAlongAngle } from './geometry.js';
import { Objec, RotPos } from './objec.js';
import { mat4, quat, vec3 } from 'gl-matrix';
import { colliders, GetNextColliderOnSegment, MoveCircle } from './collider.js';
import { Scene } from './scene.js';
import { CameraData } from './shader.js';

// let time = 0;
let pointerLockActivation = 0;
const isPaused = false;

let rotX = 0;
let rotY = 0;
let rot = 0;

const speed = 0.1;
const DECALS_LENGTH = 30;
const decals: Objec[] = [];

//Gets the shader that the model belongs to from name. Assumes models have a one-to-one relation with shaders
// let physicsScene = new PhysicsScene();

const scene = new Scene();
const screen = new FScreen('canvas', scene);
const cam = new CameraData({ scene });

const callbackFunctions: Record<string, (screen: FScreen, object: Objec) => void> = {
  sprite: (_window, object) => {
    const vec = vec3.create();
    vec3.subtract(vec, object.rotpos.position as vec3, cam.rotpos.position);
    vec3.normalize(vec, vec);

    const up = vec3.fromValues(0.0, 1.0, 0.0);
    const right = vec3.create();
    vec3.cross(right, up, vec);
    vec3.normalize(right, right);
    vec3.cross(up, vec, right);
    vec3.normalize(up, up);

    const lookAtMatrix = mat4.create();
    mat4.targetTo(lookAtMatrix, object.rotpos.position as vec3, cam.rotpos.position, up);

    mat4.getRotation(object.rotpos.rotation, lookAtMatrix);
  },
};

LoadMap(scene, 'octagon.json', RenderLoop, callbackFunctions).then(async () => {
  // await CreateTexture(temp, 'pistol.png');
  // temp.shaders[1].InstanceObject(
  //   'verSprite.json',
  //   new RotPos2D([0, -110], Math.PI, [300, 300]),
  //   0,
  //   'pistol.png',
  // );

  // Set up colliders
  screen.set_scene(scene);
  screen.shaders[0].shader_data.models[0].objects.forEach((object) => {
    const rotationVec = vec3.create();
    const angle = quat.getAxisAngle(rotationVec, object.rotpos.rotation);

    const scale = (object.rotpos.scale as vec3)[0];
    const xBonus = Math.cos(angle) * scale;
    const yBonus = Math.sin(angle) * scale * (rotationVec[1] < 0 ? 1 : -1);

    const point1 = new Point2D(
      (object.rotpos.position[2] as number) + yBonus,
      object.rotpos.position[0] + xBonus,
    );
    const point2 = new Point2D(
      (object.rotpos.position[2] as number) - yBonus,
      object.rotpos.position[0] - xBonus,
    );
    colliders.push(new Segment2D(point1, point2));
  });
});

//Should only be called once per animation frame. Starts a loop of updating shaders.
function RenderLoop() {
  //Don't update if mouse pointer is not locked
  if (document.pointerLockElement === null) {
    requestAnimationFrame(RenderLoop);
    return;
  }
  // now *= 0.001; // convert to seconds
  // const deltaTime = now - time;
  // time = now;

  screen.gl.clear(screen.gl.COLOR_BUFFER_BIT | screen.gl.DEPTH_BUFFER_BIT);

  const _vec = vec3.fromValues(
    Math.cos(rotX / 180),
    10 * Math.sin(-rotY / 540),
    Math.sin(rotX / 180),
  );
  const _cameraRight = vec3.create();
  const _cameraUp = vec3.fromValues(0.0, 1.0, 0.0);
  vec3.cross(_cameraRight, _cameraUp, _vec);
  vec3.normalize(_cameraRight, _cameraRight);
  vec3.cross(_cameraUp, _vec, _cameraRight);

  rot = Math.atan2(_vec[0], _vec[2]);

  // Calculate movement
  const movX = ((screen.keysDown['KeyA'] ? 1 : 0) - (screen.keysDown['KeyD'] ? 1 : 0)) / 10;
  const movZ = ((screen.keysDown['KeyW'] ? 1 : 0) - (screen.keysDown['KeyS'] ? 1 : 0)) / 10;
  const movVec = [
    movX * _cameraRight[0] + movZ * _vec[0],
    0.0,
    movX * _cameraRight[2] + movZ * _vec[2],
  ] as vec3;
  vec3.normalize(movVec, movVec);
  vec3.scale(movVec, movVec, speed);

  // Calculate collision detection
  // TLDR calculate segment from 3d past position to 3d future position
  if (!vec3.equals(movVec, [0, 0, 0])) {
    const circle = new Circle2D(
      new Point2D(cam.rotpos.position[2] as number, cam.rotpos.position[0]),
      0.05,
    );

    MoveCircle(circle, new Point2D(movVec[2], movVec[0]));

    cam.rotpos.position[0] = circle.center.y;
    cam.rotpos.position[2] = circle.center.x;
  }

  vec3.add(_vec, _vec, cam.rotpos.position);

  screen.cameras.forEach((camera) => {
    mat4.lookAt(camera.viewMatrix, camera.camera_data.rotpos.position, _vec, _cameraUp);
    camera.Draw();
  });

  if (!isPaused) {
    requestAnimationFrame(RenderLoop);
  }
}

//What's the difference between window.addeventlistener and document.addeventlistener?
screen.canvas.addEventListener('click', () => {
  if (!document.pointerLockElement) {
    //Might need to add mozPointerLock, whatever that is
    const now = performance.now();
    if (now - pointerLockActivation > 2500) {
      //I wouldn't consider this a good solution, but it seems to be the only one that removes a DOMerror
      screen.canvas.requestPointerLock();
      pointerLockActivation = now;
    }
  }
});

scene.keyDownCallbacks['Enter'] = () => {
  toggleFullScreen();
};

cam.onMouseDown = () => {
  if (!document.pointerLockElement) return;
  // Play an animation for the gun using sprite sheets

  // Calculate where the shot lands on a 2d plane
  const camPos = new Point2D(cam.rotpos.position[2], cam.rotpos.position[0]);
  const endPoint = translatePointAlongAngle(camPos, rot, 100);

  const hit = GetNextColliderOnSegment(
    new Segment2D(camPos, endPoint),
    new Circle2D(camPos, 0.005),
  );

  if (!hit) return;

  // Spawn a decal where the shot lands (Make sure no more than DECALS_LENGTH show)
  const rotation = quat.create();
  quat.setAxisAngle(rotation, [0, 1, 0], hit.collider.angle + Math.PI / 2);
  if (decals.length > DECALS_LENGTH) {
    decals[0].Destructor();
    decals.shift();
  }

  const model = screen.shaders[0].shader_data.models[scene.texIds['plane.json']];

  const objec = new Objec({model, rotpos: new RotPos([hit.intersection.y, 0, hit.intersection.x], rotation, [0.1, 0.1, 0.1])});

  model.create_objec(objec);
  decals.push(objec);

  // Trigger a shot landed call on whatever object the shot lands on
};

cam.onMouseMove = (e) => {
  if (document.pointerLockElement === null || isPaused) {
    return;
  }

  rotX += e.movementX;
  rotY += e.movementY;
};

//Resizing for the window. What's the difference between "resize" and "onresize"?
// window.addEventListener("resize", e => {
//   temp.canvas.width = temp.canvas.clientWidth;
//   temp.canvas.height = temp.canvas.clientHeight;

//   temp.cameras.forEach((camera) => {
//     camera.SetViewport();
//     camera.aspectRatio = temp.canvas.width / temp.canvas.height;
//     camera.RecalculateProjMatrix();
//   });
// });
