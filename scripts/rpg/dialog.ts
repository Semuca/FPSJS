import { Model, Objec, RotPos2D, Scale2D, ScaleType } from '../objec';

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

export function DisplayBox(model: Model, white_tex_id: number, black_tex_id: number) {
  const width = 0.8;
  const height = 0.4;

  model.create_objec(
    new Objec({
      model,
      rotpos: new RotPos2D(
        [0, 0, 0],
        Math.PI,
        Scale2D.of_width_percent(width, { type: ScaleType.Percent, value: height }),
      ),
      texId: white_tex_id,
    }),
  );

  model.create_objec(
    new Objec({
      model,
      rotpos: new RotPos2D(
        [0, 0, 0],
        Math.PI,
        Scale2D.of_width_percent(width - 0.05, { type: ScaleType.Percent, value: height - 0.05 }),
      ),
      texId: black_tex_id,
    }),
  );
}
