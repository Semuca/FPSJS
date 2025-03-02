import { FScreen } from '../screen';
import { LoadTexture, LoadModel, LoadShader } from '../loading';
import { Objec, RotPos2D, Scale2D } from '../objec';
import { Scene } from '../scene';
import { CameraData } from '../camera';
import { TileDataMap } from './types';

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
  requestAnimationFrame(Render);

  let promise_resolver: (value: void) => void;
  let is_resolved = false;
  const promise = new Promise<void>((resolve) => {
    promise_resolver = resolve;
  }).then(() => (is_resolved = true));

  scene.keyDownCallbacks['Escape'] = () => {
    promise_resolver();
  };

  Tick();

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

    const modelData = await LoadModel(sprite_shader, 'verSprite.json');
    modelData.create_objec(
      new Objec({
        model: modelData,
        rotpos: new RotPos2D([0, 0], Math.PI, Scale2D.of_px(0.5, 0.5)),
      }),
    );

    await LoadTexture(scene, '../rtp/Graphics/Tilesets/Dungeon_B.png');

    //Map loading
    // const rawMap = await LoadFileText('map.txt');
    // const map = rawMap.split('\n');
    Object.entries(tile_data_map).forEach(([x_string, entry]) => {
      const x = parseInt(x_string);
      Object.entries(entry).forEach(([y_string, { tile }]) => {
        const y = parseInt(y_string);
        if (tile != -1) {
          const tex_x = (tile % 16) / 16;
          const tex_y = Math.floor(tile / 16) / 16;
          const size = 1 / 16;

          const texture_attribute = new Float32Array([
            tex_x,
            tex_y + size,
            tex_x + size,
            tex_y,
            tex_x,
            tex_y,
            tex_x + size,
            tex_y + size,
          ]);
          // TODO: Reimplement layers
          modelData.create_objec(
            new Objec({
              model: modelData,
              rotpos: new RotPos2D([-x, y], Math.PI, Scale2D.of_px(0.5, 0.5)),
              texId: scene.texIds['../rtp/Graphics/Tilesets/Dungeon_B.png'],
              overridden_attribs: {
                aTextureCoord: texture_attribute,
              },
            }),
          );
          // tiles[x][index - 50] = tile;
        }
      });
    });

    await LoadTexture(scene, 'black.png');
    await LoadTexture(scene, 'white.png');

    await LoadTexture(scene, 'def.png');
    // font = new Font('def.png', JSON.parse(await LoadFileText('textures/def.json')));

    // DisplayBox(cam, screen.shaders[1], [0.8, 0.4]);
    // font.CreateSentence(screen.shaders[1], 400.0, -100.0, '* HELLO CONOR!');
    return [modelData];
  }

  function Tick() {
    if (is_resolved) return;

    //Change movement based on keys currently pressed down
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
    const playerPos = modelData.objects[0].rotpos;

    if (movX != 0.0 || movY != 0.0) {
      cam.rotpos.position[0] -= movX;
      cam.rotpos.position[1] -= movY;

      playerPos.position[0] += movX; //Why subtraction??
      playerPos.position[1] += movY;

      requestAnimationFrame(Render);
    }

    setTimeout(Tick, 10);
  }

  //Should only be called once per animation frame. Starts a loop of updating shaders.
  function Render() {
    //now *= 0.001;  // convert to seconds
    //const deltaTime = now - time;
    //time = now;

    screen.draw();
  }

  return promise;
}
