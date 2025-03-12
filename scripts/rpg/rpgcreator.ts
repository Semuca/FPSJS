import { FScreen, HorizontalCameraLine, toggleFullScreen, VerticalCameraLine } from '../screen';
import { LoadTexture, LoadModel, LoadShader } from '../loading';
import { Model, Objec, RotPos2D, Scale2D } from '../objec';
import { run_rpg } from './rpg_scene';
import { Scene, TextureAtlas } from '../scene';
import { CameraData, HorizontalCameraBound, TopOrBottom, ZoomCameraBound } from '../camera';
import { serialize_tilemap, TileMap } from './types';
import { DisplayBox } from './dialog';

const MODES = {
  MOVE: 0,
  PLACE: 1,
};

let mode = MODES.PLACE;

let tile = 0;
const tilemap: TileMap = {};

const num_squares_wide = 16;
let texture_atlas: TextureAtlas;

let selector: Objec;

const scene = new Scene();
const cam_bounds = new ZoomCameraBound(100);
const cam = new CameraData({ scene, width: 0.8, bounds: cam_bounds, worldIndex: 0 });
const sidebar = new CameraData({
  scene,
  tlCorner: [0.8, 0.0],
  width: 0.2,
  height: 0.5,
  bounds: new HorizontalCameraBound(num_squares_wide / 2, -num_squares_wide / 2, {
    type: TopOrBottom.Top,
    value: num_squares_wide / 2,
  }),
  worldIndex: 1,
});
const other_sidebar = new CameraData({
  scene,
  tlCorner: [0.8, 0.5],
  width: 0.2,
  height: 0.5,
  bounds: new HorizontalCameraBound(num_squares_wide / 2, -num_squares_wide / 2, {
    type: TopOrBottom.Top,
    value: num_squares_wide / 2,
  }),
  worldIndex: 1,
});
scene.AddCameraTree([
  new VerticalCameraLine(cam, new HorizontalCameraLine(sidebar, other_sidebar, 0.5), 0.8),
]);

async function Setup() {
  const grid_shader = await LoadShader(scene, 'grid.vs', 'grid.fs');
  const grid_versprite = await LoadModel(grid_shader, 'verSprite.json');
  grid_versprite.create_objec(
    new Objec({ model: grid_versprite, rotpos: new RotPos2D([0, 0, 0]) }),
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
  texture_atlas = new TextureAtlas(tileset, num_squares_wide, num_squares_wide);
  sprite.create_objec(
    new Objec({
      model: sprite,
      rotpos: new RotPos2D(
        [0, 0, 0],
        Math.PI,
        Scale2D.of_px(num_squares_wide / 2, num_squares_wide / 2),
      ),
      texId: tileset,
      worldIndex: 1,
    }),
  );

  const tframe_tex = await LoadTexture(scene, 'tframe.png');
  selector = new Objec({
    model: sprite,
    rotpos: new RotPos2D([0, 0, 0], Math.PI, Scale2D.of_px(0.5, 0.5)),
    texId: tframe_tex,
    worldIndex: 1,
  });
  sprite.create_objec(selector);

  const white_tex_id = await LoadTexture(scene, 'white.png');
  const black_tex_id = await LoadTexture(scene, 'black.png');

  return [sprite_shader, sprite, white_tex_id, black_tex_id];
}

const [sprite_shader, sprite, white_tex_id, black_tex_id] = await Setup();
DisplayBox(sprite as Model, white_tex_id as number, black_tex_id as number);
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
  if (screen.keysDown['KeyZ'] == true) {
    if (tilemap[posX][posY] != undefined) {
      tilemap[posX][posY].objec.Destructor();
      delete tilemap[posX][posY];

      requestAnimationFrame(RenderLoop);
    }
    return;
  }

  if (screen.keysDown['KeyE'] == true) {
    const model = sprite_shader.models.find((model) => model.name === 'verSprite.json') as Model;

    model.create_objec(
      new Objec({
        model,
        rotpos: new RotPos2D([-posX - 0.5, posY + 0.5, 0], Math.PI, Scale2D.of_px(0.5, 0.5)),
        texId: scene.texIds['tframe.png'],
      }),
    );

    requestAnimationFrame(RenderLoop);
    return;
  }

  const texture_attribute = texture_atlas.get_from_num(tile);

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
        rotpos: new RotPos2D([-posX - 0.5, posY + 0.5, 0], Math.PI, Scale2D.of_px(0.5, 0.5)),
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
      cam.rotpos.position[0] -= (2 * e.movementX) / cam_bounds.zoom;
      cam.rotpos.position[1] -= (2 * e.movementY) / cam_bounds.zoom;

      requestAnimationFrame(RenderLoop);
    } else {
      document.body.style.cursor = 'grab';
    }
  }
};

cam.onWheel = (e) => {
  cam_bounds.zoom -= e.deltaY / 5;

  //Zoom cap
  cam_bounds.zoom = Math.max(40, cam_bounds.zoom);

  requestAnimationFrame(RenderLoop);
};

sidebar.onMouseDown = (e) => {
  // TODO: I reckon this code would be simpler if the square was aligned on the top-left corner
  const cursorWorldPosition = screen.cameras[1].CursorToWorldPosition([e.pageX, e.pageY]);

  const x = Math.floor(cursorWorldPosition.x + num_squares_wide / 2);
  const y = Math.floor(num_squares_wide / 2 - cursorWorldPosition.y);

  if (y < num_squares_wide) select_tile(x, y);
};

function select_tile(x: number, y: number) {
  selector.rotpos.position[0] = num_squares_wide / 2 - x - 0.5;
  selector.rotpos.position[1] = num_squares_wide / 2 - y - 0.5;

  tile = y * num_squares_wide + x;

  requestAnimationFrame(RenderLoop);
}
