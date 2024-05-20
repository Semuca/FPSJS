import { RotPos } from "./objec.js";

//Loads values from text files given by the url
export async function LoadFileText(url) {
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
    let tex = await LoadImage("textures/" + url);
    return window.SetupTexture(url, tex);
  }
}

//Loads a shader from url data
export async function LoadShader(window, cam, vsUrl, fsUrl) {
  const vSource = await LoadFileText("shaders/" + vsUrl);
  const fSource = await LoadFileText("shaders/" + fsUrl);

  //Hacky solution, to be fixed at some point
  let type = "3D";
  if (vsUrl.substring(0, 2) == "2D") {
    type = "2D";
  }
  window.AddShader(cam, vSource, fSource, type);
}

//Loads model from txt file
export async function LoadModel(url, window) {
  const data = await LoadFileText("models/" + url);
  const jsonData = JSON.parse(data);

  const arrayBuffer = jsonData['ARRAY_BUFFER']
  const keys = Object.keys(arrayBuffer);
  keys.forEach((key) => {
    const len = arrayBuffer[key][0].length;
    arrayBuffer[key] = [arrayBuffer[key].flat(), len, len * 4, 0]; // Todo: Store metadata about the array in the object
  });

  if (jsonData['ELEMENT_ARRAY_BUFFER']) {
    jsonData['ELEMENT_ARRAY_BUFFER'] = jsonData['ELEMENT_ARRAY_BUFFER'].flat();
  }

  if (jsonData['TEXTURE']) {
    jsonData['TEXTURE'] = await CreateTexture(window, jsonData['TEXTURE']);
  }

  return jsonData;
}

// Creates a map file
export async function LoadMap(window, url, physicsScene, renderLoop) {
  const data = await LoadFileText(url);
  const jsonData = JSON.parse(data);

  // Loads all shaders
  await Promise.all(jsonData.shaders.map((shader) => LoadShader(window, window.cameras[0], shader.vertexShader, shader.fragmentShader)));

  // Loads all models
  const modelsToShaderIndex = {};
  await Promise.all(Object.entries(jsonData.models).map(async ([model, shaderIndex]) => {
    const modelData = await LoadModel(model, window);
    window.shaders[shaderIndex].CreateModel(model, modelData);
    modelsToShaderIndex[model] = shaderIndex;
  }));

  jsonData.objects.forEach(async (object) => {
    if (!Object.keys(window.texIds).includes(object.texture)) {
      await CreateTexture(window, object.texture);
    }

    InstantiateObjec(window.shaders[modelsToShaderIndex[object.object]], object.object, new RotPos(object.position, object.rotation, object.scale), physicsScene, object.texture, object.tags ?? []);
  });

  requestAnimationFrame(renderLoop);
}

function InstantiateObjec(shader, url, rotpos, physicsScene, texName) {
  shader.InstanceObject(url, rotpos, physicsScene, 0, texName);
}