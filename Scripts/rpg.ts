import { FScreen } from './screen.js';
import { LoadFileText, CreateTexture, LoadModel, LoadShader } from './loading.js';
import { RotPos2D } from './objec.js';
import { Font, DisplayBox } from './ui.js';

const tiles: Record<number, Record<number, string>> = {};
for (let index = -50; index <= 50; index++) {
  tiles[index] = {};
}

interface TextureData {
  layer: number;
  collider: boolean;
}
const textureData: Record<string, TextureData> = {};

let font: Font; //Think of a faster way to look up fonts later

//Set up new screen that takes up the entire space
const temp = new FScreen('canvas');
const cam = temp.AddCamera([0.0, 0.0], [1.0, 1.0], 0);
cam.PreDraw();

Setup();

async function Setup() {
  //Load shaders for the 2d camera
  await LoadShader(cam, '2DspriteVertexShader.vs', 'spriteFragmentShader.fs');

  //This texture stuff should be cleaned up
  const textures = await LoadFileText('../textures.txt');
  Promise.allSettled(
    textures.split('\n').map((texture, index) => async () => {
      await CreateTexture(temp, texture + '.png');
      const rawMetadata = await LoadFileText('textures/' + texture + '.json');
      const jsonMetadata = JSON.parse(rawMetadata) as TextureData;

      textureData[index] = jsonMetadata;
    }),
  );

  const modelData = await LoadModel(temp, 'verSprite.json');
  temp.shaders[0].CreateModel('verSprite.json', modelData);
  temp.shaders[0].InstanceObject(
    'verSprite.json',
    new RotPos2D([0.0, 0.0], Math.PI, [25.0, 25.0]),
    0,
  );

  //Map loading
  const rawMap = await LoadFileText('map.txt');
  const map = rawMap.split('\n');
  for (let i = 0; i < map.length; i++) {
    map[i].split('').forEach((char, index) => {
      if (char != ' ') {
        // TODO: Reimplement layers
        temp.shaders[0].InstanceObject(
          'verSprite.json',
          new RotPos2D([i * 50.0 - 2500.0, index * 50.0 - 2500.0], Math.PI, [25.0, 25.0]),
          0,
          Object.keys(textureData)[parseInt(char)] + '.png',
        );
        tiles[i - 50][index - 50] = char;
      }
    });
  }

  await LoadShader(cam, '2DspriteVertexShader.vs', 'spriteFragmentShader.fs');
  temp.shaders[1].CreateModel('verSprite.json', modelData);

  await CreateTexture(temp, 'black.png');
  await CreateTexture(temp, 'white.png');

  await CreateTexture(temp, 'def.png');
  font = new Font('def.png', JSON.parse(await LoadFileText('Textures/def.json')));

  DisplayBox(cam, temp.shaders[1], [0.8, 0.4]);
  font.CreateSentence(temp.shaders[1], 400.0, -100.0, '* HELLO CONOR!');

  requestAnimationFrame(Render);
  Tick();
}

function Tick() {
  //Change movement based on keys currently pressed down
  let movX = 0.0;
  let movY = 0.0;
  if (temp.keysDown['KeyW'] === true) {
    movY += 10.0;
  }
  if (temp.keysDown['KeyA'] === true) {
    movX += 10.0;
  }
  if (temp.keysDown['KeyS'] === true) {
    movY -= 10.0;
  }
  if (temp.keysDown['KeyD'] === true) {
    movX -= 10.0;
  }
  const playerPos = temp.shaders[0].models['verSprite.json'].objects[0].rotpos;

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

    cam.UpdatePos();
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
  temp.gl.clear(temp.gl.COLOR_BUFFER_BIT | temp.gl.DEPTH_BUFFER_BIT);

  //Draws sprites
  temp.shaders[0].DrawScene(0);
  temp.shaders[1].DrawScene(0);
}

//Resizing for the window. What's the difference between "resize" and "onresize"?
window.addEventListener('resize', () => {
  temp.canvas.width = temp.canvas.clientWidth;
  temp.canvas.height = temp.canvas.clientHeight;

  for (let i = 0; i < temp.cameras.length; i++) {
    temp.cameras[i].pxWidth = temp.canvas.width * temp.cameras[i].width;
    temp.cameras[i].pxHeight = temp.canvas.height * temp.cameras[i].height;
    temp.cameras[i].aspectRatio = temp.cameras[i].pxWidth / temp.cameras[i].pxHeight;
    temp.cameras[i].RecalculateProjMatrix();
  }

  cam.PreDraw();
  requestAnimationFrame(Render);
});
