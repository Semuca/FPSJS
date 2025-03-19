import { Font, TextBlock } from '../font';
import { Model, Objec, Position2D, RotPos2D, Scale2D, ScaleType } from '../objec';
import { TextureAtlas } from '../scene';

const width = 0.8;
const height = 0.4;
const border_px = -40;
const x = 0;
const y = -0.5;

const profile_size = 0.2;

export class DialogBox {
  text_block: TextBlock;

  model: Model;
  box_objecs: Objec[];

  portait?: [TextureAtlas, number];
  portrait_obj?: Objec;

  constructor(font: Font, model: Model, white_tex_id: number, black_tex_id: number, text: string) {
    this.model = model;
    this.box_objecs = [
      new Objec({
        model,
        rotpos: new RotPos2D({
          position: new Position2D({ value: x }, { value: y }, 0),
          scale: Scale2D.of_width_percent(width, { type: ScaleType.Percent, value: height }),
        }),
        texId: white_tex_id,
      }),
      new Objec({
        model,
        rotpos: new RotPos2D({
          position: new Position2D({ value: x }, { value: y }, 0),
          scale: Scale2D.of_width_percent(
            width,
            {
              type: ScaleType.Percent,
              value: height,
              px_mod: border_px,
            },
            border_px,
          ),
        }),
        texId: black_tex_id,
      }),
    ];

    this.text_block = new TextBlock(
      font,
      this.model,
      { value: -width, px_mod: 500 },
      -0.3,
      21,
      text,
    );
  }

  set_portrait(texture_atlas: TextureAtlas, index: number) {
    this.portait = [texture_atlas, index];

    if (this.portrait_obj) {
      this.portrait_obj.Destructor();
    }

    this.portrait_obj = new Objec({
      model: this.model,
      rotpos: new RotPos2D({
        position: new Position2D({ value: -width, px_mod: 300 }, { value: y }, 0),
        scale: Scale2D.of_height_percent(profile_size),
      }),
      texId: texture_atlas.tex_id,
      overridden_attribs: {
        aTextureCoord: texture_atlas.get_from_index(index),
      },
    });
  }

  Destructor() {
    this.text_block.Destructor();
    this.box_objecs.forEach((box_objec) => box_objec.Destructor());
    this.portrait_obj?.Destructor();
  }
}
