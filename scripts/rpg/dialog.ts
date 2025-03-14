import { Font, Line } from '../font';
import { Model, Objec, Position2D, Position2DType, RotPos2D, Scale2D, ScaleType } from '../objec';

const width = 0.8;
const height = 0.4;
const margin = 0.05;
const x = 0;
const y = -0.5;

export class DialogBox {
  line: Line;
  box_objecs: Objec[];

  constructor(
    font: Font,
    model: Model,
    white_tex_id: number,
    black_tex_id: number,
    text: string,
  ) {
    this.box_objecs = [
      new Objec({
        model,
        rotpos: new RotPos2D({
          position: new Position2D(
            { type: Position2DType.Percent, value: x },
            { type: Position2DType.Percent, value: y },
            0,
          ),
          scale: Scale2D.of_width_percent(width, { type: ScaleType.Percent, value: height }),
        }),
        texId: white_tex_id,
      }),
      new Objec({
        model,
        rotpos: new RotPos2D({
          position: new Position2D(
            { type: Position2DType.Percent, value: x },
            { type: Position2DType.Percent, value: y },
            0,
          ),
          scale: Scale2D.of_width_percent(width - margin, {
            type: ScaleType.Percent,
            value: height - margin,
          }),
        }),
        texId: black_tex_id,
      }),
    ];

    this.box_objecs.forEach((box_objec) => model.create_objec(box_objec));

    this.line = new Line(font, model, -0.6, -0.35, text);
  }

  Destructor() {
    this.box_objecs.forEach((box_objec) => box_objec.Destructor());
    this.line.Destructor();
  }
}
