import { Model, Objec, Position2D, Position2DType, RotPos2D, Scale2D, ScaleType } from '../objec';
import { TextureAtlas } from '../scene';

// For making fonts. This can probably be an extension of a spritesheet if i ever make them
export class Font {
  texture_atlas: TextureAtlas;
  metaData: { chars: string };

  chars: Record<string, number> = {};

  constructor(texture_atlas: TextureAtlas, metaData: { chars: string }) {
    this.texture_atlas = texture_atlas;
    this.metaData = metaData;

    this.chars = {};

    metaData.chars.split('').forEach((char, index) => {
      this.chars[char] = index;
    });
  }

  // Creates sentence
  CreateSentence(model: Model, posX: number, posY: number, sentence: string): void {
    sentence.split('').map((char, index) => {
      return model.create_objec(
        new Objec({
          model,
          rotpos: new RotPos2D({
            position: new Position2D(
              { type: Position2DType.Percent, value: posX + 0.1 * index },
              { type: Position2DType.Percent, value: posY },
              0,
            ),
            scale: Scale2D.of_width_percent(0.1),
          }),
          texId: this.texture_atlas.tex_id,
          overridden_attribs: {
            aTextureCoord: this.texture_atlas.get_from_num(this.chars[char]),
          },
        }),
      );
    });
  }

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
      rotpos: new RotPos2D({
        position: new Position2D(
          { type: Position2DType.Percent, value: 0 },
          { type: Position2DType.Percent, value: -0.5 },
          0,
        ),
        scale: Scale2D.of_width_percent(width, { type: ScaleType.Percent, value: height }),
      }),
      texId: white_tex_id,
    }),
  );

  model.create_objec(
    new Objec({
      model,
      rotpos: new RotPos2D({
        position: new Position2D(
          { type: Position2DType.Percent, value: 0 },
          { type: Position2DType.Percent, value: -0.5 },
          0,
        ),
        scale: Scale2D.of_width_percent(width - 0.05, {
          type: ScaleType.Percent,
          value: height - 0.05,
        }),
      }),
      texId: black_tex_id,
    }),
  );
}
