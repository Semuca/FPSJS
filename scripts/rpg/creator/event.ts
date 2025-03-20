import { CameraData, HorizontalCameraBound, TopOrBottom } from '../../camera';
import { Model, Objec, RotPos } from '../../objec';
import { Scene, TextureAtlas } from '../../scene';
import { DialogBox } from '../dialog';
import { DialogStep, EventStep } from '../types';

export class EventCamera {
  event: EventStep[] = [];
  current_step_index: number = 0;

  camera_data: CameraData;

  scene: Scene;
  model: Model;
  objecs: Objec[] = [];
  dialog_box?: DialogBox;

  // Created with some event
  constructor(scene: Scene, model: Model, dialog_box_creator: (text: string) => DialogBox) {
    this.scene = scene;
    this.model = model;

    this.camera_data = new CameraData({
      scene,
      tlCorner: [0.8, 0.5],
      width: 0.2,
      height: 0.5,
      bounds: new HorizontalCameraBound(3, -3, {
        type: TopOrBottom.Top,
        value: 0,
      }),
      worldIndex: 2,
    });

    this.camera_data.onMouseDown = (e, camera) => {
      if (this.event.length == 0) return false;

      const world_point = camera.CursorToWorldPosition([e.pageX, e.pageY]);
      const step_index = Math.ceil(world_point.y) * -1;

      if (step_index === this.event.length) {
        this.add_step({ type: 'DialogStep', text: '' });
      }

      if (step_index < this.event.length) {
        this.current_step_index = step_index;

        if (this.dialog_box) this.dialog_box.Destructor();

        this.dialog_box = dialog_box_creator(
          (this.event[this.current_step_index] as DialogStep).text,
        );
        return true;
      }

      return false;
    };
  }

  add_step(event_step: EventStep) {
    this.objecs.push(
      new Objec({
        model: this.model,
        rotpos: new RotPos({ position: [0, -this.event.length - 0.5, 0], scale: [3.0, 0.5, 1.0] }),
        worldIndex: 2,
      }),
    );
    this.event.push(event_step);
  }

  set_event(event: EventStep[]) {
    event.forEach((event_step) => this.add_step(event_step));
  }

  set_portrait(texture_atlas: TextureAtlas, number: number) {
    (this.event[this.current_step_index] as DialogStep).portrait = number;
    this.dialog_box?.set_portrait(texture_atlas, number);
  }

  add_characters(chars: string) {
    this.dialog_box!.text_block.add_characters(chars);
    (this.event[this.current_step_index] as DialogStep).text += chars;
  }

  delete_character() {
    this.dialog_box!.text_block.delete_character();
    (this.event[this.current_step_index] as DialogStep).text += (
      this.event[this.current_step_index] as DialogStep
    ).text.slice(0, -1);
  }

  Destructor() {
    this.event = [];

    this.dialog_box?.Destructor();
    this.objecs.forEach((objec) => objec.Destructor());
    this.objecs = [];
  }
}
