"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const screen_js_1 = require("./screen.js");
const physics_js_1 = require("./physics.js");
const loading_js_1 = require("./loading.js");
const objec_js_1 = require("./objec.js");
const ui_js_1 = require("./ui.js");
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
let physicsScene = new physics_js_1.PhysicsScene();
let textures;
let textureData = [];
let font = {}; //Think of a faster way to look up fonts later
//Set up new screen that takes up the entire space
const temp = new screen_js_1.FScreen("canvas");
let cam = temp.AddCamera([0.0, 0.0], [1.0, 1.0], "2D", 0);
cam.PreDraw();
Setup();
async function Setup() {
    //Load shaders for the 2d camera
    await (0, loading_js_1.LoadShader)(cam, "2DspriteVertexShader.vs", "spriteFragmentShader.fs");
    //This texture stuff should be cleaned up
    textures = await (0, loading_js_1.LoadFileText)("../textures.txt");
    textures = textures.split("\n");
    for (let i = 0; i < textures.length; i++) {
        await (0, loading_js_1.CreateTexture)(temp, textures[i] + ".png");
        let rawMetadata = await (0, loading_js_1.LoadFileText)("Textures/" + textures[i] + ".json");
        let jsonMetadata = JSON.parse(rawMetadata);
        textureData.push(jsonMetadata);
    }
    let modelData = await (0, loading_js_1.LoadModel)(temp, "verSprite.json");
    temp.shaders[0].CreateModel("verSprite.json", modelData);
    temp.shaders[0].InstanceObject("verSprite.json", new objec_js_1.RotPos([0.0, 0.0, 0.0], Math.PI, [25.0, 25.0]), physicsScene, 0);
    //Map loading
    const rawMap = await (0, loading_js_1.LoadFileText)("map.txt");
    const map = rawMap.split("\n");
    for (let i = 0; i < map.length; i++) {
        let line = map[i].split("");
        for (let j = 0; j < line.length; j++) {
            if (line[j] != " ") {
                temp.shaders[0].InstanceObject("verSprite.json", new objec_js_1.RotPos([i * 50.0 - 2500.0, j * 50.0 - 2500.0, textureData[line[j]].layer], Math.PI, [25.0, 25.0]), physicsScene, 0, textures[line[j]] + ".png");
                tiles[i - 50][j - 50] = line[j];
            }
        }
    }
    await (0, loading_js_1.LoadShader)(cam, "UIVertexShader.vs", "spriteFragmentShader.fs");
    temp.shaders[1].CreateModel("verSprite.json", modelData);
    await (0, loading_js_1.CreateTexture)(temp, "black.png");
    await (0, loading_js_1.CreateTexture)(temp, "white.png");
    await (0, loading_js_1.CreateTexture)(temp, "def.png");
    font = new ui_js_1.Font("def.png", JSON.parse(await (0, loading_js_1.LoadFileText)("Textures/def.json")));
    (0, ui_js_1.DisplayBox)(cam, temp.shaders[1], [0.8, 0.4], physicsScene);
    // font.CreateSentence(temp.shaders[1], physicsScene, 400.0, -100.0, "* HELLO CONOR!");
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
    const playerPos = temp.shaders[0].models["verSprite.json"].objects[0].rotpos;
    // Rules of collisions for now:
    // The lines of the grid (50 apart) do not count as any collision territory.
    if (movX != 0.0 || movY != 0.0) {
        //Step 1: Check if movX will go through, and perform it if so
        let _x = Math.round((playerPos.position[0] + movX + 25) / 50);
        let _y = Math.round((playerPos.position[1] + 25) / 50);
        if (movX > 0.0) {
            if (textureData[tiles[_x][_y]] != undefined) {
                movX = (textureData[tiles[_x][_y]].collider === 'true') ? 0.0 : movX;
            }
            if (textureData[tiles[_x][_y - 1]] != undefined && movX != 0.0) {
                movX = (textureData[tiles[_x][_y - 1]].collider === 'true') ? 0.0 : movX;
            }
        }
        if (movX < 0.0) {
            if (textureData[tiles[_x - 1][_y]] != undefined) {
                movX = (textureData[tiles[_x - 1][_y]].collider === 'true') ? 0.0 : movX;
            }
            if (textureData[tiles[_x - 1][_y - 1]] != undefined && movX != 0.0) {
                movX = (textureData[tiles[_x - 1][_y - 1]].collider === 'true') ? 0.0 : movX;
            }
        }
        //Step 2: Check if movY will go through, and perform it if so
        _x = Math.round((playerPos.position[0] + movX + 25) / 50);
        _y = Math.round((playerPos.position[1] + movY + 25) / 50);
        if (movY > 0.0) {
            if (textureData[tiles[_x][_y]] != undefined) {
                movY = (textureData[tiles[_x][_y]].collider === 'true') ? 0.0 : movY;
            }
            if (textureData[tiles[_x - 1][_y]] != undefined && movY != 0.0) {
                movY = (textureData[tiles[_x - 1][_y]].collider === 'true') ? 0.0 : movY;
            }
        }
        if (movY < 0.0) {
            if (textureData[tiles[_x][_y - 1]] != undefined) {
                movY = (textureData[tiles[_x][_y - 1]].collider === 'true') ? 0.0 : movY;
            }
            if (textureData[tiles[_x - 1][_y - 1]] != undefined && movY != 0.0) {
                movY = (textureData[tiles[_x - 1][_y - 1]].collider === 'true') ? 0.0 : movY;
            }
        }
        cam.rotpos.position[0] -= movX;
        cam.rotpos.position[1] -= movY;
        playerPos.position[0] += movX; //Why subtraction??
        playerPos.position[1] += movY;
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
    }
    else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        }
    }
}
