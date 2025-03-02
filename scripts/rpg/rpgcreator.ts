import { FScreen, toggleFullScreen } from '../screen';
import { LoadTexture, LoadModel, LoadShader } from '../loading';
import { Model, Objec, RotPos2D, Scale2D, ScaleType } from '../objec';
import { run_rpg } from './rpg_scene';
import { Scene } from '../scene';
import { CameraData } from '../camera';
import { serialize_tilemap, TileMap } from './types';

const MODES = {
  MOVE: 0,
  PLACE: 1,
};

let mode = MODES.PLACE;

let tile = 0;
const tilemap: TileMap = {};

let selector: Objec;

const scene = new Scene();
const cam = new CameraData({ scene, width: 0.8, zoom: 50, worldIndex: 0 });
const sidebar = new CameraData({ scene, tlCorner: [0.8, 0.0], width: 0.2, worldIndex: 1 });

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

  // Load sidebar
  const tileset = await LoadTexture(scene, '../rtp/Graphics/Tilesets/Dungeon_B.png');
  sprite.create_objec(
    new Objec({
      model: sprite,
      rotpos: new RotPos2D(
        [0, 0],
        Math.PI,
        Scale2D.of_width_percent(0.5, { type: ScaleType.Ratio, value: 1 }),
      ),
      texId: tileset,
      worldIndex: 1,
    }),
  );

  await LoadTexture(scene, 'tframe.png');
  selector = new Objec({
    model: sprite,
    rotpos: new RotPos2D(
      [0, 0],
      Math.PI,
      Scale2D.of_width_percent(1 / 32, { type: ScaleType.Ratio, value: 1 }),
    ),
    texId: scene.texIds['tframe.png'],
    worldIndex: 1,
  });
  sprite.create_objec(selector);

  return [sprite_shader];
}

const [sprite_shader] = await Setup();
const screen = new FScreen('canvas', scene);
select_tile(0, 0);
requestAnimationFrame(RenderLoop);

//Should only be called once per animation frame. Starts a loop of updating shaders.
function RenderLoop() {
  screen.draw();
}

// Downloads the map
scene.keyDownCallbacks['KeyC'] = () => {
  const element = document.createElement('a');

  element.setAttribute(
    'href',
    'data:text/plain;charset=utf-8,' +
      encodeURIComponent(JSON.stringify(serialize_tilemap(tilemap))),
  );
  element.setAttribute('download', 'map');

  element.style.display = 'none';
  document.body.appendChild(element);

  element.click();

  document.body.removeChild(element);
};

scene.keyDownCallbacks['KeyU'] = async () => {
  await run_rpg(serialize_tilemap(tilemap), screen);
  screen.set_scene(scene);
  requestAnimationFrame(RenderLoop);
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
  if (screen.keysDown['KeyZ'] == true && tilemap[posX][posY] != undefined) {
    tilemap[posX][posY].objec.Destructor();
    delete tilemap[posX][posY];

    requestAnimationFrame(RenderLoop);
    return;
  }

  if (screen.keysDown['KeyE'] == true) {
    const model = sprite_shader.models.find((model) => model.name === 'verSprite.json') as Model;

    model.create_objec(
      new Objec({
        model,
        rotpos: new RotPos2D([-posX - 0.5, posY + 0.5], Math.PI, Scale2D.of_px(0.5, 0.5)),
        texId: scene.texIds['tframe.png'],
      }),
    );

    requestAnimationFrame(RenderLoop);
    return;
  }

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

  if (!tilemap[posX]) tilemap[posX] = {};

  if (tilemap[posX][posY] != undefined) {
    tilemap[posX][posY].objec.overridden_attribs = {
      aTextureCoord: texture_attribute,
    };
  } else {
    const model = sprite_shader.models.find((model) => model.name === 'verSprite.json') as Model;
    tilemap[posX][posY] = {
      objec: new Objec({
        model,
        rotpos: new RotPos2D([-posX - 0.5, posY + 0.5], Math.PI, Scale2D.of_px(0.5, 0.5)),
        texId: scene.texIds['../rtp/Graphics/Tilesets/Dungeon_B.png'],
        overridden_attribs: {
          aTextureCoord: texture_attribute,
        },
      }),
      data: { tile },
    };

    model.create_objec(tilemap[posX][posY].objec);
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

sidebar.onMouseDown = (e) => {
  // TODO: I reckon this code would be much simpler if the square was aligned on the top-left corner
  const num_squares_wide = 16;
  const square_size = screen.cameras[1].pxWidth / num_squares_wide;
  const cursorWorldPosition = screen.cameras[1].CursorToWorldPosition([e.pageX, e.pageY]);

  const x = Math.floor((cursorWorldPosition.x + screen.cameras[1].pxWidth / 2) / square_size);
  const y = -1 - Math.floor((cursorWorldPosition.y - screen.cameras[1].pxWidth / 2) / square_size);

  select_tile(x, y);
};

function select_tile(x: number, y: number) {
  const num_squares_wide = 16;
  const square_size = screen.cameras[1].pxWidth / num_squares_wide;

  selector.rotpos.position[0] =
    (num_squares_wide * square_size) / 2 - x * square_size - square_size / 2;
  selector.rotpos.position[1] =
    (num_squares_wide * square_size) / 2 - y * square_size - square_size / 2;

  tile = y * num_squares_wide + x;

  requestAnimationFrame(RenderLoop);
}
