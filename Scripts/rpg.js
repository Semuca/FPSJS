import {Screen} from "./shader.js";
import {PhysicsScene} from "./physics.js";
import {LoadFileText, CreateTexture, LoadModel, LoadShader} from "./loading.js";
import {RotPos} from "./objec.js";

let zoom = 50.0;
let time = 0;

let tile = 0;
let tiles = {};
for (let index = -50; index <= 50; index++) {
  tiles[index] = {};
}

let sprites;

let keysDown = {};

//Gets the shader that the model belongs to from name. Assumes models have a one-to-one relation with shaders
let models = {};
let physicsScene = new PhysicsScene();
let textures;
let textureData = [];

let font = {}; //Think of a faster way to look up fonts later

//Set up new screen that takes up the entire space
const temp = new Screen("canvas");
let cam = temp.AddCamera([0.0, 0.0], [1.0, 1.0], "2D", 0);
cam.PreDraw();

Setup();

async function Setup() {
  //Load shaders for the 2d camera
  await LoadShader(temp, cam, "2DspriteVertexShader.vs", "spriteFragmentShader.fs");

  //This texture stuff should be cleaned up
  textures = await LoadFileText("textures.txt");
  textures = textures.split("\r\n");
  for (let i = 0; i < textures.length; i++) {
    await CreateTexture(temp, textures[i] + ".png");
    let rawMetadata = await LoadFileText("Textures/" + textures[i] + ".txt");
    rawMetadata = rawMetadata.split("\r\n");
    let metadata = {};
    for (let j = 0; j < rawMetadata.length; j++) {
      rawMetadata[j] = rawMetadata[j].replaceAll(" ", "");
      rawMetadata[j] = rawMetadata[j].split(":");
      metadata[rawMetadata[j][0]] = rawMetadata[j][1];
    }
    textureData.push(metadata);
  }
  
  let modelData = await LoadModel("verSprite.txt", temp);
  temp.shaders[0].CreateModel("verSprite.txt", modelData);
  temp.shaders[0].InstanceObject("verSprite.txt", new RotPos([0.0, 0.0, 0.0], Math.PI, [25.0, 25.0]), physicsScene, 0);

  //Map loading
  let map = await LoadFileText("map.txt");
  map = map.split("\r\n");
  for (let i = 0; i < map.length; i++) {
    let line = map[i].split("");
    for (let j = 0; j < line.length; j++) {
      if (line[j] != " ") {
        temp.shaders[0].InstanceObject("verSprite.txt", new RotPos([i * 50.0 - 2500.0, j * 50.0 - 2500.0, textureData[line[j]].layer], Math.PI, [25.0, 25.0]), physicsScene, 0, textures[line[j]] + ".png");
        tiles[i - 50][j - 50] = line[j];
      }
      
    }
  }

  await LoadShader(temp, cam, "UIVertexShader.vs", "spriteFragmentShader.fs");
  temp.shaders[1].CreateModel("verSprite.txt", modelData);

  await CreateTexture(temp, "def.png");
  let _as = await LoadFileText("Textures/def.txt");
  _as = _as.split("\r\n");
  for (let i = 0; i < _as.length; i++) {
    let line = _as[i].split("chars:", 2);
    font["chars"] = line[1];
  }

  CreateSentence(0.0, 100.0, "* HELLO WORLD!");

  requestAnimationFrame(Render);
  Tick();
}

function Tick() {

  //Change movement based on keys currently pressed down
  let movX = 0.0;
  let movY = 0.0;
  if (keysDown["KeyW"] === true) {
    movY += 10.0;
  }
  if (keysDown["KeyA"] === true) {
    movX += 10.0;
  }
  if (keysDown["KeyS"] === true) {
    movY -= 10.0;
  }
  if (keysDown["KeyD"] === true) {
    movX -= 10.0;
  }

  if (movX != 0.0 || movY != 0.0) {
    let _up = Math.round((temp.shaders[0].models["verSprite.txt"].objects[0].rotpos.position[1] + movY) / 50 + 0.4); //Temporary solution, revisit this later
    let _right = Math.round((temp.shaders[0].models["verSprite.txt"].objects[0].rotpos.position[0] + movX) / 50 + 0.4);
    let _left = Math.round((temp.shaders[0].models["verSprite.txt"].objects[0].rotpos.position[0] + movX) / 50 - 0.4);
    let _down = Math.round((temp.shaders[0].models["verSprite.txt"].objects[0].rotpos.position[1] + movY) / 50 - 0.4);

    let _x = Math.round((temp.shaders[0].models["verSprite.txt"].objects[0].rotpos.position[0] + movX) / 50);
    let _y = Math.round((temp.shaders[0].models["verSprite.txt"].objects[0].rotpos.position[1] + movY) / 50);
    
    if (textureData[tiles[_x][_up]] != undefined) { //This clips corners, but for now it works
      movY = (textureData[tiles[_x][_up]].collider === "true") ? 0.0 : movY;
    }
    if (textureData[tiles[_x][_down]] != undefined) {
      movY = (textureData[tiles[_x][_down]].collider === "true") ? 0.0 : movY;
    }
    if (textureData[tiles[_right][_y]] != undefined) {
      movX = (textureData[tiles[_right][_y]].collider === "true") ? 0.0 : movX;
    }
    if (textureData[tiles[_left][_y]] != undefined) {
      movX = (textureData[tiles[_left][_y]].collider === "true") ? 0.0 : movX;
    }
    

    cam.rotpos.position[0] -= movX;
    cam.rotpos.position[1] -= movY;

    temp.shaders[0].models["verSprite.txt"].objects[0].rotpos.position[0] += movX; //Why subtraction??
    temp.shaders[0].models["verSprite.txt"].objects[0].rotpos.position[1] += movY;

    cam.UpdatePos();
    requestAnimationFrame(Render);
  }

  setTimeout(Tick, 10);
}

