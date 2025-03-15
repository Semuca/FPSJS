import { Model, Objec, Position2D, Position2DValue, RotPos2D, Scale2D } from './objec';
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
  font: Font;
  model: Model;
  x: Position2DValue;
  y: number;
  line_length: number;

  lines: { line: Line; words: string[] }[];

  constructor(
    font: Font,
    model: Model,
    x: Position2DValue,
    y: number,
    line_length: number,
    text: string,
  ) {
    this.font = font;
    this.model = model;
    this.x = x;
    this.y = y;
    this.line_length = line_length;

    // INVARIANT: A piece of text should have at least one word
    const [first_word, ...words] = text.split(' ');
    const line_words = words.reduce(
      (acc, word) => {
        const line_length = acc[acc.length - 1].reduce((acc, word) => acc + word.length + 1, 0);
        if (line_length + word.length <= this.line_length) {
          acc[acc.length - 1].push(word);
        } else {
          acc.push([word]);
        }
        return acc;
      },
      [[first_word]],
    );
    this.lines = line_words.map((words, index) => ({
      line: new Line(font, model, x, y - index * 0.1, words.join(' ')),
      words,
    }));
  }

  add_characters(char: string) {
    const last_line = this.lines[this.lines.length - 1];
    if (this.line_length < last_line.words.reduce((acc, word) => acc + word.length + 1, 0) + 1) {
      const new_word = char === ' ' ? '' : last_line.words[last_line.words.length - 1] + char;

      last_line.line.delete_characters(last_line.words[last_line.words.length - 1].length + 1);
      this.lines.push({
        line: new Line(this.font, this.model, this.x, this.y - this.lines.length * 0.1, new_word),
        words: [new_word],
      });
    } else {
      last_line.line.add_characters(char);
      if (char === ' ') {
        last_line.words.push('');
      } else {
        last_line.words[last_line.words.length - 1] += char;
      }
    }
  }

  delete_character() {
    const second_last_line = this.lines.at(this.lines.length - 2);
    const last_line = this.lines[this.lines.length - 1];

    last_line.line.delete_characters(1);
    if (last_line.words[last_line.words.length - 1] === '') {
      last_line.words.pop();
    } else
      last_line.words[last_line.words.length - 1] = last_line.words[
        last_line.words.length - 1
      ].slice(0, last_line.words[last_line.words.length - 1].length - 1);

    if (
      last_line.words.length == 1 &&
      second_last_line &&
      second_last_line.words.reduce((acc, word) => acc + word.length + 1, 0) +
        1 +
        last_line.words[0].length ==
        this.line_length
    ) {
      last_line.line.Destructor();
      this.lines.pop();
      this.lines[this.lines.length - 1].line.add_characters(' ' + last_line.words[0]);
    }
  }

  Destructor() {
    this.lines.forEach((line) => line.line.Destructor());
  }
}

export class Line {
  font: Font;
  model: Model;
  x: Position2DValue;
  y: number;
  objecs: Objec[] = [];

  constructor(font: Font, model: Model, x: Position2DValue, y: number, text: string) {
    this.font = font;
    this.model = model;
    this.x = x;
    this.y = y;

    this.add_characters(text);
  }

  add_characters(chars: string) {
    chars.split('').forEach((char) => {
      const objec = new Objec({
        model: this.model,
        rotpos: new RotPos2D({
          position: new Position2D(
            {
              value: this.x.value,
              px_mod: (this.x.px_mod ?? 0) + letter_size * this.objecs.length,
            },
            { value: this.y },
            0,
          ),
          scale: Scale2D.of_px(letter_size, letter_size),
        }),
        texId: this.font.texture_atlas.tex_id,
        overridden_attribs: {
          aTextureCoord: this.font.texture_atlas.get_from_index(this.font.chars[char]),
        },
      });
      this.model.create_objec(objec);
      this.objecs.push(objec);
    });
  }

  delete_characters(amount: number) {
    Array.from({ length: amount }).forEach(() => {
      this.objecs.at(this.objecs.length - 1)?.Destructor();
      this.objecs.pop();
    });
  }

  Destructor() {
    this.objecs.forEach((objec) => objec.Destructor());
  }
}
