"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const screen_js_1 = require("./screen.js");
const physics_js_1 = require("./physics.js");
const loading_js_1 = require("./loading.js");
const geometry_js_1 = require("./geometry.js");
const objec_js_1 = require("./objec.js");
const gl_matrix_1 = require("gl-matrix");
let time = 0;
let pointerLockActivation = 0;
let isPaused = false;
let rotX = 0;
let rotY = 0;
const speed = 0.1;
//Gets the shader that the model belongs to from name. Assumes models have a one-to-one relation with shaders
let physicsScene = new physics_js_1.PhysicsScene();
const temp = new screen_js_1.FScreen("canvas");
const cam = temp.AddCamera([0.0, 0.0], [1.0, 1.0], "2D", 0);
// const ui = temp.AddCamera([0.0, 0.0], [1.0, 1.0], "2D", 0);
const callbackFunctions = {
    "sprite": (window, object) => {
        const vec = gl_matrix_1.vec3.create();
        gl_matrix_1.vec3.subtract(vec, object.rotpos.position, window.cameras[0].rotpos.position);
        gl_matrix_1.vec3.normalize(vec, vec);
        const up = gl_matrix_1.vec3.fromValues(0.0, 1.0, 0.0);
        const right = gl_matrix_1.vec3.create();
        gl_matrix_1.vec3.cross(right, up, vec);
        gl_matrix_1.vec3.normalize(right, right);
        gl_matrix_1.vec3.cross(up, vec, right);
        gl_matrix_1.vec3.normalize(up, up);
        const lookAtMatrix = gl_matrix_1.mat4.create();
        gl_matrix_1.mat4.targetTo(lookAtMatrix, object.rotpos.position, window.cameras[0].rotpos.position, up);
        gl_matrix_1.mat4.getRotation(object.rotpos.rotation, lookAtMatrix);
    }
};
(async () => {
    await (0, loading_js_1.LoadShader)(temp.cameras[0], "2DspriteVertexShader.vs", "spriteFragmentShader.fs");
    const modelData = await (0, loading_js_1.LoadModel)(temp, "verSprite.json");
    temp.shaders[0].CreateModel("verSprite.json", modelData);
    const test = temp.shaders[0].InstanceObject("verSprite.json", new objec_js_1.RotPos([0.5, 0.5, 0.0], Math.PI, [10, 10]), physicsScene, 0);
    requestAnimationFrame(RenderLoop);
})();
// LoadMap(temp, "map.json", physicsScene, RenderLoop, callbackFunctions).then(async () => {
//   await LoadShader(temp, temp.cameras[0], "2DspriteVertexShader.vs", "spriteFragmentShader.fs");
//   const modelData = await LoadModel(temp, "verSprite.json");
//   temp.shaders[1].CreateModel("verSprite.json", modelData);
//   const test = temp.shaders[1].InstanceObject("verSprite.json", new RotPos([0.5, 0.5, 1.0], Math.PI, [10, 10]), physicsScene, 0);
// });
//Should only be called once per animation frame. Starts a loop of updating shaders.
function RenderLoop(now) {
    //Don't update if mouse pointer is not locked
    if (document.pointerLockElement === null) {
        requestAnimationFrame(RenderLoop);
        return;
    }
    now *= 0.001; // convert to seconds
    const deltaTime = now - time;
    time = now;
    const activeShaders = temp.shaders;
    if (activeShaders.length > 0) {
        temp.gl.clear(temp.gl.COLOR_BUFFER_BIT | temp.gl.DEPTH_BUFFER_BIT); //Temporary solution
    }
    const _vec = gl_matrix_1.vec3.fromValues(Math.cos(rotX / 180), 10 * Math.sin(-rotY / 540), Math.sin(rotX / 180));
    const _cameraRight = gl_matrix_1.vec3.create();
    const _cameraUp = gl_matrix_1.vec3.fromValues(0.0, 1.0, 0.0);
    gl_matrix_1.vec3.cross(_cameraRight, _cameraUp, _vec);
    gl_matrix_1.vec3.normalize(_cameraRight, _cameraRight);
    gl_matrix_1.vec3.cross(_cameraUp, _vec, _cameraRight);
    // Calculate movement
    const movX = ((temp.keysDown["KeyA"] ? 1 : 0) - (temp.keysDown["KeyD"] ? 1 : 0)) / 10;
    const movZ = ((temp.keysDown["KeyW"] ? 1 : 0) - (temp.keysDown["KeyS"] ? 1 : 0)) / 10;
    const movVec = [movX * _cameraRight[0] + movZ * _vec[0], 0.0, movX * _cameraRight[2] + movZ * _vec[2]];
    gl_matrix_1.vec3.normalize(movVec, movVec);
    gl_matrix_1.vec3.scale(movVec, movVec, speed);
    // Calculate collision detection
    // TLDR calculate segment from 3d past position to 3d future position
    if (!gl_matrix_1.vec3.equals(movVec, [0, 0, 0])) {
        const proposedMoveVec = gl_matrix_1.vec3.create();
        gl_matrix_1.vec3.add(proposedMoveVec, temp.cameras[0].rotpos.position, movVec);
        const currentPoint = new geometry_js_1.Point2D(temp.cameras[0].rotpos.position[2], temp.cameras[0].rotpos.position[0]);
        const proposedMovePoint = new geometry_js_1.Point2D(proposedMoveVec[2], proposedMoveVec[0]);
        const moveSegment = new geometry_js_1.Segment2D(currentPoint, proposedMovePoint);
        // Calculate if the plane segment intersects with it
        // Get shortest distance
        // let i = 0;
        temp.shaders[0].models["plane.json"].objects.forEach((object) => {
            const rotationVec = gl_matrix_1.vec3.create();
            const angle = gl_matrix_1.quat.getAxisAngle(rotationVec, object.rotpos.rotation);
            const scale = object.rotpos.scale[0];
            const xBonus = Math.cos(angle) * scale;
            const yBonus = Math.sin(angle) * scale * (rotationVec[1] < 0 ? 1 : -1);
            const point1 = new geometry_js_1.Point2D(object.rotpos.position[2] + yBonus, object.rotpos.position[0] + xBonus);
            const point2 = new geometry_js_1.Point2D(object.rotpos.position[2] - yBonus, object.rotpos.position[0] - xBonus);
            const wallSegment = new geometry_js_1.Segment2D(point1, point2);
            const intersection = (0, geometry_js_1.IntersectionSegmentAndSegment)(moveSegment, wallSegment);
            if (intersection instanceof geometry_js_1.Point2D) {
                // Move back along the segment the distance of the radius (towards point 1)
                const radius = 0.05;
                const x = intersection.x - radius * Math.cos(moveSegment.angle);
                const y = intersection.y - radius * Math.sin(moveSegment.angle);
                proposedMoveVec[0] = y;
                proposedMoveVec[2] = x;
            }
            // i++;
        });
        temp.cameras[0].rotpos.position = proposedMoveVec;
    }
    gl_matrix_1.vec3.add(_vec, _vec, temp.cameras[0].rotpos.position);
    temp.cameras.forEach((camera) => {
        gl_matrix_1.mat4.lookAt(camera.viewMatrix, camera.rotpos.position, _vec, _cameraUp);
        camera.PreDraw();
        temp.shaders.forEach((shader) => shader.DrawScene(0));
    });
    if (!isPaused) {
        requestAnimationFrame(RenderLoop);
    }
}
//What's the difference between window.addeventlistener and document.addeventlistener?
temp.canvas.addEventListener("click", function (e) {
    if (document.pointerLockElement === null) { //Might need to add mozPointerLock, whatever that is
        const now = performance.now();
        if (now - pointerLockActivation > 2500) { //I wouldn't consider this a good solution, but it seems to be the only one that removes a DOMerror
            temp.canvas.requestPointerLock = temp.canvas.requestPointerLock; //Do I need to do this every time?
            temp.canvas.requestPointerLock();
            pointerLockActivation = now;
        }
    }
});
temp.keyDownCallbacks["Enter"] = () => {
    (0, screen_js_1.toggleFullScreen)();
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