//Should only be called once per animation frame. Starts a loop of updating shaders.
function Render(now) {
  //now *= 0.001;  // convert to seconds
  //const deltaTime = now - time;
  //time = now;

  //Clear before drawing
  temp.gl.clear(temp.gl.COLOR_BUFFER_BIT | temp.gl.DEPTH_BUFFER_BIT);
  
  //Draws sprites
  temp.shaders[0].DrawScene(0);
  temp.shaders[1].DrawScene(0);
}

function CreateSentence(posX, posY, sentence) {
  //temp.shaders[1].InstanceObject("verSprite.txt", new RotPos([0.0, 100.0, 0.0], Math.PI, [25.0, 25.0]), physicsScene, 0, "def.bmp");
  let numCode = 0;
  //temp.shaders[1].models["verSprite.txt"].ModifyAttribute("aTextureCoord", [(numCode % 8) / 8, (Math.floor(numCode / 8) + 1) / 8, ((numCode % 8) + 1) / 8, Math.floor(numCode / 8) / 8, (numCode % 8) / 8, Math.floor(numCode / 8) / 8, ((numCode % 8) + 1) / 8, (Math.floor(numCode / 8) + 1) / 8]);

  for (let i = 0; i < sentence.length; i++) {
    for (let j = 0; j < font["chars"].length; j++) { //Has to be a faster way to do this
      if (font["chars"][j] === sentence[i]) {
        numCode = j;
        break;
      }
    }
    temp.shaders[1].InstanceObject("verSprite.txt", new RotPos([posX - i * 50.0, posY, 0.0], Math.PI, [25.0, 25.0]), physicsScene, 0, "def.png"); //Should position be given in relative coords? (i.e from 0 to 100%?)
    temp.shaders[1].models["verSprite.txt"].objects[temp.shaders[1].models["verSprite.txt"].objects.length - 1].texAttributes = [(numCode % 8) / 8, (Math.floor(numCode / 8) + 1) / 8, ((numCode % 8) + 1) / 8, Math.floor(numCode / 8) / 8, (numCode % 8) / 8, Math.floor(numCode / 8) / 8, ((numCode % 8) + 1) / 8, (Math.floor(numCode / 8) + 1) / 8];
  }
}

//Sets the keysDown and the keysUp, means smoother movement
window.addEventListener("keyup", e => {
  keysDown[e.code] = false;
});

//Should use keycodes or just key? to research
window.addEventListener("keydown", e => {

    //Set what keys are being currently held down
    keysDown[e.code] = true;
  
    //Toggle fullscreen on enter
    if (e.code === "Enter") {
      toggleFullScreen();
      return;
    }

});
  
  //Resizing for the window. What's the difference between "resize" and "onresize"?
  window.addEventListener("resize", e => {
    temp.canvas.width = temp.canvas.clientWidth;
    temp.canvas.height = temp.canvas.clientHeight;

    for (let i = 0; i < temp.cameras.length; i++) {
      temp.cameras[i].pxWidth = temp.canvas.width * temp.cameras[i].width;
      temp.cameras[i].pxHeight = temp.canvas.height * temp.cameras[i].height;
      temp.cameras[i].aspectRatio = temp.cameras[i].pxWidth / temp.cameras[i].pxHeight;
      temp.cameras[i].RecalculateProjMatrix();
    }

    cam.PreDraw();
    requestAnimationFrame(Render);
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
  