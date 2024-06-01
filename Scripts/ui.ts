import { RotPos } from "./objec.js";
import { PhysicsScene } from "./physics.js";
import { Camera, Shader } from "./shader.js";

// For making fonts. This can probably be an extension of a spritesheet if i ever make them
export class Font {
    textureName: string;
    metaData: {chars: string};

    chars: Record<string, number> = {};

    constructor(textureName: string, metaData: {chars: string}) {
        this.textureName = textureName;
        this.metaData = metaData;

        this.chars = {};

        // Sets up char hash table
        metaData.chars.split("").forEach((char, index) => {
            this.chars[char] = index;
        });
    }

    // Creates sentence
    CreateSentence(target: Shader, physicsScene: PhysicsScene, posX: number, posY: number, sentence: string) { //Putting in physicsScene here is so stupid
        const ret = [];
        sentence.split("").map((char, index) => {
            const numCode = this.chars[char];
            // target.models["verSprite.json"].objects[target.models["verSprite.json"].objects.length - 1].texAttributes = [(numCode % 8) / 8, (Math.floor(numCode / 8) + 1) / 8, ((numCode % 8) + 1) / 8, Math.floor(numCode / 8) / 8, (numCode % 8) / 8, Math.floor(numCode / 8) / 8, ((numCode % 8) + 1) / 8, (Math.floor(numCode / 8) + 1) / 8];
            return target.InstanceObject("verSprite.json", new RotPos([posX - index * 20.0, posY, 1.0], Math.PI, [25.0, 25.0]), physicsScene, 0, "def.png");
        });
        return ret;
    }

    // Clears sentence
    // ClearSentence(target, sentence) {
    //     for (const letter in sentence) {
    //         target
    //     }
    // }
}

//This needs to be hooked up to something to dynamically resize
export function DisplayBox(camera: Camera, target: Shader, scale: [number, number], physicsScene: PhysicsScene) {
    const width = scale[0] * camera.pxWidth / 2;
    const height = scale[1] * camera.pxHeight / 2;

    const underPercent = -0.25;

    target.InstanceObject("verSprite.json", new RotPos([0.0, underPercent * camera.pxHeight, 1.0], Math.PI, [width, height]), physicsScene, 0, "white.png");
    target.InstanceObject("verSprite.json", new RotPos([0.0, underPercent * camera.pxHeight, 1.0], Math.PI, [width - 15.0, height - 15.0]), physicsScene, 0, "black.png");
}