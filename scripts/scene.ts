import { CameraData } from './camera';
import { CameraTree } from './screen';
import { ShaderData } from './shader';

export class Scene {
  shader_data: ShaderData[] = [];
  camera_tree: CameraTree<CameraData> = [];

  textures: Record<number, TexImageSource> = {};
  texIds: Record<string, number> = {}; //Texture name to TextureID hashmap

  keyDownCallbacks: Record<string, () => void> = {};
  keyUpCallbacks: Record<string, () => void> = {};

  //Not entirely set on the structure here, maybe think about it later
  AddShader(shader_data: ShaderData) {
    this.shader_data.push(shader_data);
  }

  AddCameraTree(camera_tree: CameraTree<CameraData>) {
    this.camera_tree = camera_tree;
  }

  // Sets up a texture in the webgl context
  CreateTexture(name: string, texture: TexImageSource) {
    // This could be fixed to allow deletion of textures to reclaim ids, but i don't really care
    const tex_id = Object.entries(this.textures).length;
    this.texIds[name] = tex_id;
    this.textures[tex_id] = texture;
    return tex_id;
  }
}

export class TextureAtlas {
  constructor(
    public tex_id: number,
    public tiles_wide: number, // These two should be derivable from size
    public tiles_high: number,
  ) {}

  get_from_num(tile: number) {
    const tex_x = (tile % this.tiles_wide) / this.tiles_wide;
    const tex_y = Math.floor(tile / this.tiles_wide) / this.tiles_high;
    const size_x = 1 / this.tiles_wide;
    const size_y = 1 / this.tiles_high;

    return new Float32Array([
      tex_x + size_x,
      tex_y,
      tex_x,
      tex_y + size_y,
      tex_x + size_x,
      tex_y + size_y,
      tex_x,
      tex_y,
    ]);
  }
}
