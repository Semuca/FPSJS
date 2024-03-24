import { Shader } from "./shader.js";

//What is placed on the page.
export class Screen {
    //Constructor requires an identifier for a canvas
    //TIDYING STATUS: GREEN
    constructor(canvasID) {
      this.canvas = document.getElementById(canvasID);
      this.canvas.width = this.canvas.clientWidth;
      this.canvas.height = this.canvas.clientHeight;
  
      this.gl = this.canvas.getContext("webgl2");
  
      //Ensure webgl is properly set up
      if (!this.gl) {
        alert("Unable to initialize WebGL. Your browser or machine may not support it.");
        return;
      }
  
      this.shaders = []; //Not entirely set on how I want the window to be constructed, or the relationships between shaders, windows, the canvas and cameras, yet
      this.textures = []; //For the context of webgl, we need to track what objects use what texture
  
      this.cameras = []; //Multiple cameras
  
      //A lot of this texture stuff needs to be sorted out. Redundancies induce discrepencies, especially when deleting textures
      //Is there a better way to store these?
      this.texObjects = {}; //TextureID to Texture Objects hashmap (Maybe include texture names later too)
      this.texIds = {}; //Texture name to TextureID hashmap
      
      // this.keysDown = {};
      // Add event listeners to mouse events
      // document.addEventListener("mousedown", e => {
        
      // });

      // document.addEventListener("mousemove", e => {

      // });

      // document.addEventListener("mouseup", e => {
        
      // });

    }
  
    //Not entirely set on the structure here, maybe think about it later
    AddShader(cam, vsSource, fsSource, type) {
      let shader = new Shader(this, this.gl, cam);
      shader.CompileProgram(vsSource, fsSource);
      shader.type = type;
      this.shaders.push(shader);
    }
  
    //tlCorner and brCorner are in percentage of screenspace taken up. Might be good to also have an option for pixels
    AddCamera(tlCorner, brCorner, type, worldIndex) {
      this.cameras.push(new Camera(this, tlCorner, brCorner, type, worldIndex));
      return this.cameras[this.cameras.length - 1];
    }
  
    //Set up a texture to be rendered by opengl
    SetupTexture(name, tex) {
      let texId = this.GetNewTextureId();
      this.texIds[name] = texId;
      this.texObjects[texId] = this.CreateTexture(tex, texId);
  
      return texId;
    }
  
    //Sets up a texture in the webgl context
    CreateTexture(tex, texId) {
      //Creates texture and binds it to WebGL
      let texture = this.gl.createTexture();
      this.gl.activeTexture(this.gl.TEXTURE0 + texId);
      this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
  
      //Puts image into texture
      this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, tex);
      this.gl.generateMipmap(this.gl.TEXTURE_2D); //WebGL 1 can only mipmap even-height and width textures. I know this is webgl2, but should think about compatability
  
      //Adjusts texture parameters
      this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST); //This removes blurring
      this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
      this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
      this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
  
      return texture;
    }
  
    //Why can't we just join the GetNewTextureId function with CreateTexture function? I can't think of a scenario where one is used without the other
    //Gets new texture ID
    GetNewTextureId() {
      for (let i = 0; i < this.textures.length; i++) { //O(n) time. I think this theoretically could be O(logN), but i don't think it's that important
        if (this.textures[i] != i) {
          this.textures.splice(i, 0, i);
  
          return i;
        }
      }
      this.textures.push(this.textures.length);
      return this.textures.length - 1;
    }
  }