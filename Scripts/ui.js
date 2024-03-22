import { RotPos } from "./objec.js";

// For making fonts. This can probably be an extension of a spritesheet if i ever make them
export class Font {
    constructor(textureName, metaData) {
        this.textureName = textureName;
        this.metaData = JSON.parse(metaData);

        this.chars = {};

        // Sets up char hash table
        for (let i = 0; i < this.metaData['chars'].length; i++) {
            this.chars[this.metaData['chars'][i]] = i;
        }
    }

    // Creates sentence
    CreateSentence(target, physicsScene, posX, posY, sentence) { //Putting in physicsScene here is so stupid
        let ret = [];
        for (let i = 0; i < sentence.length; i++) {
            let numCode = this.chars[sentence[i]];
            ret.push(target.InstanceObject("verSprite.json", new RotPos([posX - i * 20.0, posY, 1.0], Math.PI, [25.0, 25.0]), physicsScene, 0, "def.png"));
            target.models["verSprite.json"].objects[target.models["verSprite.json"].objects.length - 1].texAttributes = [(numCode % 8) / 8, (Math.floor(numCode / 8) + 1) / 8, ((numCode % 8) + 1) / 8, Math.floor(numCode / 8) / 8, (numCode % 8) / 8, Math.floor(numCode / 8) / 8, ((numCode % 8) + 1) / 8, (Math.floor(numCode / 8) + 1) / 8];
        }
        return ret;
    }

    // Clears sentence
    ClearSentence(target, sentence) {
        for (const letter in sentence) {
            target
        }
    }
}

//This needs to be hooked up to something to dynamically resize
export function DisplayBox(camera, target, scale, physicsScene) {
    const width = scale[0] * camera.pxWidth / 2;
    const height = scale[1] * camera.pxHeight / 2;

    const underPercent = -0.25;

    target.InstanceObject("verSprite.json", new RotPos([0.0, underPercent * camera.pxHeight, 1.0], Math.PI, [width, height]), physicsScene, 0, "white.png");
    target.InstanceObject("verSprite.json", new RotPos([0.0, underPercent * camera.pxHeight, 1.0], Math.PI, [width - 15.0, height - 15.0]), physicsScene, 0, "black.png");
}