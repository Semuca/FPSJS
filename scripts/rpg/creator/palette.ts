import { vec3 } from 'gl-matrix';
import { Model, Objec, RotPos } from '../../objec';
import { TextureAtlas } from '../../scene';

export class PaletteCamera {
  palettes: Palette[];
  current_pallet!: Palette;

  tileset: Objec;
  selector: Objec;

  constructor(
    palettes: Palette[],
    index: number,
    sprite: Model,
    tframe_tex: number,
    world_index: number,
  ) {
    this.palettes = palettes;
    this.select_pallette(index);

    this.tileset = new Objec({
      model: sprite,
      rotpos: new RotPos({
        scale: [
          this.current_pallet.texture_atlas.tiles_wide / 2,
          this.current_pallet.texture_atlas.tiles_wide / 2,
          1,
        ],
      }),
      texId: this.current_pallet.texture_atlas.tex_id,
      worldIndex: world_index,
    });
    sprite.create_objec(this.tileset);

    this.selector = new Objec({
      model: sprite,
      rotpos: new RotPos({
        scale: [0.5, 0.5, 1],
      }),
      texId: tframe_tex,
      worldIndex: world_index,
    });
    sprite.create_objec(this.selector);
  }

  select_pallette(index: number) {
    this.current_pallet = this.palettes[index];
  }

  select_tile(x: number, y: number) {
    (this.selector.rotpos.position as vec3)[0] =
      this.current_pallet.texture_atlas.tiles_wide / 2 - x - 0.5;
    (this.selector.rotpos.position as vec3)[1] =
      this.current_pallet.texture_atlas.tiles_wide / 2 - y - 0.5;

    this.current_pallet.selected_tile_index = y * this.current_pallet.texture_atlas.tiles_wide + x;
  }

  get_texture_attribute() {
    return this.current_pallet.texture_atlas.get_from_index(
      this.current_pallet.selected_tile_index,
    );
  }
}

export class Palette {
  texture_atlas: TextureAtlas;

  selected_tile_index: number = 0;

  constructor(texture_atlas: TextureAtlas) {
    this.texture_atlas = texture_atlas;
  }
}
