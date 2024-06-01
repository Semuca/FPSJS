"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DisplayBox = exports.Font = void 0;
const objec_js_1 = require("./objec.js");
// For making fonts. This can probably be an extension of a spritesheet if i ever make them
class Font {
    textureName;
    metaData;
    chars = {};
    constructor(textureName, metaData) {
        this.textureName = textureName;
        this.metaData = metaData;
        this.chars = {};
        // Sets up char hash table
        metaData.chars.split("").forEach((char, index) => {
            this.chars[char] = index;
        });
    }
    // Creates sentence
    CreateSentence(target, physicsScene, posX, posY, sentence) {
        const ret = [];
        sentence.split("").map((char, index) => {
            const numCode = this.chars[char];
            // target.models["verSprite.json"].objects[target.models["verSprite.json"].objects.length - 1].texAttributes = [(numCode % 8) / 8, (Math.floor(numCode / 8) + 1) / 8, ((numCode % 8) + 1) / 8, Math.floor(numCode / 8) / 8, (numCode % 8) / 8, Math.floor(numCode / 8) / 8, ((numCode % 8) + 1) / 8, (Math.floor(numCode / 8) + 1) / 8];
            return target.InstanceObject("verSprite.json", new objec_js_1.RotPos([posX - index * 20.0, posY, 1.0], Math.PI, [25.0, 25.0]), physicsScene, 0, "def.png");
        });
        return ret;
    }
}
exports.Font = Font;
//This needs to be hooked up to something to dynamically resize
function DisplayBox(camera, target, scale, physicsScene) {
    const width = scale[0] * camera.pxWidth / 2;
    const height = scale[1] * camera.pxHeight / 2;
    const underPercent = -0.25;
    target.InstanceObject("verSprite.json", new objec_js_1.RotPos([0.0, underPercent * camera.pxHeight, 1.0], Math.PI, [width, height]), physicsScene, 0, "white.png");
    target.InstanceObject("verSprite.json", new objec_js_1.RotPos([0.0, underPercent * camera.pxHeight, 1.0], Math.PI, [width - 15.0, height - 15.0]), physicsScene, 0, "black.png");
}
exports.DisplayBox = DisplayBox;
