import { vec3 } from 'gl-matrix';
import { Model, Objec, RotPos } from '../../objec';
import { Scene, TextureAtlas } from '../../scene';
import { CameraData, HorizontalCameraBound, TopOrBottom } from '../../camera';
import { Font, Line } from '../../font';

export class PaletteCamera {
  palettes: Palette[];
  current_pallet!: Palette;

  on_click: (texture_atlas: TextureAtlas, index: number) => void = () => {};

  camera_data: CameraData;

  font: Font;
  sprite: Model;

  tileset: Objec;
  selector: Objec;

  layer_mode: boolean = false;
  layer_mode_objecs: Line[] = [];

  constructor(
    scene: Scene,
    palettes: Palette[],
    font: Font,
    sprite: Model,
    tframe_tex: number,
    world_index: number,
  ) {
    this.palettes = palettes;
    this.font = font;
    this.sprite = sprite;

    this.tileset = new Objec({
      model: sprite,
      rotpos: new RotPos({}),
      worldIndex: world_index,
    });

    this.camera_data = new CameraData({
      scene,
      tlCorner: [0.8, 0.0],
      width: 0.2,
      height: 0.5,
      worldIndex: world_index,
    });

    this.selector = new Objec({
      model: sprite,
      rotpos: new RotPos({
        scale: [0.5, 0.5, 1],
      }),
      texId: tframe_tex,
      worldIndex: world_index,
    });

    this.select_pallette(0);

    this.camera_data.onMouseDown = (e, camera) => {
      // TODO: I reckon this code would be simpler if the square was aligned on the top-left corner
      const cursorWorldPosition = camera.CursorToWorldPosition([e.pageX, e.pageY]);

      const x = Math.floor(
        cursorWorldPosition.x + this.current_pallet.texture_atlas.tiles_wide / 2,
      );
      const y = Math.floor(
        this.current_pallet.texture_atlas.tiles_high / 2 - cursorWorldPosition.y,
      );

      if (y < this.current_pallet.texture_atlas.tiles_high) {
        if (this.layer_mode) {
          const index =
            this.layer_mode_objecs.length -
            (y * this.current_pallet.texture_atlas.tiles_wide + x) -
            1;

          const sentence = this.layer_mode_objecs[index];
          const prev_layer = this.current_pallet.layers[index];
          const new_layer =
            e.button === 2 ? Math.max(0, prev_layer - 1) : Math.min(prev_layer + 1, 9);

          this.current_pallet.layers[index] = new_layer;
          sentence.delete_characters(1);
          sentence.add_characters(new_layer.toString());

          return true;
        }

        this.select_tile(x, y);
        this.on_click(this.current_pallet.texture_atlas, this.current_pallet.selected_tile_index!);
        return true;
      }

      return false;
    };
  }

  select_pallette(index: number, on_click?: (texture_atlas: TextureAtlas, index: number) => void) {
    this.current_pallet = this.palettes[index];
    this.on_click = on_click ?? (() => {});

    this.camera_data.bounds = new HorizontalCameraBound(
      this.current_pallet.texture_atlas.tiles_wide / 2,
      -this.current_pallet.texture_atlas.tiles_wide / 2,
      {
        type: TopOrBottom.Top,
        value: this.current_pallet.texture_atlas.tiles_high / 2,
      },
    );
    (this.tileset.rotpos.scale as vec3) = [
      this.current_pallet.texture_atlas.tiles_wide / 2,
      this.current_pallet.texture_atlas.tiles_high / 2,
      1,
    ];
    this.tileset.texId = this.current_pallet.texture_atlas.tex_id;

    if (this.current_pallet.selected_tile_index === undefined) {
      this.selector.hidden = true;
      return;
    }

    const x =
      this.current_pallet.selected_tile_index % this.current_pallet.texture_atlas.tiles_wide;
    const y = Math.floor(
      this.current_pallet.selected_tile_index / this.current_pallet.texture_atlas.tiles_wide,
    );

    this.select_tile(x, y);
  }

  select_tile(x: number, y: number) {
    this.selector.hidden = false;

    (this.selector.rotpos.position as vec3)[0] =
      this.current_pallet.texture_atlas.tiles_wide / 2 - x - 0.5;
    (this.selector.rotpos.position as vec3)[1] =
      this.current_pallet.texture_atlas.tiles_high / 2 - y - 0.5;

    this.current_pallet.selected_tile_index = y * this.current_pallet.texture_atlas.tiles_wide + x;
  }

  get_texture_attribute() {
    if (this.current_pallet.selected_tile_index == undefined) return undefined;

    return this.current_pallet.texture_atlas.get_from_index(
      this.current_pallet.selected_tile_index,
    );
  }

  toggle_edit_layer_mode() {
    if (!this.layer_mode) this.start_edit_layer_mode();
    else this.end_edit_layer_mode();
  }

  start_edit_layer_mode() {
    const width = this.current_pallet.texture_atlas.tiles_high / 2;
    const height = this.current_pallet.texture_atlas.tiles_wide / 2;
    for (let y = -height; y < height; y++) {
      for (let x = -width; x < width; x++) {
        this.layer_mode_objecs.push(new Line(this.font, this.sprite, x, y, '1', 1));
      }
    }
    this.layer_mode = true;
  }

  end_edit_layer_mode() {
    this.layer_mode_objecs.forEach((layer_mode_objec) => {
      layer_mode_objec.Destructor();
    });
    this.layer_mode_objecs = [];
    this.layer_mode = false;
  }
}

export class Palette {
  texture_atlas: TextureAtlas;

  layer_editor_enabled: boolean;
  layers: Record<number, number> = {};

  selected_tile_index?: number;

  constructor(
    texture_atlas: TextureAtlas,
    layer_editor_enabled: boolean = true,
    selected_tile_index?: number,
  ) {
    this.texture_atlas = texture_atlas;
    this.layer_editor_enabled = layer_editor_enabled;
    this.selected_tile_index = selected_tile_index;

    for (let y = 0; y < this.texture_atlas.tiles_high; y++) {
      for (let x = 0; x < this.texture_atlas.tiles_wide; x++) {
        this.layers[this.texture_atlas.xy_to_index(x, y)] = 1;
      }
    }
  }
}
