import { Objec, RotPos } from "./objec.js";
import { PhysicsScene } from "./physics.js";
import { FScreen } from "./screen.js";
import { Camera } from "./shader.js";

//Loads values from text files given by the url
export async function LoadFileText(url: string): Promise<string> {
  const retrievedText = await fetch(url);
  const text = await retrievedText.text();
  return text;
}

//Loads image from url
async function LoadImage(url: string) : Promise<TexImageSource> {
  const val = new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
  return await val as TexImageSource;
}

//Should create more functions for textures:
//  - Got loading texture as variable from url
//  - This is loading texture into shader from url
//  - Might be worth making loading texture into shader from variable
export async function CreateTexture(window: FScreen, url: string): Promise<number> {
  // Check if texture already exists
  const foundTexture = Object.keys(window.texIds).find((key) => key === url);
  if (foundTexture) return window.texIds[foundTexture];

  // Load texture
  const tex = await LoadImage(`textures/${url}`);
  return window.SetupTexture(url, tex);
}

//Loads a shader from url data
export async function LoadShader(camera: Camera, vsUrl: string, fsUrl: string): Promise<void> {
  const vSource = await LoadFileText(`shaders/${vsUrl}`);
  const fSource = await LoadFileText(`shaders/${fsUrl}`);

  //Hacky solution, to be fixed at some point
  const type = vsUrl.substring(0, 2) === "2D" ? "2D" : "3D";
  camera.window.AddShader(camera, vSource, fSource, type);
}

//Loads model from txt file
export async function LoadModel(window: FScreen, url: string): Promise<any> {
  const data = await LoadFileText(`models/${url}`);
  const jsonData = JSON.parse(data);

  const arrayBuffer = jsonData['ARRAY_BUFFER']
  Object.keys(arrayBuffer).forEach((key) => {
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

export type Map = {
  shaders: { vertexShader: string, fragmentShader: string }[],
  models: Record<string, number>,
  objects: { object: string, position: number[], rotation: number[], scale: number[], texture?: string, tags?: string[] }[]
};

// Creates a map file
export async function LoadMap(window: FScreen, url: string, physicsScene: PhysicsScene, renderLoop: FrameRequestCallback, callbackFunctions: Record<string, (screen: FScreen, object: Objec) => void>) {
  const data = await LoadFileText(url);
  const jsonData = JSON.parse(data) as Map;

  // Loads all shaders
  await Promise.all(jsonData.shaders.map((shader, index) => LoadShader(window.cameras[index], shader.vertexShader, shader.fragmentShader)));

  // Loads all models
  const modelsToShaderIndex = {};
  await Promise.all(Object.entries(jsonData.models).map(async ([model, shaderIndex]) => {
    const modelData = await LoadModel(window, model);
    window.shaders[shaderIndex].CreateModel(model, modelData);
    modelsToShaderIndex[model] = shaderIndex;
  }));

  jsonData.objects.forEach(async (object) => {
    if (object.texture && !Object.keys(window.texIds).includes(object.texture)) {
      await CreateTexture(window, object.texture);
    }

    const tags = object.tags ?? [];
    const objec = window.shaders[modelsToShaderIndex[object.object]].InstanceObject(object.object, new RotPos(object.position, object.rotation, object.scale), physicsScene, 0, object.texture, tags);

    tags.forEach(tag => {
      if (callbackFunctions[tag]) {
        objec.callbackFn = callbackFunctions[tag];
      }
    });
  });

  requestAnimationFrame(renderLoop);
}