// There should be some way for indentations to be uniform on vscode. Not sure how to do it now though

import {Window, Camera, Shader} from "./shader.js";
import {PhysicsScene, PhysicsObjec} from "./physics.js";
import {Model, Objec, RotPos} from "./objec.js";

//Loads values from text files given by the url
//TIDYING STATUS: GREEN
async function LoadFileText(url) {
  const retrievedText = await fetch(url);
  const text = await retrievedText.text();
  return text;
}

//Loads image from url
async function LoadImage(url) {
  let val = new Promise((resolve, reject) => {
    let img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
  return await val; //I'm not sure if this await is needed, i need to read more on promises
}

//Should create more functions for textures:
//  - Got loading texture as variable from url
//  - This is loading texture into shader from url
//  - Might be worth making loading texture into shader from variable
export async function CreateTexture(window, url) {
  //Check if texture already exists
  let texIds = Object.keys(window.texIds);
  let exists = false;
  for (let i = 0; i < texIds.length; i++) {
    if (url === window.texIds[texIds[i]]) {
      exists = true;
      return window.texIds[texIds[i]];
    }
  }

  if (exists === false) {
    let tex = await LoadImage("Textures/" + url);
    return window.SetupTexture(url, tex);
  }
}

//Loads a shader from url data
export async function LoadShader(window, vsUrl, fsUrl) {
  const vSource = await LoadFileText("Shaders/" + vsUrl);
  const fSource = await LoadFileText("Shaders/" + fsUrl);

  //Hacky solution, to be fixed at some point
  let type = "3D";
  if (vsUrl.substring(0, 2) == "2D") {
    type = "2D";
  }
  window.AddShader(vSource, fSource, type);
}

//Loads model from txt file
export async function LoadModel(url, window) {
  let data = await LoadFileText("Models/" + url);
  let stringAttributes = data.split("\r\n\r\n"); //Splitting based on two enters. Is this good? i dunno right now, but it is what it is

  let obj = { "ARRAY_BUFFER" : {} };

  for (var i = 0; i < stringAttributes.length; i++) {
    stringAttributes[i] = stringAttributes[i].replace(/\r\n/g, ""); //Replaces all newlines and enters. Not sure if good, but right now it works
    stringAttributes[i] = stringAttributes[i].replace(/ /g, "");
    stringAttributes[i] = stringAttributes[i].split(",");
  
    let name = stringAttributes[i][0];
    stringAttributes[i].splice(0, 1);

    let len = 3;
    if (name == "TEXTURE") {

      obj["TEXTURE"] = await CreateTexture(window, stringAttributes[i][0]);

      //obj["TEXTURE"] = await LoadImage("Textures/" + stringAttributes[i][0]);
      continue;
    } else if (name != "ELEMENT_ARRAY_BUFFER") {
      len = parseInt(stringAttributes[i][0]);
      stringAttributes[i].splice(0, 1);
    }

    //console.log(stringAttributes[i]);
    for (var j = 0; j < stringAttributes[i].length; j++) {
      stringAttributes[i][j] = parseFloat(stringAttributes[i][j]);
    }

    //console.log(name);
    if (name == "ELEMENT_ARRAY_BUFFER") {
      obj["ELEMENT_ARRAY_BUFFER"] = [stringAttributes[i]];
    } else {
      obj["ARRAY_BUFFER"][name] = [stringAttributes[i], len, len * 4, 0];
    }
  }

  return obj;
}

//Really crap way of doing this, but javascript doesn't allow any other way
export async function LoadMap(window, models, url, physicsScene, renderLoop) { //No validation on the file yet, but that can be changed later. It'll probably be really tedious anyway
  let data = await LoadFileText(url);
  let rawStringAttributes = data.split("\r\n");
  let stringAttributes = [];


  //What does this generate?
  //Splits data by line, then splits lines by colons, then splits sublines by commas
  let skipped = 0;
  for (let i = 0; i < rawStringAttributes.length; i++) {
    //console.log(rawStringAttributes[i]);
    if (rawStringAttributes[i] == "") {
      skipped++;
      continue;
    }

    stringAttributes[i - skipped] = rawStringAttributes[i].replaceAll(" ", "");
    stringAttributes[i - skipped] = stringAttributes[i - skipped].split(":");

    for (let j = 0; j < stringAttributes[i - skipped].length; j++) {
      stringAttributes[i - skipped][j] = stringAttributes[i - skipped][j].split(",");
      if (stringAttributes[i - skipped][j].length == 1) {
        stringAttributes[i - skipped][j] = stringAttributes[i - skipped][j][0];
      }
    }
  }

  //console.log(stringAttributes);



  //Load all shaders
  let shaderCount = parseInt(stringAttributes[0][0]);

  for (let i = 0; i < shaderCount; i++) {
    await LoadShader(window, stringAttributes[i + 1][0][0], stringAttributes[i + 1][0][1]);
  }



  //Load all unique models
  let modelCount = parseInt(stringAttributes[shaderCount + 1][0]);
  //console.log(modelCount);

  for (let i = 0; i < modelCount; i++) {
    const url = stringAttributes[shaderCount + i + 2][0];
    let modelData = await LoadModel(url, window);
    //console.log(modelData);
    //modelData = await LoadWireframeModel(url);
    //console.log(modelData);

    if (shaderCount === 1) { //If there's only one shader, there's no need to specify which shader we're using
      window.shaders[0].CreateModel(url, modelData);
      models[url] = 0
    } else {
      window.shaders[stringAttributes[shaderCount + i + 2][1] - 1].CreateModel(url, modelData);
      models[url] = stringAttributes[shaderCount + i + 2][1] - 1;
    }
  }

  //console.log(models);


  //Instantiate all objects
  for (let i = shaderCount + modelCount + 2; i < stringAttributes.length; i++) {
    console.log(stringAttributes[i]);
    let position = undefined;
    let rotation = undefined;
    let scale = undefined;
    if (stringAttributes[i][1] != "") {
      if (stringAttributes[i][1].length === 3) {
        position = [parseFloat(stringAttributes[i][1][0]), parseFloat(stringAttributes[i][1][1]), parseFloat(stringAttributes[i][1][2])];
      } else {
        position = [parseFloat(stringAttributes[i][1][0]), parseFloat(stringAttributes[i][1][1])];
      }
    }

    if (stringAttributes[i][2] != "") {
      rotation = [parseFloat(stringAttributes[i][2][0]), parseFloat(stringAttributes[i][2][1]), parseFloat(stringAttributes[i][2][2])];
    }

    if (stringAttributes[i][3] != "") {
      scale = [parseFloat(stringAttributes[i][3][0]), parseFloat(stringAttributes[i][3][1]), parseFloat(stringAttributes[i][3][2])];
    }

    ZoopObjec(window, models, stringAttributes[i][0], new RotPos(position, rotation, scale), physicsScene);
  }

  requestAnimationFrame(renderLoop);
}

//Zoop means 'create', just changed for namespace reasons
function ZoopObjec(window, models, url, rotpos, physicsScene) {
  let shaderNum = models[url];
  window.shaders[shaderNum].InstanceObject(url, rotpos, physicsScene);
}