import { FScreen, toggleFullScreen } from '../screen.js';
import { LoadFileText, CreateTexture, LoadModel, LoadShader } from '../loading.js';
import { Objec, RotPos2D } from '../objec.js';
import { run_rpg } from './rpg.js';

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

async function Setup() {
  //Load 2d shader, plus the model
  const sprite_shader = await LoadShader(cam, '2DspriteVertexShader.vs', 'spriteFragmentShader.fs');
  const modelData = await LoadModel(temp, 'verSprite.json');
  sprite_shader.CreateModel('verSprite.json', modelData);

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
    sprite_shader.InstanceObject(
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

  await CreateTexture(temp, 'tframe.png');
  selector = sprite_shader.InstanceObject(
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

  const grid_shader = await LoadShader(cam, 'grid.vs', 'grid.fs');
  const plane = await LoadModel(temp, 'verSprite.json');
  grid_shader.CreateModel('verSprite.json', plane);
  grid_shader.InstanceObject('verSprite.json', new RotPos2D([0.0, 0.0]), 0);

  cam.SetUniform('u_resolution', [cam.pxWidth, cam.pxHeight]);

  return [sprite_shader];
}

const [sprite_shader] = await Setup();
requestAnimationFrame(RenderLoop);

//Should only be called once per animation frame. Starts a loop of updating shaders.
function RenderLoop() {
  temp.gl.clear(temp.gl.COLOR_BUFFER_BIT | temp.gl.DEPTH_BUFFER_BIT);

  //Should do much less draws here, but for now things seem to be fine
  cam.Draw();
  sidebar.Draw();
}

function get_map() {
  const map = [];
  for (let i = -50; i <= 50; i++) {
    let row = '';
    for (let j = -50; j <= 50; j++) {
      if (tiles[i][j] != undefined) {
        row += tiles[i][j].texId;
      } else {
        row += ' ';
      }
    }
    map.push(row);
  }

  return map;
}

// Downloads the map
temp.keyDownCallbacks['KeyC'] = () => {
  const element = document.createElement('a');

  const map = get_map().join('\r\n');
  element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(map));
  element.setAttribute('download', 'map');

  element.style.display = 'none';
  document.body.appendChild(element);

  element.click();

  document.body.removeChild(element);
};

temp.keyDownCallbacks['KeyU'] = () => {
  const map = get_map();
  run_rpg(map);
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

  const cursorWorldPosition = cam.CursorToWorldPosition([e.pageX, e.pageY]);
  const posX = Math.floor(cursorWorldPosition.x);
  const posY = Math.floor(cursorWorldPosition.y);

  //Positions on the grid

  // Delete tile on Z
  if (temp.keysDown['KeyZ'] == true && tiles[posX][posY] != undefined) {
    // temp.shaders[0].DeleteObject("verSprite.json", tiles[posX][posY]);
    delete tiles[posX][posY];

    requestAnimationFrame(RenderLoop);
    return;
  }

  if (tiles[posX][posY] != undefined) {
    tiles[posX][posY].texId = temp.texIds[textureGroup[tile]];
  } else {
    tiles[posX][posY] = sprite_shader.InstanceObject(
      'verSprite.json',
      new RotPos2D([-posX - 0.5, posY + 0.5], Math.PI, [0.5, 0.5]),
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

cam.onWheel = (e) => {
  cam.zoom -= e.deltaY / 5;

  //Zoom cap
  cam.zoom = Math.max(20, cam.zoom);

  cam.RecalculateProjMatrix();

  requestAnimationFrame(RenderLoop);
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
