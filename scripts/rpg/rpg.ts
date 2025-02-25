import { FScreen } from '../screen.js';
import { LoadFileText, LoadTexture, LoadModel, LoadShader } from '../loading.js';
import { Objec, RotPos2D } from '../objec.js';
import { Scene } from '../scene.js';
import { CameraData } from '../shader.js';

export async function run_rpg(screen: FScreen, map: string[]) {
  const tiles: Record<number, Record<number, string>> = {};
  for (let index = -50; index <= 50; index++) {
    tiles[index] = {};
  }

  interface TextureData {
    layer: number;
    collider: boolean;
  }
  const textureData: Record<string, TextureData> = {};

  // let font: Font; //Think of a faster way to look up fonts later

  //Set up new screen that takes up the entire space
  const scene = new Scene();
  // const screen = new FScreen('canvas', scene);
  const cam = new CameraData({ scene });
  scene.AddCamera(cam);

  const [modelData] = await Setup();
  screen.set_scene(scene);
  requestAnimationFrame(Render);
  Tick();

  async function Setup() {
    //Load shaders for the 2d camera
    const sprite_shader = await LoadShader(
      scene,
      '2DspriteVertexShader.vs',
      'spriteFragmentShader.fs',
    );

    //This texture stuff should be cleaned up
    const textures = await LoadFileText('../textures.txt');
    Promise.allSettled(
      textures.split('\n').map((texture, index) => async () => {
        await LoadTexture(scene, texture + '.png');
        const rawMetadata = await LoadFileText('textures/' + texture + '.json');
        const jsonMetadata = JSON.parse(rawMetadata) as TextureData;

        textureData[index] = jsonMetadata;
      }),
    );

    const modelData = await LoadModel(sprite_shader, 'verSprite.json');
    modelData.create_objec(
      new Objec({ model: modelData, rotpos: new RotPos2D([0.0, 0.0], Math.PI, [25.0, 25.0]) }),
    );

    //Map loading
    // const rawMap = await LoadFileText('map.txt');
    // const map = rawMap.split('\n');
    for (let i = 0; i < map.length; i++) {
      map[i].split('').forEach((char, index) => {
        if (char != ' ') {
          // TODO: Reimplement layers
          modelData.create_objec(
            new Objec({
              model: modelData,
              rotpos: new RotPos2D(
                [i * 50.0 - 2500.0, index * 50.0 - 2500.0],
                Math.PI,
                [25.0, 25.0],
              ),
              texId: scene.texIds[Object.keys(textureData)[parseInt(char)] + '.png'],
            }),
          );
          tiles[i - 50][index - 50] = char;
        }
      });
    }

    await LoadTexture(scene, 'black.png');
    await LoadTexture(scene, 'white.png');

    await LoadTexture(scene, 'def.png');
    // font = new Font('def.png', JSON.parse(await LoadFileText('textures/def.json')));

    // DisplayBox(cam, screen.shaders[1], [0.8, 0.4]);
    // font.CreateSentence(screen.shaders[1], 400.0, -100.0, '* HELLO CONOR!');
    return [modelData];
  }

  function Tick() {
    //Change movement based on keys currently pressed down
    let movX = 0.0;
    let movY = 0.0;
    if (screen.keysDown['KeyW'] === true) {
      movY += 10.0;
    }
    if (screen.keysDown['KeyA'] === true) {
      movX += 10.0;
    }
    if (screen.keysDown['KeyS'] === true) {
      movY -= 10.0;
    }
    if (screen.keysDown['KeyD'] === true) {
      movX -= 10.0;
    }
    const playerPos = modelData.objects[0].rotpos;

    // Rules of collisions for now:
    // The lines of the grid (50 apart) do not count as any collision territory.
    if (movX != 0.0 || movY != 0.0) {
      //Step 1: Check if movX will go through, and perform it if so

      let _x = Math.round((playerPos.position[0] + movX + 25) / 50);
      let _y = Math.round((playerPos.position[1] + 25) / 50);

      if (movX > 0.0) {
        if (textureData[tiles[_x][_y]] != undefined) {
          movX = textureData[tiles[_x][_y]].collider ? 0.0 : movX;
        }

        if (textureData[tiles[_x][_y - 1]] != undefined && movX != 0.0) {
          movX = textureData[tiles[_x][_y - 1]].collider ? 0.0 : movX;
        }
      }

      if (movX < 0.0) {
        if (textureData[tiles[_x - 1][_y]] != undefined) {
          movX = textureData[tiles[_x - 1][_y]].collider ? 0.0 : movX;
        }

        if (textureData[tiles[_x - 1][_y - 1]] != undefined && movX != 0.0) {
          movX = textureData[tiles[_x - 1][_y - 1]].collider ? 0.0 : movX;
        }
      }

      //Step 2: Check if movY will go through, and perform it if so
      _x = Math.round((playerPos.position[0] + movX + 25) / 50);
      _y = Math.round((playerPos.position[1] + movY + 25) / 50);

      if (movY > 0.0) {
        if (textureData[tiles[_x][_y]] != undefined) {
          movY = textureData[tiles[_x][_y]].collider ? 0.0 : movY;
        }

        if (textureData[tiles[_x - 1][_y]] != undefined && movY != 0.0) {
          movY = textureData[tiles[_x - 1][_y]].collider ? 0.0 : movY;
        }
      }

      if (movY < 0.0) {
        if (textureData[tiles[_x][_y - 1]] != undefined) {
          movY = textureData[tiles[_x][_y - 1]].collider ? 0.0 : movY;
        }

        if (textureData[tiles[_x - 1][_y - 1]] != undefined && movY != 0.0) {
          movY = textureData[tiles[_x - 1][_y - 1]].collider ? 0.0 : movY;
        }
      }

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

    //Clear before drawing
    screen.gl.clear(screen.gl.COLOR_BUFFER_BIT | screen.gl.DEPTH_BUFFER_BIT);

    //Draws sprites
    screen.cameras.forEach((camera) => camera.Draw());
  }
}
