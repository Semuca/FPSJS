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

  //Sets up a texture in the webgl context
  CreateTexture(name: string, texture: TexImageSource) {
    //This could be fixed to allow deletion of textures to reclaim ids, but i don't really care
    const tex_id = Object.entries(this.textures).length;
    this.texIds[name] = tex_id;
    this.textures[tex_id] = texture;
    return tex_id;
  }
}
