import { vec3 } from 'gl-matrix';
import { Model, Objec, RotPos } from '../../objec';
import { Scene, TextureAtlas } from '../../scene';
import { CameraData, HorizontalCameraBound, TopOrBottom } from '../../camera';

export class PaletteCamera {
  palettes: Palette[];
  current_pallet!: Palette;

  camera_data: CameraData;

  tileset: Objec;
  selector: Objec;

  constructor(
    scene: Scene,
    palettes: Palette[],
    sprite: Model,
    tframe_tex: number,
    world_index: number,
  ) {
    this.palettes = palettes;

    this.tileset = new Objec({
      model: sprite,
      rotpos: new RotPos({}),
      worldIndex: world_index,
    });
    sprite.create_objec(this.tileset);

    this.camera_data = new CameraData({
      scene,
      tlCorner: [0.8, 0.0],
      width: 0.2,
      height: 0.5,
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
        this.current_pallet.texture_atlas.tiles_wide / 2 - cursorWorldPosition.y,
      );

      if (y < this.current_pallet.texture_atlas.tiles_wide) {
        this.select_tile(x, y);
        return true;
      }

      return false;
    };

    this.selector = new Objec({
      model: sprite,
      rotpos: new RotPos({
        scale: [0.5, 0.5, 1],
      }),
      texId: tframe_tex,
      worldIndex: world_index,
    });
    sprite.create_objec(this.selector);

    this.select_tile(0, 0);
  }

  select_pallette(index: number) {
    this.current_pallet = this.palettes[index];
    this.camera_data.bounds = new HorizontalCameraBound(
      this.current_pallet.texture_atlas.tiles_wide / 2,
      -this.current_pallet.texture_atlas.tiles_wide / 2,
      {
        type: TopOrBottom.Top,
        value: this.current_pallet.texture_atlas.tiles_wide / 2,
      },
    );
    (this.tileset.rotpos.scale as vec3) = [
      this.current_pallet.texture_atlas.tiles_wide / 2,
      this.current_pallet.texture_atlas.tiles_wide / 2,
      1,
    ];
    this.tileset.texId = this.current_pallet.texture_atlas.tex_id;
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
