"use strict";
// // There should be some way for indentations to be uniform on vscode. Not sure how to do it now though
// TODO: Fix file.ts- the shader has way evolved the point of being able to be used in the current state
// import { FScreen } from "./screen.js";
// import { Camera, Shader } from "./shader.js";
// import { PhysicsScene, PhysicsObjec } from "./physics.js";
// import { Model, Objec, RotPos } from "./objec.js";
// import { quat, vec3 } from "gl-matrix";
Object.defineProperty(exports, "__esModule", { value: true });
// let terminal = document.getElementById("texty"); //Need a better system for built-in html ui sometime in the future
// let time = 0;
// let pointerLockActivation = 0;
// let isPaused = false;
// let rotX = 180;
// let rotY = 0;
// //let shaderFocus = 0;
// //let objectFocus = 0;
// //Gets the shader that the model belongs to from name. Assumes models have a one-to-one relation with shaders
// let models = {};
// let physicsScene = new PhysicsScene();
// let keysDown = {};
// const temp = new FScreen("canvas");
// LoadMap("osiris.txt");
// //Should only be called once per animation frame. Starts a loop of updating shaders.
// function RenderLoop(now) {
//   //Don't update if mouse pointer is not locked
//   if (document.pointerLockElement === null) {
//     requestAnimationFrame(RenderLoop);
//     return;
//   }
//   now *= 0.001;  // convert to seconds
//   const deltaTime = now - time;
//   time = now;
//   let activeShaders = temp.shaders;
//   if (activeShaders.length > 0) {
//     temp.gl.clear(temp.gl.COLOR_BUFFER_BIT | temp.gl.DEPTH_BUFFER_BIT); //Temporary solution
//   }
//   if (keysDown["Digit1"]) { //Look left
//     let _tempQ = quat.create();
//     quat.setAxisAngle(_tempQ, [0, 1, 0], 1 / 40);
//     quat.multiply(temp.shaders[0].objects[0].rotpos.rotation, _tempQ, temp.shaders[0].objects[0].rotpos.rotation);
//   }
//   if (keysDown["Digit3"]) { //Look up
//     let _tempQ = quat.create();
//     quat.setAxisAngle(_tempQ, temp.shaders[0].objects[0].rotpos.right, - 1 / 40);
//     quat.multiply(temp.shaders[0].objects[0].rotpos.rotation, _tempQ, temp.shaders[0].objects[0].rotpos.rotation);
//   }
//   let _vec = vec3.fromValues(Math.cos(rotX / 180), 10 * Math.sin(-rotY / 540), Math.sin(rotX / 180));
//   let _cameraRight = vec3.create();
//   let _cameraUp = vec3.fromValues(0.0, 1.0, 0.0);
//   vec3.cross(_cameraRight, _cameraUp, _vec);
//   vec3.normalize(_cameraRight, _cameraRight);
//   vec3.cross(_cameraUp, _vec, _cameraRight);
//   let movZ = ((keysDown["KeyW"] ? 1 : 0) - (keysDown["KeyS"] ? 1 : 0)) / 10;
//   let movVec = [movZ * _vec[0], 0.0, movZ * _vec[2]]; //Need to make this always have a constant length for consistent movement regardless of the y looking
//   vec3.add(_vec, _vec, temp.camera.rotpos.position);
//   vec3.add(temp.camera.rotpos.position, temp.camera.rotpos.position, movVec);
//   //let vec = temp.shaders[0].objects[0].rotpos.right;
//   //console.log(vec);
//   //if (vec[0] != temp.shaders[1].objects[0].objectData["ARRAY_BUFFER"]["aVertexPosition"][0][3] ||
//   //vec[1] != temp.shaders[1].objects[0].objectData["ARRAY_BUFFER"]["aVertexPosition"][0][4] ||
//   //vec[2] != temp.shaders[1].objects[0].objectData["ARRAY_BUFFER"]["aVertexPosition"][0][5]) {
//   //temp.shaders[1].objects[0].ModifyAttribute("aVertexPosition", 0, [0, 0, 0, 3 * vec[0], 3 * vec[1], 3 * vec[2]]);
//   //}
//   /*
//   let movZ = ((keysDown["KeyW"] ? 1 : 0) - (keysDown["KeyS"] ? 1 : 0)) / 10;
//   if (movZ != 0.0) {
//     changed = true;
//   }
//   let movVec = [movZ * temp.camera.rotpos.forward[0], 0.0, movZ * temp.camera.rotpos.forward[2]]; //Need to make this always have a constant length for consistent movement regardless of the y looking
//   vec3.add(temp.camera.rotpos.position, temp.camera.rotpos.position, movVec);*/
//   for (var i = 0; i < activeShaders.length; i++) {
//     if (activeShaders.length > 1) {
//       activeShaders[i].gl.useProgram(activeShaders[i].shaderProgram);
//     }
//     /*if (temp.shaders[i].objects.length === 0) { //This is a hack, remove it later
//       activeShaders[i].DrawScene();
//       continue;
//     }*/
//     /*if (i === shaderFocus) {
//       let movementVector = [0.0, 0.0, 0.0]
//       if (keysDown["KeyA"] === true) {
//         movementVector[0] += 0.3;
//       }
//       if (keysDown["KeyW"] === true) {
//         movementVector[2] += 0.3;
//       }
//       if (keysDown["KeyS"] === true) {
//         movementVector[2] -= 0.3;
//       }
//       if (keysDown["KeyD"] === true) {
//         movementVector[0] -= 0.3;
//       }
//       if (temp.shaders[i].objects[objectFocus].physics.enabled === true) {
//         temp.shaders[i].objects[objectFocus].physics.Move(movementVector);
//       } else {
//         vec3.add(temp.shaders[i].objects[objectFocus].rotpos.position, temp.shaders[i].objects[objectFocus].rotpos.position, movementVector);
//       }
//     }*/
//     /*
//     let _vec = vec3.fromValues(Math.cos(rotX / 180), 10 * Math.sin(-rotY / 540), Math.sin(rotX / 180)); //All this should be done on a mousemove event
//     let _cameraRight = vec3.create();
//     let _cameraUp = vec3.fromValues(0.0, 1.0, 0.0);
//     vec3.cross(_cameraRight, _cameraUp, _vec);
//     vec3.normalize(_cameraRight, _cameraRight);
//     vec3.cross(_cameraUp, _vec, _cameraRight);
//     vec3.add(_vec, _vec, activeShaders[i].rotpos.position);
//     mat4.lookAt(activeShaders[i].viewMatrix, activeShaders[i].rotpos.position, _vec, _cameraUp);
//     */
//     if (activeShaders[i].type == "3D") {
//       mat4.lookAt(activeShaders[i].viewMatrix, temp.camera.rotpos.position, _vec, _cameraUp);
//       activeShaders[i].gl.uniformMatrix4fv(
//         activeShaders[i].programInfo.uniformLocations.uViewMatrix,
//         false,
//         activeShaders[i].viewMatrix);
//     }
//     activeShaders[i].DrawScene();
//   }
//   if (isPaused === false) {
//     requestAnimationFrame(RenderLoop);
//   }
// }
// /*
// function MountModel(model, rotpos) {
//   temp.shaders[model.shaderId].CreateObject(new Objec(model.data, rotpos, physicsScene));
// }*/
// //Loads values from text files given by the url
// //TIDYING STATUS: GREEN
// async function LoadFileText(url) {
//   const retrievedText = await fetch(url);
//   const text = await retrievedText.text();
//   return text;
// }
// //Loads image from url
// //TIDYING STATUS: GREEN
// async function LoadImage(url) {
//   let val = new Promise((resolve, reject) => {
//     let img = new Image();
//     img.onload = () => resolve(img);
//     img.onerror = reject;
//     img.src = url;
//   });
//   return await val; //I'm not sure if this await is needed, i need to read more on promises
// }
// //Loads a shader from url data
// async function LoadShader(window, vsUrl, fsUrl) {
//   const vSource = await LoadFileText("Shaders/" + vsUrl);
//   const fSource = await LoadFileText("Shaders/" + fsUrl);
//   //Very hacky solution, to be fixed later
//   let type = "3D";
//   if (vsUrl == "spriteVertexShader.vs") {
//     type = "2D";
//   }
//   window.AddShader(vSource, fSource, type);
// }
// //Loads model from txt file
// async function LoadModel(url) {
//   let data = await LoadFileText("Models/" + url);
//   let stringAttributes = data.split("\r\n\r\n"); //Splitting based on two enters. Is this good? i dunno right now, but it is what it is
//   let obj = { "ARRAY_BUFFER": {} };
//   for (var i = 0; i < stringAttributes.length; i++) {
//     stringAttributes[i] = stringAttributes[i].replace(/\r\n/g, ""); //Replaces all newlines and enters. Not sure if good, but right now it works
//     stringAttributes[i] = stringAttributes[i].replace(/ /g, "");
//     stringAttributes[i] = stringAttributes[i].split(",");
//     let name = stringAttributes[i][0];
//     stringAttributes[i].splice(0, 1);
//     let len = 3;
//     if (name == "TEXTURE") {
//       obj["TEXTURE"] = await LoadImage("Textures/" + stringAttributes[i][0]);
//       continue;
//     } else if (name != "ELEMENT_ARRAY_BUFFER") {
//       len = parseInt(stringAttributes[i][0]);
//       stringAttributes[i].splice(0, 1);
//     }
//     //console.log(stringAttributes[i]);
//     for (var j = 0; j < stringAttributes[i].length; j++) {
//       stringAttributes[i][j] = parseFloat(stringAttributes[i][j]);
//     }
//     //console.log(name);
//     if (name == "ELEMENT_ARRAY_BUFFER") {
//       obj["ELEMENT_ARRAY_BUFFER"] = [stringAttributes[i]];
//     } else {
//       obj["ARRAY_BUFFER"][name] = [stringAttributes[i], len, len * 4, 0];
//     }
//   }
//   return obj;
// }
// async function LoadMap(url) { //No validation on the file yet, but that can be changed later. It'll probably be really tedious anyway
//   let data = await LoadFileText(url);
//   let rawStringAttributes = data.split("\r\n");
//   let stringAttributes = [];
//   //What does this generate?
//   //Splits data by line, then splits lines by colons, then splits sublines by commas
//   let skipped = 0;
//   for (let i = 0; i < rawStringAttributes.length; i++) {
//     //console.log(rawStringAttributes[i]);
//     if (rawStringAttributes[i] == "") {
//       skipped++;
//       continue;
//     }
//     stringAttributes[i - skipped] = rawStringAttributes[i].replaceAll(" ", "");
//     stringAttributes[i - skipped] = stringAttributes[i - skipped].split(":");
//     for (let j = 0; j < stringAttributes[i - skipped].length; j++) {
//       stringAttributes[i - skipped][j] = stringAttributes[i - skipped][j].split(",");
//       if (stringAttributes[i - skipped][j].length == 1) {
//         stringAttributes[i - skipped][j] = stringAttributes[i - skipped][j][0];
//       }
//     }
//   }
//   //console.log(stringAttributes);
//   //Load all shaders
//   let shaderCount = parseInt(stringAttributes[0][0]);
//   for (let i = 0; i < shaderCount; i++) {
//     await LoadShader(temp, stringAttributes[i + 1][0][0], stringAttributes[i + 1][0][1]);
//   }
//   //Load all unique models
//   let modelCount = parseInt(stringAttributes[shaderCount + 1][0]);
//   //console.log(modelCount);
//   for (let i = 0; i < modelCount; i++) {
//     const url = stringAttributes[shaderCount + i + 2][0];
//     let modelData = await LoadModel(url);
//     //console.log(modelData);
//     //modelData = await LoadWireframeModel(url);
//     //console.log(modelData);
//     if (shaderCount === 1) { //If there's only one shader, there's no need to specify which shader we're using
//       temp.shaders[0].CreateModel(url, modelData);
//       models[url] = 0
//     } else {
//       temp.shaders[stringAttributes[shaderCount + i + 2][1] - 1].CreateModel(url, modelData);
//       models[url] = stringAttributes[shaderCount + i + 2][1] - 1;
//     }
//   }
//   //console.log(models);
//   //Instantiate all objects
//   for (let i = shaderCount + modelCount + 2; i < stringAttributes.length; i++) {
//     let position = undefined;
//     let rotation = undefined;
//     let scale = undefined;
//     if (stringAttributes[i][1] != "") {
//       if (stringAttributes[i][1].length === 3) {
//         position = [parseFloat(stringAttributes[i][1][0]), parseFloat(stringAttributes[i][1][1]), parseFloat(stringAttributes[i][1][2])];
//       } else {
//         position = [parseFloat(stringAttributes[i][1][0]), parseFloat(stringAttributes[i][1][1])];
//       }
//     }
//     if (stringAttributes[i][2] != "") {
//       rotation = [parseFloat(stringAttributes[i][2][0]), parseFloat(stringAttributes[i][2][1]), parseFloat(stringAttributes[i][2][2])];
//     }
//     if (stringAttributes[i][3] != "") {
//       scale = [parseFloat(stringAttributes[i][3][0]), parseFloat(stringAttributes[i][3][1]), parseFloat(stringAttributes[i][3][2])];
//     }
//     //console.log(models[stringAttributes[i][0]].shaderId);
//     //fugly
//     //temp.shaders[models[stringAttributes[i][0]].shaderId - 1].CreateObject(new Objec(models[stringAttributes[i][0]].modelData, new RotPos(position, rotation, scale), physicsScene)); //Need to make this able to switch up shaders
//     //console.log(stringAttributes[i][0]);
//     //temp.shaders[models[stringAttributes[i][0]]].InstanceObject(stringAttributes[i][0], new Objec(models[stringAttributes[i][0]].modelData, new RotPos(position, rotation, scale), physicsScene));
//     //temp.shaders[models[stringAttributes[i][0]]].InstanceObject(stringAttributes[i][0], new Objec(temp.shaders[models[stringAttributes[i][0]]].models[stringAttributes[i][0]].modelData, new RotPos(position, rotation, scale), physicsScene));
//     ZoopObjec(stringAttributes[i][0], new RotPos(position, rotation, scale), physicsScene);
//   }
//   requestAnimationFrame(RenderLoop);
// }
// //Zoop means 'create', just changed for namespace reasons
// function ZoopObjec(url, rotpos, physicsScene) {
//   let shaderNum = models[url];
//   temp.shaders[shaderNum].InstanceObject(url, rotpos, physicsScene);
// }
// //What's the difference between window.addeventlistener and document.addeventlistener?
// canvas.addEventListener("click", function (e) {
//   if (document.pointerLockElement === null) { //Might need to add mozPointerLock, whatever that is
//     const now = performance.now();
//     if (now - pointerLockActivation > 2500) { //I wouldn't consider this a good solution, but it seems to be the only one that removes a DOMerror
//       temp.canvas.requestPointerLock = temp.canvas.requestPointerLock || temp.canvas.mozRequestPointerLock; //Do I need to do this every time?
//       temp.canvas.requestPointerLock();
//       pointerLockActivation = now;
//     }
//   }
// });
// //Sets the keysDown and the keysUp, means smoother movement
// window.addEventListener("keyup", e => {
//   if (isPaused === true) {
//     return;
//   }
//   keysDown[e.code] = false;
// });
// window.addEventListener("keydown", e => {
//   //If paused, we only want to compile the console
//   if (isPaused === true) {
//     if (e.code === "KeyC" && document.pointerLockElement != null) {
//       temp.shaders[0].ReplaceVertexShader(terminal.value);
//     }
//     return;
//   }
//   //Set what keys are being currently held down
//   keysDown[e.code] = true;
//   //Toggle fullscreen on enter
//   if (e.key === "Enter") {
//     toggleFullScreen();
//     return;
//   }
//   //Open terminal on '`'
//   if (e.key === "`") {
//     isPaused = !isPaused
//     if (isPaused === false) {
//       //Unpause the game
//       terminal.hidden = true;
//       requestAnimationFrame(RenderLoop);
//     } else {
//       terminal.hidden = false;
//     }
//     return;
//   }
//   /*
//   //Create new object at origin on 'C'
//   if (e.code === "KeyC") {
//     temp.shaders[0].CreateObject(new Objec(models["lineObject.txt"].modelData, new RotPos([0.0, 0.0, 0.0]), physicsScene));
//     return;
//   }
//   //Swap the focus on object on 'X'
//   if (e.code === "KeyX") {
//     objectFocus += 1;
//     if (objectFocus >= temp.shaders[0].objects.length) {
//       objectFocus = 0;
//     }
//     return;
//   }
//   //Disable physics on 'Z'
//   if (e.code === "KeyZ") {
//     if (temp.shaders[0].objects[objectFocus].physics.enabled === false) {
//       temp.shaders[0].objects[objectFocus].physics.enabled = true;
//     } else {
//       temp.shaders[0].objects[objectFocus].physics.enabled = false;
//     }
//     return;
//   }
//   //Delete currently focussed object on 'V'
//   if (e.code === "KeyV") {
//     temp.shaders[0].RemoveObject(objectFocus);
//     if (objectFocus >= temp.shaders[0].objects.length) {
//       objectFocus = 0;
//     }
//     return;
//   }
//   //Switch object shaders
//   if (e.code === "KeyB") {
//     shaderFocus += 1;
//     if (shaderFocus >= temp.shaders.length) {
//       shaderFocus = 0;
//     }
//     return;
//   }*/
// });
// document.addEventListener("mousemove", e => {
//   if (document.pointerLockElement === null || isPaused === true) {
//     return;
//   }
//   rotX += e.movementX;
//   rotY += e.movementY;
// });
// //Resizing for the window. What's the difference between "resize" and "onresize"?
// window.addEventListener("resize", e => {
//   for (let i = 0; i < temp.shaders.length; i++) {
//     temp.shaders[i].gl.viewport(0, 0, temp.canvas.width, temp.canvas.height);
//     temp.shaders[i].aspectRatio = temp.canvas.width / temp.canvas.height;
//     temp.shaders[i].RecalculateProjMatrix();
//   }
// });
// //Toggles fullscreen
// function toggleFullScreen() {
//   if (!document.fullscreenElement) {
//     document.documentElement.requestFullscreen();
//   } else {
//     if (document.exitFullscreen) {
//       document.exitFullscreen();
//     }
//   }
// }
