import { Model, Objec, Position2D, Position2DType, RotPos2D, Scale2D } from './objec';
import { TextureAtlas } from './scene';

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
}

export class Sentence {
  font: Font;
  objecs: Objec[];

  constructor(font: Font, model: Model, posX: number, posY: number, sentence: string) {
    this.font = font;
    this.objecs = sentence.split('').map((char, index) => {
      const objec = new Objec({
        model,
        rotpos: new RotPos2D({
          position: new Position2D(
            { type: Position2DType.Percent, value: posX + 0.1 * index },
            { type: Position2DType.Percent, value: posY },
            0,
          ),
          scale: Scale2D.of_width_percent(0.1),
        }),
        texId: this.font.texture_atlas.tex_id,
        overridden_attribs: {
          aTextureCoord: this.font.texture_atlas.get_from_num(this.font.chars[char]),
        },
      });
      model.create_objec(objec);
      return objec;
    });
  }

  Destructor() {
    this.objecs.forEach((objec) => objec.Destructor());
  }
}
