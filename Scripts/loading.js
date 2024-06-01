"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoadMap = exports.LoadModel = exports.LoadShader = exports.CreateTexture = exports.LoadFileText = void 0;
const objec_js_1 = require("./objec.js");
//Loads values from text files given by the url
async function LoadFileText(url) {
    const retrievedText = await fetch(url);
    const text = await retrievedText.text();
    return text;
}
exports.LoadFileText = LoadFileText;
//Loads image from url
async function LoadImage(url) {
    const val = new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = url;
    });
    return await val;
}
//Should create more functions for textures:
//  - Got loading texture as variable from url
//  - This is loading texture into shader from url
//  - Might be worth making loading texture into shader from variable
async function CreateTexture(window, url) {
    // Check if texture already exists
    const foundTexture = Object.keys(window.texIds).find((key) => key === url);
    if (foundTexture)
        return window.texIds[foundTexture];
    // Load texture
    const tex = await LoadImage(`textures/${url}`);
    return window.SetupTexture(url, tex);
}
exports.CreateTexture = CreateTexture;
//Loads a shader from url data
async function LoadShader(camera, vsUrl, fsUrl) {
    const vSource = await LoadFileText(`shaders/${vsUrl}`);
    const fSource = await LoadFileText(`shaders/${fsUrl}`);
    //Hacky solution, to be fixed at some point
    const type = vsUrl.substring(0, 2) === "2D" ? "2D" : "3D";
    camera.window.AddShader(camera, vSource, fSource, type);
}
exports.LoadShader = LoadShader;
//Loads model from txt file
async function LoadModel(window, url) {
    const data = await LoadFileText(`models/${url}`);
    const jsonData = JSON.parse(data);
    const arrayBuffer = jsonData['ARRAY_BUFFER'];
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
exports.LoadModel = LoadModel;
// Creates a map file
async function LoadMap(window, url, physicsScene, renderLoop, callbackFunctions) {
    const data = await LoadFileText(url);
    const jsonData = JSON.parse(data);
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
        const objec = window.shaders[modelsToShaderIndex[object.object]].InstanceObject(object.object, new objec_js_1.RotPos(object.position, object.rotation, object.scale), physicsScene, 0, object.texture, tags);
        tags.forEach(tag => {
            if (callbackFunctions[tag]) {
                objec.callbackFn = callbackFunctions[tag];
            }
        });
    });
    requestAnimationFrame(renderLoop);
}
exports.LoadMap = LoadMap;
