import { FScreen, toggleFullScreen } from './screen.js';
import { LoadFileText, CreateTexture, LoadModel, LoadShader } from './loading.js';
import { Objec, RotPos2D } from './objec.js';

const MODES = {
  MOVE: 0,
  PLACE: 1,
};

let mode = MODES.MOVE;

let tile = 0;
const tiles: Record<number, Record<number, Objec>> = {};
for (let index = -50; index <= 50; index++) {
  tiles[index] = {};
}

let selector: Objec;
// let sprites: Objec[] = [];

interface Sidepane {
  textures: string[];
}
//Gets the shader that the model belongs to from name. Assumes models have a one-to-one relation with shaders
let textureGroup: string[];

const temp = new FScreen('canvas');
const cam = temp.AddCamera([0.0, 0.0], [0.8, 1.0], 0);
cam.zoom = 50;
cam.RecalculateProjMatrix();
const sidebar = temp.AddCamera([0.8, 0.0], [1.0, 1.0], 1);
cam.PreDraw();

Setup();

async function Setup() {
  //Load 2d shader, plus the model
  await LoadShader(cam, '2DspriteVertexShader.vs', 'spriteFragmentShader.fs');
  const modelData = await LoadModel(temp, 'verSprite.json');
  temp.shaders[0].CreateModel('verSprite.json', modelData);

  //Processing textures to be loaded. Shouldn't this be a part of the map?
  const sidepaneData: Sidepane[] = JSON.parse(
    await LoadFileText('../rpg_sidepanes.json'),
  ).sidepanes;

  textureGroup = sidepaneData.flatMap((sidepane) => sidepane.textures);
  for (let i = 0; i < textureGroup.length; i++) {
    await CreateTexture(temp, textureGroup[i]);
  }

  // Load sidebar
  const width = sidebar.pxWidth / 4;
  for (let i = 0; i < textureGroup.length; i++) {
    temp.shaders[0].InstanceObject(
      'verSprite.json',
      new RotPos2D(
        [
          sidebar.pxWidth / 2 - ((i % 4) + 1) * width + sidebar.pxWidth / 8,
          sidebar.pxHeight / 2 - width * (Math.floor(i / 4) + 1) + sidebar.pxWidth / 8,
        ],
        Math.PI,
        [sidebar.pxWidth / 8, sidebar.pxWidth / 8],
      ),
      1,
      textureGroup[i],
    );
  }
  // sprites = temp.shaders[0].models['verSprite.json'].objects;

  await CreateTexture(temp, 'tframe.png');
  selector = temp.shaders[0].InstanceObject(
    'verSprite.json',
    new RotPos2D(
      [
        sidebar.pxWidth / 2 - width + sidebar.pxWidth / 8,
        sidebar.pxHeight / 2 - width + sidebar.pxWidth / 8,
      ],
      Math.PI,
      [sidebar.pxWidth / 8, sidebar.pxWidth / 8],
    ),
    1,
    'tframe.png',
  );

  await LoadShader(cam, 'grid.vs', 'grid.fs');
  const plane = await LoadModel(temp, 'verSprite.json');
  temp.shaders[1].CreateModel('verSprite.json', plane);
  temp.shaders[1].InstanceObject('verSprite.json', new RotPos2D([0.0, 0.0]), 0);

  cam.SetUniform('u_resolution', [cam.pxWidth, cam.pxHeight]);

  requestAnimationFrame(RenderLoop);
}

//Should only be called once per animation frame. Starts a loop of updating shaders.
function RenderLoop() {
  temp.gl.clear(temp.gl.COLOR_BUFFER_BIT | temp.gl.DEPTH_BUFFER_BIT);

  //Should do much less draws here, but for now things seem to be fine
  cam.PreDraw();

  temp.shaders[1].DrawScene(0);

  //Draws sprites
  temp.shaders[0].DrawScene(0);

  DrawSidebar();
}

function DrawSidebar() {
  sidebar.PreDraw();

  //Draw sidebar
  temp.shaders[0].DrawScene(1);
}

// Downloads the map
temp.keyDownCallbacks['KeyC'] = () => {
  const element = document.createElement('a');

  let text = '';
  for (let i = -50; i <= 50; i++) {
    for (let j = -50; j <= 50; j++) {
      if (tiles[i][j] != undefined) {
        text += tiles[i][j].texId;
      } else {
        text += ' ';
      }
    }
    text += '\r\n';
  }
  element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
  element.setAttribute('download', 'map');

  element.style.display = 'none';
  document.body.appendChild(element);

  element.click();

  document.body.removeChild(element);
};

temp.keyDownCallbacks['Enter'] = () => {
  toggleFullScreen();
};

temp.keyDownCallbacks['Space'] = () => {
  mode = mode === MODES.MOVE ? MODES.PLACE : MODES.MOVE;
  document.body.style.cursor = mode === MODES.MOVE ? 'grab' : 'pointer';
};

