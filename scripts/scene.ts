import { CameraData } from './camera';
import { ShaderData } from './shader';

export class Scene {
  shader_data: ShaderData[] = [];
  camera_data: CameraData[] = [];

  textures: Record<number, TexImageSource> = {};
  texIds: Record<string, number> = {}; //Texture name to TextureID hashmap

  keyDownCallbacks: Record<string, () => void> = {};
  keyUpCallbacks: Record<string, () => void> = {};

  //Not entirely set on the structure here, maybe think about it later
  AddShader(shader_data: ShaderData) {
    this.shader_data.push(shader_data);
  }

  //tlCorner and brCorner are in percentage of screenspace taken up. Might be good to also have an option for pixels
  AddCamera(camera_data: CameraData) {
    this.camera_data.push(camera_data);
  }

  //Sets up a texture in the webgl context
  CreateTexture(name: string, texture: TexImageSource) {
    //This could be fixed to allow deletion of textures to reclaim ids, but i don't really care
    const tex_id = Object.entries(this.textures).length;
    this.texIds[name] = tex_id;
    this.textures[tex_id] = texture;
    return tex_id;

    //Creates texture and binds it to WebGL
    // const texture = this.screen.gl.createTexture();
    // this.textures[texId] = texture;
    // this.screen.gl.activeTexture(this.screen.gl.TEXTURE0 + texId);
    // this.screen.gl.bindTexture(this.screen.gl.TEXTURE_2D, texture);

    // //Puts image into texture
    // this.screen.gl.texImage2D(
    //   this.screen.gl.TEXTURE_2D,
    //   0,
    //   this.screen.gl.RGBA,
    //   this.screen.gl.RGBA,
    //   this.screen.gl.UNSIGNED_BYTE,
    //   tex,
    // );

    // //Adjusts texture parameters
    // this.screen.gl.texParameteri(
    //   this.screen.gl.TEXTURE_2D,
    //   this.screen.gl.TEXTURE_MAG_FILTER,
    //   this.screen.gl.NEAREST,
    // ); //This removes blurring
    // this.screen.gl.texParameteri(
    //   this.screen.gl.TEXTURE_2D,
    //   this.screen.gl.TEXTURE_MIN_FILTER,
    //   this.screen.gl.LINEAR,
    // );
    // this.screen.gl.texParameteri(
    //   this.screen.gl.TEXTURE_2D,
    //   this.screen.gl.TEXTURE_WRAP_S,
    //   this.screen.gl.CLAMP_TO_EDGE,
    // );
    // this.screen.gl.texParameteri(
    //   this.screen.gl.TEXTURE_2D,
    //   this.screen.gl.TEXTURE_WRAP_T,
    //   this.screen.gl.CLAMP_TO_EDGE,
    // );

    // this.screen.gl.generateMipmap(this.screen.gl.TEXTURE_2D);
  }
}
