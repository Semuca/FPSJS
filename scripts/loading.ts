import { quat, vec3 } from 'gl-matrix';
import { Objec, RotPos } from './objec.js';
import { FScreen } from './screen.js';
import { Camera } from './shader.js';

//Loads values from text files given by the url
export async function LoadFileText(url: string): Promise<string> {
  const retrievedText = await fetch(url);
  const text = await retrievedText.text();
  return text;
}

//Loads image from url
async function LoadImage(url: string): Promise<TexImageSource> {
  const val = new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
  return (await val) as TexImageSource;
}

//Should create more functions for textures:
//  - Got loading texture as variable from url
//  - This is loading texture into shader from url
//  - Might be worth making loading texture into shader from variable
export async function CreateTexture(window: FScreen, url: string): Promise<number | undefined> {
  // Check if texture already exists
  const foundTexture = Object.keys(window.texIds).find((key) => key === url);
  if (foundTexture) return window.texIds[foundTexture];

  // Load texture
  const tex = await LoadImage(`textures/${url}`);
  return window.SetupTexture(url, tex);
}

//Loads a shader from url data
export async function LoadShader(camera: Camera, vsUrl: string, fsUrl: string) {
  const vSource = await LoadFileText(`shaders/${vsUrl}`);
  const fSource = await LoadFileText(`shaders/${fsUrl}`);

  return camera.window.AddShader(camera, vSource, fSource);
}

export interface ModelData {
  ARRAY_BUFFER: Record<string, [number[], number, number, number]>;
  ELEMENT_ARRAY_BUFFER?: number[];
  TEXTURE?: string;
}

//Loads model from txt file
export async function LoadModel(window: FScreen, url: string): Promise<ModelData> {
  const data = await LoadFileText(`models/${url}`);
  const jsonData = JSON.parse(data) as ModelData;

  const arrayBuffer = jsonData.ARRAY_BUFFER;
  Object.keys(arrayBuffer).forEach((key) => {
    const len = arrayBuffer[key][0].length;
    arrayBuffer[key] = [arrayBuffer[key].flat(), len, len * 4, 0]; // Todo: Store metadata about the array in the object
  });

  if (jsonData.ELEMENT_ARRAY_BUFFER) {
    jsonData.ELEMENT_ARRAY_BUFFER = jsonData.ELEMENT_ARRAY_BUFFER.flat();
  }

  if (jsonData.TEXTURE) {
    jsonData.TEXTURE = ((await CreateTexture(window, jsonData.TEXTURE)) ?? 0).toString();
  }

  return jsonData;
}

export type MapFile = {
  shaders: { vertexShader: string; fragmentShader: string }[];
  models: Record<string, number>;
  objects: {
    object: string;
    position: vec3;
    rotation: quat;
    scale: vec3;
    texture?: string;
    tags?: string[];
  }[];
};

// Creates a map file
export async function LoadMap(
  window: FScreen,
  url: string,
  renderLoop: FrameRequestCallback,
  callbackFunctions: Record<string, (screen: FScreen, object: Objec) => void>,
) {
  const data = await LoadFileText(url);
  const jsonData = JSON.parse(data) as MapFile;

  // Loads all shaders TODO: Make shaders specify what cameras they should be connected to
  await Promise.all(
    jsonData.shaders.map((shader) =>
      LoadShader(window.cameras[0], shader.vertexShader, shader.fragmentShader),
    ),
  );

  // Loads all models
  const modelsToShaderIndex: Record<string, number> = {};
  await Promise.all(
    Object.entries(jsonData.models).map(async ([model, shaderIndex]) => {
      const modelData = await LoadModel(window, model);
      window.shaders[shaderIndex].CreateModel(model, modelData);
      modelsToShaderIndex[model] = shaderIndex;
    }),
  );

  await Promise.all(
    jsonData.objects.map(async (object) => {
      if (object.texture && !Object.keys(window.texIds).includes(object.texture)) {
        await CreateTexture(window, object.texture);
      }

      const tags = object.tags ?? [];
      const objec = window.shaders[modelsToShaderIndex[object.object]].InstanceObject(
        object.object,
        new RotPos(object.position, object.rotation, object.scale),
        0,
        object.texture,
        tags,
      );

      tags.forEach((tag) => {
        if (callbackFunctions[tag]) {
          objec.callbackFn = callbackFunctions[tag];
        }
      });
    }),
  );

  requestAnimationFrame(renderLoop);
}