//For placing tiles
cam.onMouseDown = (e) => {
  if (mode === MODES.MOVE) {
    document.body.style.cursor = 'grab';
    return;
  }

  //Positions on the grid
  const posX = Math.floor(
    (-cam.rotpos.position[0] + (cam.pxWidth * cam.zoom) / 2 - e.pageX * cam.zoom) / 50.0,
  );
  const posY = Math.floor(
    (-cam.rotpos.position[1] + (cam.pxHeight * cam.zoom) / 2 - e.pageY * cam.zoom) / 50.0,
  );

  // Delete tile on Z
  if (temp.keysDown['KeyZ'] == true && tiles[posX][posY] != undefined) {
    // temp.shaders[0].DeleteObject("verSprite.json", tiles[posX][posY]);
    delete tiles[posX][posY];

    requestAnimationFrame(RenderLoop);
    return;
  }

  if (tiles[posX][posY] != undefined) {
    tiles[posX][posY].texId = (tile + 1) % textureGroup.length; //This basically forces the first few textures to be part of the texturegroup
  } else {
    tiles[posX][posY] = temp.shaders[0].InstanceObject(
      'verSprite.json',
      new RotPos2D([posX * 50.0 + 25.0, posY * 50.0 + 25.0], Math.PI, [25.0, 25.0]),
      0,
      textureGroup[tile],
    );
  }

  requestAnimationFrame(RenderLoop);
};

cam.onMouseMove = (e) => {
  if (mode === MODES.MOVE) {
    if (e.buttons === 1) {
      document.body.style.cursor = 'grabbing';
      cam.rotpos.position[0] -= e.movementX / cam.zoom;
      cam.rotpos.position[1] -= e.movementY / cam.zoom;

      cam.UpdatePos();

      requestAnimationFrame(RenderLoop);
    } else {
      document.body.style.cursor = 'grab';
    }
  }
};

sidebar.onMouseDown = (e) => {
  const x = Math.floor((e.pageX - cam.pxWidth) / (sidebar.pxWidth / 4));
  const y = Math.floor(e.pageY / (sidebar.pxWidth / 4));

  if (textureGroup[x + 4 * y] != undefined) {
    tile = x + 4 * y;
    selector.rotpos.position[0] =
      sidebar.pxWidth / 2 - ((x % 4) * sidebar.pxWidth) / 4 - sidebar.pxWidth / 8;
    //TODO: Implement y-selector for this

    requestAnimationFrame(RenderLoop);
  }
};

// document.addEventListener('mousemove', (e) => {
//   if (mouse === MOUSE.ADJUSTING || (cam.pxWidth - 5 < e.pageX && e.pageX < cam.pxWidth + 5)) {
//     //For changing lengths of windows. Not great right now, because the cursor can slip off this very easily. To work on later
//     if (e.buttons === 1) {
//       mouse = MOUSE.ADJUSTING;
//       cam.pxWidth += e.movementX;
//       cam.width = cam.pxWidth / temp.canvas.width;

//       cam.RecalculateProjMatrix();

//       //Resize sidebar
//       sidebar.pxWidth -= e.movementX;
//       sidebar.width = sidebar.pxWidth / temp.canvas.width;
//       sidebar.tlCorner[0] = sidebar.brCorner[0] - sidebar.pxWidth / temp.canvas.width; //(a*b - c) / b == a - c / b

//       sidebar.RecalculateProjMatrix();

//       //Resize sidebar elements
//       let j = 0;
//       for (let i = 0; i < sprites.length; i++) {
//         if (sprites[i].worldIndex != 1) {
//           return;
//         }

//         sprites[i].rotpos.scale[0] = sidebar.pxWidth / 8;
//         sprites[i].rotpos.scale[1] = sidebar.pxWidth / 8;

//         sprites[i].rotpos.position[0] =
//           sidebar.pxWidth / 2 - (((j % 4) + 1) * sidebar.pxWidth) / 4 + sidebar.pxWidth / 8;
//         sprites[i].rotpos.position[1] =
//           sidebar.pxHeight / 2 -
//           (sidebar.pxWidth / 4) * (Math.floor(j / 4) + 1) +
//           sidebar.pxWidth / 8;
//         j += 1;
//       }

//       requestAnimationFrame(RenderLoop);
//     }
//   } else if (mode === MODES.MOVE && e.pageX < cam.pxWidth - 5) {
//     // Highlight the spot

//     if (e.buttons === 1) {
//       document.body.style.cursor = 'grabbing';
//       cam.rotpos.position[0] -= e.movementX * cam.zoom;
//       cam.rotpos.position[1] -= e.movementY * cam.zoom;

//       cam.UpdatePos();

//       requestAnimationFrame(RenderLoop);
//     } else {
//       document.body.style.cursor = 'grab';
//     }
//   }
// });

//Zooming
document.addEventListener('wheel', (e) => {
  if (e.pageX > cam.pxWidth) return;

  cam.zoom -= e.deltaY / 5;

  //Zoom cap
  cam.zoom = Math.max(20, cam.zoom);

  cam.RecalculateProjMatrix();

  requestAnimationFrame(RenderLoop);
});

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

  requestAnimationFrame(RenderLoop);
});
