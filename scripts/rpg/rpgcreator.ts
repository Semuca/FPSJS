import { FScreen, toggleFullScreen } from '../screen.js';
import { LoadFileText, LoadTexture, LoadModel, LoadShader } from '../loading.js';
import { Model, Objec, RotPos2D, Scale2D, ScaleType } from '../objec.js';
import { run_rpg } from './rpg.js';
import { Scene } from '../scene.js';
import { CameraData } from '../shader.js';

const MODES = {
  MOVE: 0,
  PLACE: 1,
};

let mode = MODES.MOVE;

const tile = 0;
const tiles: Record<number, Record<number, Objec>> = {};
for (let index = -50; index <= 50; index++) {
  tiles[index] = {};
}

// let selector: Objec;

interface Sidepane {
  textures: string[];
}

//Gets the shader that the model belongs to from name. Assumes models have a one-to-one relation with shaders
let textureGroup: string[];

const scene = new Scene();
const cam = new CameraData({ scene, width: 0.8, zoom: 50, worldIndex: 0 });
new CameraData({ scene, tlCorner: [0.8, 0.0], width: 0.2, worldIndex: 1 });

async function Setup() {
  const grid_shader = await LoadShader(scene, 'grid.vs', 'grid.fs');
  const grid_versprite = await LoadModel(grid_shader, 'verSprite.json');
  grid_versprite.create_objec(
    new Objec({ model: grid_versprite, rotpos: new RotPos2D([0.0, 0.0]) }),
  );

  //Load 2d shader, plus the model
  const sprite_shader = await LoadShader(
    scene,
    '2DspriteVertexShader.vs',
    'spriteFragmentShader.fs',
  );
  const sprite = await LoadModel(sprite_shader, 'verSprite.json');

  //Processing textures to be loaded. Shouldn't this be a part of the map?
  const sidepaneData: Sidepane[] = JSON.parse(
    await LoadFileText('../rpg_sidepanes.json'),
  ).sidepanes;

  textureGroup = sidepaneData.flatMap((sidepane) => sidepane.textures);
  for (let i = 0; i < textureGroup.length; i++) {
    await LoadTexture(scene, textureGroup[i]);
  }

  // Load sidebar
  const tileset = await LoadTexture(scene, '../rtp/Graphics/Tilesets/Outside_A2.png');
  sprite.create_objec(
    new Objec({
      model: sprite,
      rotpos: new RotPos2D(
        [50, 50],
        Math.PI,
        Scale2D.of_width_percent(1, { type: ScaleType.Ratio, value: 1 }),
      ),
      texId: tileset,
      worldIndex: 1,
    }),
  );

  // await LoadTexture(scene, 'tframe.png');
  // selector = sprite_shader.InstanceObject(
  //   'verSprite.json',
  //   new RotPos2D(
  //     [
  //       sidebar.pxWidth / 2 - width + sidebar.pxWidth / 8,
  //       sidebar.pxHeight / 2 - width + sidebar.pxWidth / 8,
  //     ],
  //     Math.PI,
  //     [sidebar.pxWidth / 8, sidebar.pxWidth / 8],
  //   ),
  //   1,
  //   'tframe.png',
  // );

  return [sprite_shader];
}

const [sprite_shader] = await Setup();
const screen = new FScreen('canvas', scene);
requestAnimationFrame(RenderLoop);

//Should only be called once per animation frame. Starts a loop of updating shaders.
function RenderLoop() {
  screen.gl.clear(screen.gl.COLOR_BUFFER_BIT | screen.gl.DEPTH_BUFFER_BIT);

  //Should do much less draws here, but for now things seem to be fine
  screen.cameras.forEach((camera) => camera.Draw());
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
scene.keyDownCallbacks['KeyC'] = () => {
  const element = document.createElement('a');

  const map = get_map().join('\r\n');
  element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(map));
  element.setAttribute('download', 'map');

  element.style.display = 'none';
  document.body.appendChild(element);

  element.click();

  document.body.removeChild(element);
};

scene.keyDownCallbacks['KeyU'] = () => {
  const map = get_map();
  run_rpg(screen, map);
};

scene.keyDownCallbacks['Enter'] = () => {
  toggleFullScreen();
};

scene.keyDownCallbacks['Space'] = () => {
  mode = mode === MODES.MOVE ? MODES.PLACE : MODES.MOVE;
  document.body.style.cursor = mode === MODES.MOVE ? 'grab' : 'pointer';
};

//For placing tiles
cam.onMouseDown = (e) => {
  if (mode === MODES.MOVE) {
    document.body.style.cursor = 'grab';
    return;
  }

  const cursorWorldPosition = screen.cameras[0].CursorToWorldPosition([e.pageX, e.pageY]);
  const posX = Math.floor(cursorWorldPosition.x);
  const posY = Math.floor(cursorWorldPosition.y);

  //Positions on the grid

  // Delete tile on Z
  if (screen.keysDown['KeyZ'] == true && tiles[posX][posY] != undefined) {
    // temp.shaders[0].DeleteObject("verSprite.json", tiles[posX][posY]);
    delete tiles[posX][posY];

    requestAnimationFrame(RenderLoop);
    return;
  }

  if (tiles[posX][posY] != undefined) {
    tiles[posX][posY].texId = scene.texIds[textureGroup[tile]];
  } else {
    const model = sprite_shader.models.find((model) => model.name === 'verSprite.json') as Model;
    tiles[posX][posY] = new Objec({
      model,
      rotpos: new RotPos2D([-posX - 0.5, posY + 0.5], Math.PI, Scale2D.of_px(0.5, 0.5)),
      texId: scene.texIds[textureGroup[tile]],
    });

    model.create_objec(tiles[posX][posY]);
  }

  requestAnimationFrame(RenderLoop);
};

cam.onMouseMove = (e) => {
  if (mode === MODES.MOVE) {
    if (e.buttons === 1) {
      document.body.style.cursor = 'grabbing';
      cam.rotpos.position[0] -= e.movementX / cam.zoom;
      cam.rotpos.position[1] -= e.movementY / cam.zoom;

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

  requestAnimationFrame(RenderLoop);
};

// sidebar.onMouseDown = (e) => {
//   const x = Math.floor((e.pageX - cam.pxWidth) / (sidebar.pxWidth / 4));
//   const y = Math.floor(e.pageY / (sidebar.pxWidth / 4));

//   if (textureGroup[x + 4 * y] != undefined) {
//     tile = x + 4 * y;
//     selector.rotpos.position[0] =
//       sidebar.pxWidth / 2 - ((x % 4) * sidebar.pxWidth) / 4 - sidebar.pxWidth / 8;
//     //TODO: Implement y-selector for this

//     requestAnimationFrame(RenderLoop);
//   }
// };
