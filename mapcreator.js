import {Window} from "./shader.js";
import {PhysicsScene} from "./physics.js";
import {CreateTexture, LoadModel, LoadShader} from "./loading.js";
import {RotPos} from "./objec.js";

let terminal = document.getElementById("texty"); //Need a better system for built-in html ui sometime in the futures

let zoom = 50.0;
let time = 0;
let isPaused = false;

const MODES = {
  MOVE: 0,
  PLACE: 1
}

let mode = MODES.MOVE;
let tile = "door.png";

let highlight;
let line;

let keysDown = {};

//Gets the shader that the model belongs to from name. Assumes models have a one-to-one relation with shaders
let models = {};
let physicsScene = new PhysicsScene();

const temp = new Window("canvas");

Setup();

async function Setup() {
  await LoadShader(temp, "2DspriteVertexShader.vs", "spriteFragmentShader.fs");
  let modelData = await LoadModel("verSprite.txt", temp);
  temp.shaders[0].CreateModel("verSprite.txt", modelData);
  CreateTexture(temp, "texture.png");

  //temp.shaders[0].InstanceObject("sprite.txt", new RotPos([0.0, 0.0], undefined, [50.0, 50.0]), physicsScene);

  //highlight = temp.shaders[0].models["sprite.txt"].objects[0];

  await LoadShader(temp, "2DflatlineVertexShader.vs", "lineFragmentShader.fs");
  modelData = await LoadModel("flatline.txt", temp);
  temp.shaders[1].CreateModel("flatline.txt", modelData);
  temp.shaders[1].InstanceObject("flatline.txt", new RotPos([0.0, 0.0], undefined, [0.0, 0.0]), physicsScene);

  line = temp.shaders[1].models["flatline.txt"].objects[0];

  requestAnimationFrame(RenderLoop);
}

//Should only be called once per animation frame. Starts a loop of updating shaders.
function RenderLoop(now) {
  now *= 0.001;  // convert to seconds
  const deltaTime = now - time;
  time = now;
  
  let activeShaders = temp.shaders;
  
  if (activeShaders.length > 0) {
    temp.gl.clear(temp.gl.COLOR_BUFFER_BIT | temp.gl.DEPTH_BUFFER_BIT); //Temporary solution
  }

  //Should do much less draws here, but for now things seem to be fine

  //Sets up grid to be drawn
  temp.gl.useProgram(temp.shaders[1].shaderProgram);
  temp.gl.bindVertexArray(temp.shaders[1].models["flatline.txt"].vao);
  temp.gl.uniform4fv(temp.shaders[1].programInfo.uniformLocations["colour"], new Float32Array([1.0, 0.0, 0.0, 1.0]));

  //Grid rendering - Y
  let offsetX = (temp.camera.rotpos.position[0] + (temp.canvas.width * temp.shaders[1].zoom / 2)) % 50.0;

  quat.setAxisAngle(line.rotpos.rotation, [0.0, 0.0, 1.0], Math.PI);

  line.rotpos.position[0] = offsetX - temp.canvas.width * temp.shaders[1].zoom / 2;
  line.rotpos.position[1] = temp.canvas.height * temp.shaders[1].zoom / 2;
  line.rotpos.scale[1] = temp.canvas.height * temp.shaders[1].zoom;

  //Draws rendering every vertical line
  for (let i = 0; i < (temp.canvas.width * temp.shaders[1].zoom - offsetX) / 50.0; i++) {

    temp.gl.uniformMatrix4fv(
      temp.shaders[1].programInfo.uniformLocations.uModelMatrix,
      false,
      line.GetMatrix());

      temp.gl.drawArrays(temp.gl.LINES, 0, 2);

      line.rotpos.position[0] += 50.0;
  }

  //Grid rendering - X
  let offsetY = (temp.camera.rotpos.position[1] + (temp.canvas.height * temp.shaders[1].zoom / 2)) % 50.0;

  line.rotpos.position[0] = temp.canvas.width * temp.shaders[1].zoom / 2;
  line.rotpos.position[1] = offsetY - temp.canvas.height * temp.shaders[1].zoom / 2;
  line.rotpos.scale[1] = temp.canvas.width * temp.shaders[1].zoom;

  quat.setAxisAngle(line.rotpos.rotation, [0.0, 0.0, 1.0], Math.PI / 2);

  //Draws rendering every horizontal line
  for (let i = 0; i < temp.canvas.height * temp.shaders[1].zoom / 50.0; i++) {

    temp.gl.uniformMatrix4fv(
      temp.shaders[1].programInfo.uniformLocations.uModelMatrix,
      false,
      line.GetMatrix());

      temp.gl.drawArrays(temp.gl.LINES, 0, 2);

      line.rotpos.position[1] += 50.0;
  }

  //Draw X axis
  temp.gl.uniform4fv(temp.shaders[1].programInfo.uniformLocations["colour"], new Float32Array([1.0, 1.0, 1.0, 1.0]));

  line.rotpos.position[1] = temp.camera.rotpos.position[1];

  temp.gl.uniformMatrix4fv(
    temp.shaders[1].programInfo.uniformLocations.uModelMatrix,
    false,
    line.GetMatrix());

  temp.gl.drawArrays(temp.gl.LINES, 0, 2);

  //Y axis
  line.rotpos.position[0] = temp.camera.rotpos.position[0];
  line.rotpos.position[1] = temp.canvas.height * temp.shaders[1].zoom / 2;
  line.rotpos.scale[1] = temp.canvas.height * temp.shaders[1].zoom;

  quat.setAxisAngle(line.rotpos.rotation, [0.0, 0.0, 1.0], Math.PI);

  temp.gl.uniformMatrix4fv(
    temp.shaders[1].programInfo.uniformLocations.uModelMatrix,
    false,
    line.GetMatrix());

  temp.gl.drawArrays(temp.gl.LINES, 0, 2);

  //Draws sprites
  temp.shaders[0].DrawScene();
}
  
