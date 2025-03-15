import { FScreen, HorizontalCameraLine, toggleFullScreen, VerticalCameraLine } from '../screen';
import { LoadTexture, LoadModel, LoadShader, LoadFileText } from '../loading';
import { Model, Objec, Position2D, RotPos, RotPos2D, Scale2D } from '../objec';
import { run_rpg } from './rpg_scene';
import { Scene, TextureAtlas } from '../scene';
import { CameraData, HorizontalCameraBound, TopOrBottom, ZoomCameraBound } from '../camera';
import { serialize_tilemap, TileMap } from './types';
import { DialogBox } from './dialog';
import { Font } from '../font';
import { Palette, PaletteCamera } from './creator/palette';

const MODES = {
  MOVE: 0,
  PLACE: 1,
};

let mode = MODES.PLACE;

let palette_camera: PaletteCamera;
const tilemap: TileMap = {};

const num_squares_wide = 16;

const scene = new Scene();
const cam_bounds = new ZoomCameraBound(100);
const cam = new CameraData({ scene, width: 0.8, bounds: cam_bounds, worldIndex: 0 });
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

const base_keydown_callbacks: Record<string, () => void> = {};

// Downloads the map
base_keydown_callbacks['c'] = () => {
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

base_keydown_callbacks['u'] = async () => {
  await run_rpg(serialize_tilemap(tilemap), screen);
  screen.set_scene(scene);
  requestAnimationFrame(RenderLoop);
};

base_keydown_callbacks['b'] = async () => {
  palette_camera.select_pallette(1);
  requestAnimationFrame(RenderLoop);
};

base_keydown_callbacks['Enter'] = () => {
  toggleFullScreen();
};

base_keydown_callbacks[' '] = () => {
  mode = mode === MODES.MOVE ? MODES.PLACE : MODES.MOVE;
  document.body.style.cursor = mode === MODES.MOVE ? 'grab' : 'pointer';
};

async function Setup() {
  const grid_shader = await LoadShader(scene, 'ui.vs', 'grid.fs');
  const grid_versprite = await LoadModel(grid_shader, 'verSprite.json');
  grid_versprite.create_objec(new Objec({ model: grid_versprite, rotpos: new RotPos2D({}) }));

  // Load 2d shader, plus the model
  const sprite_shader = await LoadShader(scene, '2DspriteVertexShader.vs', 'fragmentShader.fs');
  const sprite = await LoadModel(sprite_shader, 'verSprite.json');

  // Load ui shader, plus the model
  const ui_shader = await LoadShader(scene, 'ui.vs', 'fragmentShader.fs');
  const ui_sprite = await LoadModel(ui_shader, 'verSprite.json');

  // Load sidebar
  const tileset_tex = await LoadTexture(scene, '../rtp/Graphics/Tilesets/Dungeon_B.png');
  const faces_tex = await LoadTexture(scene, '../rtp/Graphics/Faces/Actor1.png');
  const tframe_tex = await LoadTexture(scene, 'tframe.png');
  palette_camera = new PaletteCamera(
    scene,
    [
      new Palette(new TextureAtlas(tileset_tex, 16, 16)),
      new Palette(new TextureAtlas(faces_tex, 4, 2)),
    ],
    sprite,
    tframe_tex,
    1,
  );

  scene.AddCameraTree([
    new VerticalCameraLine(
      cam,
      new HorizontalCameraLine(palette_camera.camera_data, other_sidebar, 0.5),
      0.8,
    ),
  ]);

  const white_tex_id = await LoadTexture(scene, 'white.png');
  const black_tex_id = await LoadTexture(scene, 'black.png');

  const font = new Font(
    new TextureAtlas(await LoadTexture(scene, 'def.png'), 8, 8),
    JSON.parse(await LoadFileText('textures/def.json')),
  );
  const dialog_box = new DialogBox(font, ui_sprite, white_tex_id, black_tex_id, '* HELLO WORLD!');

  ' !"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[¥]^_'.split('').forEach((char) => {
    scene.keyDownCallbacks[char.toLowerCase()] = () => {
      dialog_box.text_block.add_characters(char);
      screen.on_resize();
      requestAnimationFrame(RenderLoop);
    };
  });

  scene.keyDownCallbacks['Backspace'] = () => {
    dialog_box.text_block.delete_character();
    requestAnimationFrame(RenderLoop);
  };

  scene.keyDownCallbacks['Escape'] = () => {
    dialog_box.Destructor();
    scene.keyDownCallbacks = base_keydown_callbacks;
    requestAnimationFrame(RenderLoop);
  };

  return [sprite_shader];
}

const [sprite_shader] = await Setup();
const screen = new FScreen('canvas', scene);
requestAnimationFrame(RenderLoop);

//Should only be called once per animation frame. Starts a loop of updating shaders.
function RenderLoop() {
  screen.draw();
}

//For placing tiles
cam.onMouseDown = (e) => {
  if (mode === MODES.MOVE) {
    document.body.style.cursor = 'grab';
    return false;
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

      return true;
    }
    return false;
  }

  if (screen.keysDown['KeyE'] == true) {
    const model = sprite_shader.models.find((model) => model.name === 'verSprite.json') as Model;

    model.create_objec(
      new Objec({
        model,
        rotpos: new RotPos2D({
          position: new Position2D(
            { value: 0, px_mod: -posX - 0.5 },
            { value: 0, px_mod: posY + 0.5 },
            0,
          ),
          scale: Scale2D.of_px(0.5, 0.5),
        }),
        texId: scene.texIds['tframe.png'],
      }),
    );

    return true;
  }

  const texture_attribute = palette_camera.get_texture_attribute();

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
        rotpos: new RotPos({
          position: [-posX - 0.5, posY + 0.5, 0.5],
          scale: [0.5, 0.5, 1],
        }),
        texId: scene.texIds['../rtp/Graphics/Tilesets/Dungeon_B.png'],
        overridden_attribs: {
          aTextureCoord: texture_attribute,
        },
      }),
      data: { tile: palette_camera.current_pallet.selected_tile_index },
    };

    model.create_objec(tilemap[posX][posY].objec);
  }

  return true;
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
