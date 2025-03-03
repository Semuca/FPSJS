import { Model, Objec, RotPos2D, Scale2D } from './objec';
import { Camera } from './camera';

// For making fonts. This can probably be an extension of a spritesheet if i ever make them
export class Font {
  textureName: string;
  metaData: { chars: string };

  chars: Record<string, number> = {};

  constructor(textureName: string, metaData: { chars: string }) {
    this.textureName = textureName;
    this.metaData = metaData;

    this.chars = {};

    // Sets up char hash table
    metaData.chars.split('').forEach((char, index) => {
      this.chars[char] = index;
    });
  }

  // Creates sentence
  // CreateSentence(target: Shader, posX: number, posY: number, sentence: string): void {
  //   //Putting in physicsScene here is so stupid
  //   sentence.split('').map((_char, index) => {
  //     // const numCode = this.chars[char];
  //     // target.models["verSprite.json"].objects[target.models["verSprite.json"].objects.length - 1].texAttributes = [(numCode % 8) / 8, (Math.floor(numCode / 8) + 1) / 8, ((numCode % 8) + 1) / 8, Math.floor(numCode / 8) / 8, (numCode % 8) / 8, Math.floor(numCode / 8) / 8, ((numCode % 8) + 1) / 8, (Math.floor(numCode / 8) + 1) / 8];
  //     return target.InstanceObject(
  //       'verSprite.json',
  //       new RotPos2D([posX - index * 20.0, posY], Math.PI, [25.0, 25.0]),
  //       0,
  //       'def.png',
  //     );
  //   });
  // }

  // Clears sentence
  // ClearSentence(target, sentence) {
  //     for (const letter in sentence) {
  //         target
  //     }
  // }
}

//This needs to be hooked up to something to dynamically resize
export function DisplayBox(camera: Camera, model: Model, scale: [number, number]) {
  const width = (scale[0] * camera.pxWidth) / 2;
  const height = (scale[1] * camera.pxHeight) / 2;

  const underPercent = -0.25;

  model.create_objec(
    new Objec({
      model,
      rotpos: new RotPos2D(
        [0, underPercent * camera.pxHeight, 0],
        Math.PI,
        Scale2D.of_px(width, height),
      ),
      // texId: 'white.png'
    }),
  );

  model.create_objec(
    new Objec({
      model,
      rotpos: new RotPos2D(
        [0, underPercent * camera.pxHeight, 0],
        Math.PI,
        Scale2D.of_px(width - 15, height - 15),
      ),
      // texId: 'black.png'
    }),
  );
}
