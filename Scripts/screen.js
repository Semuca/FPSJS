import { Shader, Camera } from "./shader.js";

export const SCREENACTION = {
  IDLE: 0,
  RESIZING: 1,
}

// Fills up one canvas
export class Screen {
    //Constructor requires an identifier for a canvas
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
      this.margin = 5;

      //A lot of this texture stuff needs to be sorted out. Redundancies induce discrepencies, especially when deleting textures
      //Is there a better way to store these?
      this.texObjects = {}; //TextureID to Texture Objects hashmap (Maybe include texture names later too)
      this.texIds = {}; //Texture name to TextureID hashmap

      // Add event listeners to mouse events
      this.screenAction = SCREENACTION.IDLE;
      this.resizingCameras = [];

      document.addEventListener("mousedown", e => {
        const focussedCameras = this.getCamerasFromCursor(e);

        // If there are multiple cameras, start resizing
        if (focussedCameras.length >= 2) {
          this.screenAction = SCREENACTION.RESIZING;
          this.resizingCameras = focussedCameras;
        } else if (focussedCameras.length == 1) {
          focussedCameras.at(0).onMouseDown(e);
        }
      });

      document.addEventListener("mousemove", e => {
        if (this.screenAction === SCREENACTION.RESIZING) {
          // TODO: Resize the two cameras
          // cam.pxWidth += e.movementX;
          // cam.width = cam.pxWidth / temp.canvas.width;

          // cam.RecalculateProjMatrix();

          // Resize sidebar
          // sidebar.pxWidth -= e.movementX;
          // sidebar.width = sidebar.pxWidth / temp.canvas.width;
          // sidebar.tlCorner[0] = sidebar.brCorner[0] - sidebar.pxWidth / temp.canvas.width; //(a*b - c) / b == a - c / b

          // sidebar.RecalculateProjMatrix();

          // Resize sidebar elements
          // let j = 0;
          // for (let i = 0; i < sprites.length; i++) {
          //  if (sprites[i].worldIndex != 1) {
          //    return;
          //  }

          //  sprites[i].rotpos.scale[0] = sidebar.pxWidth / 8;
          //  sprites[i].rotpos.scale[1] = sidebar.pxWidth / 8;

          //  sprites[i].rotpos.position[0] = sidebar.pxWidth / 2 - ((j % 4) + 1) * sidebar.pxWidth / 4 + sidebar.pxWidth / 8;
          //  sprites[i].rotpos.position[1] = sidebar.pxHeight / 2 - sidebar.pxWidth / 4 * (Math.floor(j / 4) + 1) + sidebar.pxWidth / 8;
          //  j += 1;
          // }

          //requestAnimationFrame(RenderLoop);
          return;
        }

        const focussedCameras = this.getCamerasFromCursor(e);

        // If there are multiple cameras, start resizing
        if (focussedCameras.length >= 2) {
          document.body.style.cursor = "ew-resize";
        } else if (focussedCameras.length == 1) {
          document.body.style.cursor = focussedCameras.at(0).cursor;
        }

        if (focussedCameras.length == 1) {
          focussedCameras.at(0).onMouseMove(e);
        }
      });

      document.addEventListener("mouseup", e => {
        // If just done resizing, end here
        if (this.screenAction === SCREENACTION.RESIZING) {
          this.screenAction = SCREENACTION.IDLE;
          this.resizingCameras = [];
          return;
        }

        const focussedCameras = this.getCamerasFromCursor(e);

        if (focussedCameras.length == 1) {
          focussedCameras.at(0).onMouseUp(e);
        }
      });

      // Manage what keys are being held down
      this.keysDown = {};
      this.keyDownCallbacks = {};
      this.keyUpCallbacks = {};

      window.addEventListener("keydown", e => {
        this.keysDown[e.code] = true;
        if (this.keyDownCallbacks[e.code]) {
          this.keyDownCallbacks[e.code]();
        }
      });

      window.addEventListener("keyup", e => {
        this.keysDown[e.code] = false;
        if (this.keyUpCallbacks[e.code]) {
          this.keyUpCallbacks[e.code]();
        }
      });
    }

    getCamerasFromCursor(e) {
      return this.cameras.filter((camera) =>
        (camera.tlCorner[0] * this.canvas.width - this.margin <= e.pageX && e.pageX <= camera.brCorner[0] * this.canvas.width + this.margin) &&
        (camera.tlCorner[1] * this.canvas.height - this.margin <= e.pageY && e.pageY <= camera.brCorner[1] * this.canvas.height + this.margin)
      );
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

      //Adjusts texture parameters
      this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST); //This removes blurring
      this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
      this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.REPEAT);
      this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.REPEAT);

      this.gl.generateMipmap(this.gl.TEXTURE_2D); //WebGL 1 can only mipmap even-height and width textures. I know this is webgl2, but should think about compatability

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

//Toggles fullscreen
export function toggleFullScreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen();
  } else {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    }
  }
}
