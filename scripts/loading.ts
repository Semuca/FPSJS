import { quat, vec3 } from 'gl-matrix';
import { Model, ModelData, Objec, RotPos } from './objec';
import { FScreen } from './screen';
import { ShaderData } from './shader';
import { Scene } from './scene';

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
export async function LoadTexture(scene: Scene, url: string) {
  // Check if texture already exists
  const foundTexture = Object.keys(scene.texIds).find((key) => key === url);
  if (foundTexture) return scene.texIds[foundTexture];

  // Load texture
  const tex = await LoadImage(`textures/${url}`);
  return scene.CreateTexture(url, tex);
}

//Loads a shader from url data
export async function LoadShader(scene: Scene, vsUrl: string, fsUrl: string) {
  const vSource = await LoadFileText(`shaders/${vsUrl}`);
  const fSource = await LoadFileText(`shaders/${fsUrl}`);

  return new ShaderData(scene, vSource, fSource);
}

//Loads model from txt file
export async function LoadModel(shader_data: ShaderData, url: string): Promise<Model> {
  const data = await LoadFileText(`models/${url}`);
  const model_data = JSON.parse(data) as ModelData;

  const arrayBuffer = model_data.ARRAY_BUFFER;
  Object.keys(arrayBuffer).forEach((key) => {
    const len = arrayBuffer[key][0].length;
    arrayBuffer[key] = [arrayBuffer[key].flat(), len, len * 4, 0]; // Todo: Store metadata about the array in the object
  });

  if (model_data.ELEMENT_ARRAY_BUFFER) {
    model_data.ELEMENT_ARRAY_BUFFER = model_data.ELEMENT_ARRAY_BUFFER.flat();
  }

  if (model_data.TEXTURE) {
    model_data.TEXTURE = (
      (await LoadTexture(shader_data.scene, model_data.TEXTURE)) ?? 0
    ).toString();
  }

  const model = new Model(url, model_data);
  shader_data.add_model(model);

  return model;
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
  scene: Scene,
  url: string,
  renderLoop: FrameRequestCallback,
  callbackFunctions: Record<string, (screen: FScreen, object: Objec) => void>,
) {
  const data = await LoadFileText(url);
  const jsonData = JSON.parse(data) as MapFile;

  // Loads all shaders TODO: Make shaders specify what cameras they should be connected to
  await Promise.all(
    jsonData.shaders.map((shader) => LoadShader(scene, shader.vertexShader, shader.fragmentShader)),
  );

  // Loads all models
  const modelsToShaderIndex: Record<string, number> = {};
  await Promise.all(
    Object.entries(jsonData.models).map(async ([model, shaderIndex]) => {
      await LoadModel(scene.shader_data[shaderIndex], model);
      modelsToShaderIndex[model] = shaderIndex;
    }),
  );

  await Promise.all(
    jsonData.objects.map(async (object) => {
      if (object.texture && !Object.keys(scene.texIds).includes(object.texture)) {
        await LoadTexture(scene, object.texture);
      }

      const tags = object.tags ?? [];
      const model = scene.shader_data[modelsToShaderIndex[object.object]].models.find(
        (model) => model.name === object.object,
      ) as Model;
      const objec = new Objec({
        model,
        rotpos: new RotPos(object.position, object.rotation, object.scale),
        texId: object.texture ? scene.texIds[object.texture] : undefined,
        tags,
      });
      model.create_objec(objec);

      tags.forEach((tag) => {
        if (callbackFunctions[tag]) {
          objec.callbackFn = callbackFunctions[tag];
        }
      });
    }),
  );

  requestAnimationFrame(renderLoop);
}
