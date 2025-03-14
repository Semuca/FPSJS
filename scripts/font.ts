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

const letter_size = 100;

export class TextBlock {
  lines: Line[];

  constructor(font: Font, model: Model, x: number, y: number, width: number, text: string) {
    // INVARIANT: A piece of text should have at least one word
    const [first_word, ...words] = text.split(' ');
    this.lines = words
      .reduce(
        (acc, word) => {
          const line_length = acc[acc.length - 1].reduce((acc, word) => acc + word.length + 1, 0);
          if (line_length + word.length <= width) {
            acc[acc.length - 1].push(word);
          } else {
            acc.push([word]);
          }
          return acc;
        },
        [[first_word]],
      )
      .map((words, index) => new Line(font, model, x, y - index * 0.1, words.join(' ')));
  }

  Destructor() {
    this.lines.forEach((line) => line.Destructor());
  }
}

export class Line {
  font: Font;
  objecs: Objec[];

  constructor(font: Font, model: Model, x: number, y: number, text: string) {
    this.font = font;
    this.objecs = text.split('').map((char, index) => {
      const objec = new Objec({
        model,
        rotpos: new RotPos2D({
          position: new Position2D(
            { type: Position2DType.Px, value: x + letter_size * index },
            { type: Position2DType.Percent, value: y },
            0,
          ),
          scale: Scale2D.of_px(letter_size, letter_size),
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
