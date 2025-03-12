import { FScreen } from '../screen';
import { LoadTexture, LoadModel, LoadShader } from '../loading';
import { Objec, RotPos2D, Scale2D } from '../objec';
import { Scene, TextureAtlas } from '../scene';
import { CameraData, ZoomCameraBound } from '../camera';
import { EventStep, TileDataMap, TileInfoMap } from './types';
import { distancePointToPoint, Point2D } from '../geometry';
import { vec2 } from 'gl-matrix';

const tile_info_map: TileInfoMap = {
  34: { passable: true, layer: -1 },
  65: { passable: true, layer: -1 },
  88: { passable: true, layer: 0 },
  104: { passable: false, layer: 0 },
  236: { passable: false, layer: 0 },
};

enum Direction {
  Up,
  Down,
  Left,
  Right,
}

const animations: Record<Direction, number[]> = {
  [Direction.Down]: [8, 6, 7],
  [Direction.Left]: [20, 18, 19],
  [Direction.Right]: [32, 30, 31],
  [Direction.Up]: [44, 42, 43],
};

function add_direction_to_point(direction: Direction, point: Point2D) {
  switch (direction) {
    case Direction.Down:
      return new Point2D(point.x, point.y - 1);
    case Direction.Left:
      return new Point2D(point.x - 1, point.y);
    case Direction.Right:
      return new Point2D(point.x + 1, point.y);
    case Direction.Up:
      return new Point2D(point.x, point.y + 1);
  }
}

let direction = Direction.Down;

export async function run_rpg(tile_data_map: TileDataMap, _screen?: FScreen) {
  // let font: Font; //Think of a faster way to look up fonts later

  //Set up new screen that takes up the entire space
  const scene = new Scene();
  const screen = _screen ?? new FScreen('canvas', scene);
  const cam = new CameraData({ scene, bounds: new ZoomCameraBound(100) });

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

  const player = modelData.objects[0];

  scene.keyDownCallbacks['KeyE'] = () => {
    const tile_pos = add_direction_to_point(
      direction,
      new Point2D(player.rotpos.position[0], player.rotpos.position[1]),
    );
    const on_interact = tile_data_map[tile_pos.x]?.[tile_pos.y]?.on_interact;
    if (on_interact) run_event(on_interact);
  };

  function run_event(event_steps: EventStep[]) {
    const set_frame = ([event_step, ...tail]: EventStep[]) => {
      switch (event_step.type) {
        case 'DialogStep':
          console.log(event_step.text);
          break;
        default:
          break;
      }

      if (tail.length === 0) return;
      setTimeout(() => set_frame(tail), 40);
    };

    set_frame(event_steps);
  }

  let texture_atlas: TextureAtlas;

  async function Setup() {
    //Load shaders for the 2d camera
    const sprite_shader = await LoadShader(
      scene,
      '2DspriteVertexShader.vs',
      'spriteFragmentShader.fs',
    );

    const sprite_sheet = await LoadTexture(scene, '../rtp/Graphics/Characters/Actor1.png');
    texture_atlas = new TextureAtlas(sprite_sheet, 12, 8);

    const modelData = await LoadModel(sprite_shader, 'verSprite.json');
    modelData.create_objec(
      new Objec({
        model: modelData,
        rotpos: new RotPos2D([0, 0, 0], Math.PI, Scale2D.of_px(0.5, 0.5)),
        texId: sprite_sheet,
        overridden_attribs: {
          aTextureCoord: texture_atlas.get_from_num(7),
        },
      }),
    );

    const dungeon_sprite_sheet = await LoadTexture(scene, '../rtp/Graphics/Tilesets/Dungeon_B.png');
    const dungeon_texture_atlas = new TextureAtlas(dungeon_sprite_sheet, 16, 16);

    //Map loading
    Object.entries(tile_data_map).forEach(([x_string, entry]) => {
      const x = parseInt(x_string);
      Object.entries(entry).forEach(([y_string, { tile }]) => {
        const y = parseInt(y_string);
        modelData.create_objec(
          new Objec({
            model: modelData,
            rotpos: new RotPos2D(
              [x, y, tile_info_map[tile]?.layer ?? 0],
              Math.PI,
              Scale2D.of_px(0.5, 0.5),
            ),
            texId: dungeon_sprite_sheet,
            overridden_attribs: {
              aTextureCoord: dungeon_texture_atlas.get_from_num(tile),
            },
          }),
        );
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

  Tick();

  function move_objec(moving_object: MovingObject) {
    // TODO: Update tilemap with new positions
    moving_objects.push(moving_object);
  }

  function play_animation(dir: Direction) {
    const set_frame = ([head, ...tail]: number[]) => {
      player.overridden_attribs = {
        aTextureCoord: texture_atlas.get_from_num(head),
      };

      if (tail.length === 0) return;
      setTimeout(() => set_frame(tail), 40);
    };

    set_frame(animations[dir]);
    direction = dir;
  }

  function Tick() {
    if (is_resolved) return;

    if (moving_objects.length == 0) {
      let movX = 0.0;
      let movY = 0.0;

      if (screen.keysDown['KeyW'] === true) movY += 1.0;
      if (screen.keysDown['KeyA'] === true) movX += 1.0;
      if (screen.keysDown['KeyS'] === true) movY -= 1.0;
      if (screen.keysDown['KeyD'] === true) movX -= 1.0;

      if (movX != 0.0) {
        play_animation(movX === 1 ? Direction.Left : Direction.Right);

        const new_x = player.rotpos.position[0] + movX;
        const new_y = player.rotpos.position[1];
        const new_tile = tile_data_map[new_x]?.[new_y];
        if (new_tile === undefined || tile_info_map[new_tile.tile]?.passable) {
          move_objec({
            objec: player,
            to: new Point2D(new_x, new_y),
            speed: player_speed,
          });
        }
      } else if (movY != 0.0) {
        play_animation(movY === 1 ? Direction.Up : Direction.Down);

        const new_x = player.rotpos.position[0];
        const new_y = player.rotpos.position[1] + movY;
        const new_tile = tile_data_map[new_x]?.[new_y];
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

        const on_step = tile_data_map[to.x]?.[to.y]?.on_step;
        if (on_step) run_event(on_step);
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
