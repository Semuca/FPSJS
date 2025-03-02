import { FScreen } from '../screen';
import { LoadTexture, LoadModel, LoadShader } from '../loading';
import { Objec, RotPos2D, Scale2D } from '../objec';
import { Scene } from '../scene';
import { CameraData } from '../camera';
import { TileDataMap, TileInfoMap } from './types';
import { distancePointToPoint, Point2D } from '../geometry';
import { vec2 } from 'gl-matrix';

export async function run_rpg(tile_data_map: TileDataMap, _screen?: FScreen) {
  // interface TextureData {
  //   layer: number;
  //   collider: boolean;
  // }
  // const textureData: Record<string, TextureData> = {};

  // let font: Font; //Think of a faster way to look up fonts later

  //Set up new screen that takes up the entire space
  const scene = new Scene();
  const screen = _screen ?? new FScreen('canvas', scene);
  const cam = new CameraData({ scene, zoom: 50 });

  const [modelData] = await Setup();
  screen.set_scene(scene);

  let promise_resolver: (value: void) => void;
  let is_resolved = false;
  const promise = new Promise<void>((resolve) => {
    promise_resolver = resolve;
  }).then(() => (is_resolved = true));

  scene.keyDownCallbacks['Escape'] = () => {
    promise_resolver();
  };

  function gen_texture_attributes(tile: number, tiles_wide: number, tiles_high: number) {
    const tex_x = (tile % tiles_wide) / tiles_wide;
    const tex_y = Math.floor(tile / tiles_wide) / tiles_high;
    const size_x = 1 / tiles_wide;
    const size_y = 1 / tiles_high;

    return new Float32Array([
      tex_x,
      tex_y + size_y,
      tex_x + size_x,
      tex_y,
      tex_x,
      tex_y,
      tex_x + size_x,
      tex_y + size_y,
    ]);
  }

  async function Setup() {
    //Load shaders for the 2d camera
    const sprite_shader = await LoadShader(
      scene,
      '2DspriteVertexShader.vs',
      'spriteFragmentShader.fs',
    );

    //This texture stuff should be cleaned up
    // const textures = await LoadFileText('../textures.txt');
    // Promise.allSettled(
    //   textures.split('\n').map((texture, index) => async () => {
    //     await LoadTexture(scene, texture + '.png');
    //     const rawMetadata = await LoadFileText('textures/' + texture + '.json');
    //     const jsonMetadata = JSON.parse(rawMetadata) as TextureData;

    //     textureData[index] = jsonMetadata;
    //   }),
    // );

    const sprite_sheet = await LoadTexture(scene, '../rtp/Graphics/Characters/Actor1.png');

    const modelData = await LoadModel(sprite_shader, 'verSprite.json');
    modelData.create_objec(
      new Objec({
        model: modelData,
        rotpos: new RotPos2D([0, 0], Math.PI, Scale2D.of_px(0.5, 0.5)),
        texId: sprite_sheet,
        overridden_attribs: {
          aTextureCoord: gen_texture_attributes(7, 12, 8),
        },
      }),
    );

    const dungeon_sprite_sheet = await LoadTexture(scene, '../rtp/Graphics/Tilesets/Dungeon_B.png');

    //Map loading
    Object.entries(tile_data_map).forEach(([x_string, entry]) => {
      const x = parseInt(x_string);
      Object.entries(entry).forEach(([y_string, { tile }]) => {
        const y = parseInt(y_string);
        if (tile != -1) {
          // TODO: Reimplement layers
          modelData.create_objec(
            new Objec({
              model: modelData,
              rotpos: new RotPos2D([x, y], Math.PI, Scale2D.of_px(0.5, 0.5)),
              texId: dungeon_sprite_sheet,
              overridden_attribs: {
                aTextureCoord: gen_texture_attributes(tile, 16, 16),
              },
            }),
          );
          // tiles[x][index - 50] = tile;
        }
      });
    });

    // await LoadTexture(scene, 'black.png');
    // await LoadTexture(scene, 'white.png');

    // await LoadTexture(scene, 'def.png');
    // font = new Font('def.png', JSON.parse(await LoadFileText('textures/def.json')));

    // DisplayBox(cam, screen.shaders[1], [0.8, 0.4]);
    // font.CreateSentence(screen.shaders[1], 400.0, -100.0, '* HELLO CONOR!');
    return [modelData];
  }

  const player_speed = 0.15;

  interface MovingObject {
    objec: Objec;
    to: Point2D;
    speed: number;
  }

  let moving_objects: MovingObject[] = [];

  const tile_info_map: TileInfoMap = {
    65: { passable: true, layer: 0 },
    104: { passable: false, layer: 0 },
    236: { passable: false, layer: 0 },
  };

  Tick();

  function move_objec(moving_object: MovingObject) {
    // TODO: Update tilemap with new positions
    moving_objects.push(moving_object);
  }

  const animations: Record<string, number[]> = {
    down: [8, 6, 7],
    left: [20, 18, 19],
    right: [32, 30, 31],
    up: [44, 42, 43],
  };

  function play_animation(type: string) {
    const player = modelData.objects[0];
    const set_frame = (frames: number[]) => {
      if (frames.length === 0) return;

      const [head, ...tail] = frames;

      player.overridden_attribs = {
        aTextureCoord: gen_texture_attributes(head, 12, 8),
      };
      setTimeout(() => set_frame(tail), 40);
    };

    set_frame(animations[type]);
  }

  function Tick() {
    if (is_resolved) return;

    const player = modelData.objects[0];

    if (moving_objects.length == 0) {
      let movX = 0.0;
      let movY = 0.0;
      if (screen.keysDown['KeyW'] === true) {
        movY += 1.0;
      }
      if (screen.keysDown['KeyA'] === true) {
        movX += 1.0;
      }
      if (screen.keysDown['KeyS'] === true) {
        movY -= 1.0;
      }
      if (screen.keysDown['KeyD'] === true) {
        movX -= 1.0;
      }

      if (movX != 0.0) {
        play_animation(movX === 1 ? 'left' : 'right');

        const new_x = player.rotpos.position[0] + movX;
        const new_y = player.rotpos.position[1];
        const new_tile = (tile_data_map[new_x] ?? {})[new_y];
        if (new_tile === undefined || tile_info_map[new_tile.tile]?.passable) {
          move_objec({
            objec: player,
            to: new Point2D(new_x, new_y),
            speed: player_speed,
          });
        }
      } else if (movY != 0.0) {
        play_animation(movY === 1 ? 'up' : 'down');

        const new_x = player.rotpos.position[0];
        const new_y = player.rotpos.position[1] + movY;
        const new_tile = (tile_data_map[new_x] ?? {})[new_y];
        if (new_tile === undefined || tile_info_map[new_tile.tile]?.passable) {
          move_objec({
            objec: player,
            to: new Point2D(new_x, new_y),
            speed: player_speed,
          });
        }
      }
    }

    moving_objects = moving_objects.filter(({ objec, to, speed }) => {
      const pos = (objec.rotpos as RotPos2D).position;
      if (distancePointToPoint(new Point2D(pos[0], pos[1]), to) <= speed) {
        pos[0] = to.x;
        pos[1] = to.y;
        return false;
      }

      const delta = vec2.fromValues(to.x - pos[0], to.y - pos[1]);
      vec2.normalize(delta, delta);
      vec2.scale(delta, delta, speed);

      pos[0] += delta[0];
      pos[1] += delta[1];
      return true;
    });

    cam.rotpos.position[0] = -player.rotpos.position[0];
    cam.rotpos.position[1] = -player.rotpos.position[1];

    requestAnimationFrame(() => screen.draw());

    setTimeout(Tick, 1000 / 60);
  }

  return promise;
}