//Sets the keysDown and the keysUp, means smoother movement
window.addEventListener("keyup", e => {
  if (isPaused === true) {
    return;
  }
  keysDown[e.code] = false;
});

//Should use keycodes or just key? to research
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
    if (e.code === "Enter") {
      toggleFullScreen();
      return;
    }
    
    //Open terminal on '`'
    if (e.code === "Backquote") {
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

    //Switch modes on Space
    if (e.code === "Space") {
      mode = (mode === MODES.MOVE) ? MODES.PLACE : MODES.MOVE;
    }

    //Switch tiles on 'Q'
    if (e.code === "KeyQ") {
      tile = (tile === "door.png") ? tile = "texture.png" : tile = "door.png";
    }
  });

  //For placing tiles
  document.addEventListener("mousedown", e => {
    if (isPaused === true) {
      return;
    }

    if (mode === MODES.PLACE) {
      //Positions on the grid
      let posX = Math.floor((- temp.camera.rotpos.position[0] + (temp.canvas.width * temp.shaders[0].zoom / 2) - e.pageX * temp.shaders[0].zoom) / 50.0);
      let posY = Math.floor((- temp.camera.rotpos.position[1] + (temp.canvas.height * temp.shaders[0].zoom / 2) - e.pageY * temp.shaders[0].zoom) / 50.0);
      console.log((temp.canvas.width * temp.shaders[0].zoom / 2) - e.pageX * temp.shaders[0].zoom);
      console.log(posX);
      //console.log(temp.canvas.width * temp.shaders[0].zoom / 2);
      //temp.shaders[0].InstanceObject("verSprite.txt", new RotPos([(temp.canvas.width * temp.shaders[0].zoom / 2) - posX * zoom, (temp.canvas.height * temp.shaders[0].zoom / 2) - posY * zoom], undefined, [zoom, zoom]), physicsScene, tile);
      temp.shaders[0].InstanceObject("verSprite.txt", new RotPos([posX * 50.0, posY * 50.0], undefined, [50.0, 50.0]), physicsScene, tile);
      requestAnimationFrame(RenderLoop);
      
    }
  });
  
  document.addEventListener("mousemove", e => {
    if (isPaused === true) {
      return;
    }

    //highlight.rotpos.position[0] = e.pageX;
    //highlight.rotpos.position[1] = e.pageY;

    if (e.buttons === 1 && mode === MODES.MOVE) {
      temp.camera.rotpos.position[0] -= e.movementX * temp.shaders[0].zoom;
      temp.camera.rotpos.position[1] -= e.movementY * temp.shaders[0].zoom;

      console.log(temp.camera.rotpos.position);

      mat4.fromRotationTranslation(temp.shaders[0].viewMatrix, temp.camera.rotpos.rotation, temp.camera.rotpos.position);

      temp.gl.useProgram(temp.shaders[0].shaderProgram);
      temp.shaders[0].gl.uniformMatrix4fv(
        temp.shaders[0].programInfo.uniformLocations.uViewMatrix,
        false,
        temp.shaders[0].viewMatrix);

      requestAnimationFrame(RenderLoop);
    }

  });

  //Zooming
  document.addEventListener("wheel", e => {
    zoom += e.deltaY / 50;

    //Zoom cap
    if (zoom < 4) {
      zoom = 4;
    }

    temp.shaders[0].zoom = 50 / zoom;
    console.log(temp.shaders[0].zoom * temp.canvas.width);
    temp.shaders[0].RecalculateProjMatrix();

    temp.shaders[1].zoom = 50 / zoom;
    temp.shaders[1].RecalculateProjMatrix();

    requestAnimationFrame(RenderLoop);
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

    requestAnimationFrame(RenderLoop);
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
  