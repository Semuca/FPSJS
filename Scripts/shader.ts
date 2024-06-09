import { mat4 } from 'gl-matrix';
import { Point2D } from './geometry.js';
import { Model, Objec, RotPos, RotPos2D } from './objec.js';
import { FScreen } from './screen.js';
// import { PhysicsScene } from "./physics.js";
import { ModelData } from './loading.js';

//A viewpoint into the world. Main features is having a shader and a rotpos. Should probably implement this later
export class Camera {
  window: FScreen;
  tlCorner: [number, number];
  brCorner: [number, number];
  worldIndex: number;

  width: number;
  height: number;

  aspectRatio: number;

  zoom: number = 1.0;
  zNear = 0.1;
  zFar = 100.0;

  pxWidth: number;
  pxHeight: number;

  // I would like the field of view to be directly proportional to the screen size, but can't figure it out right now
  fieldOfView: number = (45 * Math.PI) / 180;

  rotpos: RotPos = new RotPos([0.0, 0.0, 0.0], undefined, [1.0, 1.0, 1.0]);

  orthoMatrix: mat4 = mat4.create();
  perspectiveMatrix: mat4 = mat4.create();
  viewMatrix: mat4 = mat4.create();

  // Set up events
  cursor: string = 'default';

  onMouseDown: (e: MouseEvent) => void = (_e: MouseEvent) => {};
  onMouseMove: (e: MouseEvent) => void = (_e: MouseEvent) => {};
  onMouseUp: (e: MouseEvent) => void = (_e: MouseEvent) => {};

  constructor(
    window: FScreen,
    tlCorner: [number, number],
    brCorner: [number, number],
    worldIndex: number,
  ) {
    //Set window and viewport
    this.window = window;
    this.tlCorner = tlCorner;
    this.brCorner = brCorner;
    this.worldIndex = worldIndex;

    //Get width and height (Theoretical, in percentages)
    this.width = this.brCorner[0] - this.tlCorner[0];
    this.height = this.brCorner[1] - this.tlCorner[1];

    //Other default camera values
    this.aspectRatio = this.window.canvas.width / this.window.canvas.height;

    //Pixel values of camera. ?Does floor matter?
    this.pxWidth = Math.floor(this.window.canvas.width * this.width);
    this.pxHeight = Math.floor(this.window.canvas.height * this.height);
    this.SetViewport();

    //Set up projection and view matrix
    this.RecalculateProjMatrix();
    this.UpdatePos();
  }

  //(Should get a better name) Calculates projection matrix based on whether the camera is 2D or 3D
  RecalculateProjMatrix() {
    mat4.ortho(
      this.orthoMatrix,
      (this.pxWidth * this.zoom) / 2,
      (-this.pxWidth * this.zoom) / 2,
      (-this.pxHeight * this.zoom) / 2,
      (this.pxHeight * this.zoom) / 2,
      -1.0,
      1.0,
    );

    mat4.perspective(
      this.perspectiveMatrix,
      this.fieldOfView,
      this.aspectRatio,
      this.zNear,
      this.zFar,
    );
  }

  //Change view matrix when camera moves
  UpdatePos() {
    mat4.fromRotationTranslation(this.viewMatrix, this.rotpos.rotation, this.rotpos.position);
    this.SetUniform('uViewMatrix', this.viewMatrix);
  }

  CursorToWorldPosition(cursorPosition: [number, number]) {
    const xOffsetFromCenter = cursorPosition[0] - this.pxWidth / 2;
    const yOffsetFromCenter = cursorPosition[1] - this.pxHeight / 2;

    const squareWidth = 50 / this.zoom;

    const posX = this.rotpos.position[0] / 50 + xOffsetFromCenter / squareWidth;
    const posY = -this.rotpos.position[1] / 50 - yOffsetFromCenter / squareWidth;

    return new Point2D(posX, posY);
  }

  SetUniform(uniform: string, property: Iterable<GLfloat>) {
    //Should have a list of shaders this camera uses, and run through those.
    this.window.shaders.forEach((shader) => {
      if (shader.programInfo.uniformLocations[uniform] && shader.shaderProgram) {
        this.window.gl.useProgram(shader.shaderProgram);

        this.window.gl.uniformMatrix4fv(
          shader.programInfo.uniformLocations[uniform],
          false,
          property,
        );
      }
    });
  }

  //Sets camera viewport in opengl - Important for cameras that change the amount of screen space they take up
  SetViewport() {
    this.window.gl.viewport(
      this.window.canvas.width * this.tlCorner[0],
      this.window.canvas.height * this.tlCorner[1],
      this.pxWidth,
      this.pxHeight,
    );
  }

  PreDraw() {
    this.SetUniform('uOrthoMatrix', this.orthoMatrix);
    this.SetUniform('uPerspectiveMatrix', this.perspectiveMatrix);
    this.SetUniform('uViewMatrix', this.viewMatrix);
    this.SetViewport();
  }
}

export class Shader {
  screen: FScreen;
  gl: WebGL2RenderingContext;
  camera: Camera;

  models: Record<string, Model> = {};

  vertexShader?: WebGLShader;
  fragmentShader?: WebGLShader;
  shaderProgram?: WebGLProgram;

  programInfo: {
    attribLocations: Record<string, number>;
    uniformLocations: Record<string, WebGLUniformLocation>;
  } = {
    attribLocations: {},
    uniformLocations: {},
  };

  // Constructor requires webgl context
  constructor(screen: FScreen, gl: WebGL2RenderingContext, camera: Camera) {
    this.screen = screen;
    this.gl = gl;
    this.camera = camera;
  }

  // Compiles a shader program from source code
  // vertexSource should be the source code for the vertex shader, fragmentSource should be the source code for the fragment shader
  CompileProgram(vertexSource: string, fragmentSource: string): void {
    // Automatically cull backfaces for now, change later if needed
    // this.gl.enable(this.gl.CULL_FACE);

    // Creates shaders
    this.vertexShader = this.CreateShader(this.gl.VERTEX_SHADER, vertexSource);
    if (!this.vertexShader) return;
    this.fragmentShader = this.CreateShader(this.gl.FRAGMENT_SHADER, fragmentSource);
    if (!this.fragmentShader) return;

    // Attaches shaders, links the program
    this.shaderProgram = this.gl.createProgram() ?? undefined;
    if (!this.shaderProgram) return;
    this.gl.attachShader(this.shaderProgram, this.vertexShader);
    this.gl.attachShader(this.shaderProgram, this.fragmentShader);
    this.gl.linkProgram(this.shaderProgram);

    // Ensures OpenGL has loaded correctly
    if (!this.gl.getProgramParameter(this.shaderProgram, this.gl.LINK_STATUS)) {
      alert(
        'Unable to initialize the shader program: ' + this.gl.getProgramInfoLog(this.shaderProgram),
      );
      return;
    }

    this.AssembleProgramInfo();
    this.AdditionalSetup();
  }

  // Replaces vertex shader. Debug feature that should probably be removed at some point
  ReplaceVertexShader(source: string): void {
    if (!this.vertexShader || !this.shaderProgram) return;
    this.gl.shaderSource(this.vertexShader, source);
    this.gl.compileShader(this.vertexShader);
    this.gl.linkProgram(this.shaderProgram);
    this.AssembleProgramInfo();

    this.AdditionalSetup();
  }

  //Loads a vertex/fragment shader from source code and return it's id
  CreateShader(type: GLenum, source: string): WebGLShader | undefined {
    //Create shader
    const shader = this.gl.createShader(type); //Returns a WebGLShader object
    if (!shader) return undefined;

    //Pass in source code and compile
    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);

    //Handle errors
    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      alert('An error occured compiling the shaders: ' + this.gl.getShaderInfoLog(shader));
      this.gl.deleteShader(shader);
      return undefined;
    }

    return shader;
  }

  //Creates info for the shader class to interact with the shader program - Mainly uniform and attribute locations
  AssembleProgramInfo(): void {
    if (!this.shaderProgram) return;

    //Set up program info object
    this.programInfo = {
      attribLocations: {},
      uniformLocations: {},
    };

    //Fills program info object with attribute and uniform locations
    const attribCount = this.gl.getProgramParameter(this.shaderProgram, this.gl.ACTIVE_ATTRIBUTES);
    const uniformCount = this.gl.getProgramParameter(this.shaderProgram, this.gl.ACTIVE_UNIFORMS);

    //Fill attribute locations in programInfo so we can send data to them later
    for (var i = 0; i < attribCount; i++) {
      const attribInfo = this.gl.getActiveAttrib(this.shaderProgram, i);
      if (!attribInfo) continue;
      this.programInfo.attribLocations[attribInfo.name] = this.gl.getAttribLocation(
        this.shaderProgram,
        attribInfo.name,
      );
    }

    //Fill uniform locations in programInfo so we can send data to them later
    for (var i = 0; i < uniformCount; i++) {
      const uniformInfo = this.gl.getActiveUniform(this.shaderProgram, i);
      if (!uniformInfo) continue;
      const uniformLocation = this.gl.getUniformLocation(this.shaderProgram, uniformInfo.name);
      if (!uniformLocation) continue;
      this.programInfo.uniformLocations[uniformInfo.name] = uniformLocation;
    }
  }

  //Brings a model from data into opengl. This model can then be instantiated
  //TIDYING STATUS: ORANGE
  CreateModel(name: string, modelData: ModelData) {
    //The vertex array object is what can basically keep track of all our buffers and object data. Really handy
    const vao = this.gl.createVertexArray();
    this.gl.bindVertexArray(vao);
    if (!vao) return;

    this.models[name] = new Model(modelData, this, vao);
    //I should set the buffers of object to be the size of all the buffers that need keeping track of, but i can't be bothered. push works fine for now

    // Construct all buffers
    Object.entries(modelData['ARRAY_BUFFER']).forEach(([key, bufferData]) => {
      const buffer = this.InitBuffer(this.gl.ARRAY_BUFFER, new Float32Array(bufferData[0]));
      if (!buffer) return;
      this.models[name].buffers[key] = buffer;
      this.gl.vertexAttribPointer(
        this.programInfo.attribLocations[key],
        bufferData[1],
        this.gl.FLOAT,
        false,
        bufferData[2],
        bufferData[3],
      );
      this.gl.enableVertexAttribArray(this.programInfo.attribLocations[key]);
    });

    // Construct element array buffer
    if (this.models[name].modelData.ELEMENT_ARRAY_BUFFER != undefined) {
      const buffer = this.InitBuffer(
        this.gl.ELEMENT_ARRAY_BUFFER,
        new Uint16Array(this.models[name].modelData.ELEMENT_ARRAY_BUFFER),
      );
      if (buffer) this.models[name].buffers.ELEMENT_ARRAY_BUFFER = buffer;
    }

    //Could you just have a global model name hashtable?
    if (this.models[name].modelData.TEXTURE != undefined) {
      // this.models[name].textureId = this.window.GetNewTextureId();
      //this.models[name].texture = this.window.CreateTexture(this.models[name].modelData["TEXTURE"], this.models[name].textureId);
      this.models[name].textureId = parseInt(this.models[name].modelData.TEXTURE);
    }
  }

  DeleteModel(name: string) {
    // Need to undo vao
    // Delete buffers
    Object.values(this.models[name].modelData).forEach((buffer) => {
      this.gl.deleteBuffer(buffer);
    });

    delete this.models[name];
  }

  //Creates an instance of a model in the world
  InstanceObject(
    name: string,
    rotpos: RotPos | RotPos2D,
    worldIndex: number = 0,
    texName?: string,
    tags: string[] = [],
  ) {
    const newObject = new Objec(
      rotpos,
      worldIndex,
      texName ? this.screen.texIds[texName] : undefined,
    );

    // if (this.camera.type == "3D") {
    //   newObject.TiePhysicsObjec(physicsScene);
    // }

    newObject.AddTags(tags);

    this.models[name].objects.push(newObject);
    return newObject; //Return object
  }

  DeleteAllObjects(worldIndex: number): void {
    Object.values(this.models).forEach((model) => {
      model.objects = model.objects.filter((object) => {
        if (object.worldIndex != worldIndex) return true;

        object.Destructor();
        return false;
      });
    });
  }

  // Deletes object instance - will not automatically remove models
  DeleteObject(name: string, index: number): void {
    this.models[name].objects.splice(index, 1);
  }

  //Inserts data into an attribute. DATA SHOULD BE IN A NEW FLOAT32ARRAY FORM OR Uint16Array OR SOMETHING SIMILAR <- to fix
  //TIDYING STATUS: GREEN
  InitBuffer(bufferType: GLenum, data: AllowSharedBufferSource): WebGLBuffer | undefined {
    //Create buffer, bind it to a type, fill the target with data
    const buffer = this.gl.createBuffer();
    if (!buffer) return undefined;
    this.gl.bindBuffer(bufferType, buffer);
    this.gl.bufferData(bufferType, data, this.gl.STATIC_DRAW); //Static_draw is hardcoded?
    return buffer;
  }

  //Needs a better name. A lot of this can be tidied up by moving it to the camera class
  AdditionalSetup(): void {
    if (!this.shaderProgram) return;

    //Various miscellaneous options
    this.gl.clearColor(0.0, 0.0, 0.0, 1.0); //Clear to black, fully opaque
    this.gl.clearDepth(1.0); //Clear everything
    this.gl.enable(this.gl.DEPTH_TEST); //Enable depth testing
    this.gl.depthFunc(this.gl.LEQUAL); //Near things obscure far things

    this.gl.blendFuncSeparate(
      this.gl.SRC_ALPHA,
      this.gl.ONE_MINUS_SRC_ALPHA,
      this.gl.ONE,
      this.gl.ONE,
    );
    this.gl.enable(this.gl.BLEND);

    this.gl.useProgram(this.shaderProgram);

    if (this.programInfo.uniformLocations.uOrthoMatrix) {
      this.screen.gl.uniformMatrix4fv(
        this.programInfo.uniformLocations.uOrthoMatrix,
        false,
        this.camera.orthoMatrix,
      );
    }

    if (this.programInfo.uniformLocations.uPerspectiveMatrix) {
      this.screen.gl.uniformMatrix4fv(
        this.programInfo.uniformLocations.uPerspectiveMatrix,
        false,
        this.camera.perspectiveMatrix,
      );
    }

    if (this.programInfo.uniformLocations.uViewMatrix) {
      this.gl.uniformMatrix4fv(
        this.programInfo.uniformLocations.uViewMatrix,
        false,
        this.camera.viewMatrix,
      );
    }
  }

  DrawScene(worldIndex: number): void {
    if (!this.shaderProgram) return;
    const offset = 0;

    this.gl.useProgram(this.shaderProgram);

    //For each model...
    Object.values(this.models).forEach((model) => {
      //Bind their vertex data
      this.gl.bindVertexArray(model.vao);

      //Get the number of points
      const vertexCount = model.modelData.ELEMENT_ARRAY_BUFFER?.length;

      //Set texture and mode
      const mode = model.modelData.TEXTURE != undefined ? this.gl.TRIANGLES : this.gl.LINES;
      if (mode === this.gl.TRIANGLES && model.textureId != undefined) {
        this.gl.activeTexture(this.gl.TEXTURE0 + model.textureId);
        this.gl.uniform1i(this.programInfo.uniformLocations.uSampler, model.textureId);
      }

      // Draw every object
      model.objects.forEach((object) => {
        object.callbackFn(this.screen, object);

        // Only render objects in our current world
        if (object.worldIndex != worldIndex) return;

        // Don't render hidden objects
        if (object.hidden) return;

        //Should be universalised - Need to set this back after (Shouldn't this be a uniform?)
        // if (object.texAttributes) {
        //   model.ModifyAttribute("aTextureCoord", object.texAttributes);
        // }

        //If the object has a custom defined texture id, use it
        if (object.texId != undefined) {
          this.gl.activeTexture(this.gl.TEXTURE0 + object.texId);
          this.gl.uniform1i(this.programInfo.uniformLocations.uSampler, object.texId);
        }

        //Get matrix of this objects rotpos
        this.gl.uniformMatrix4fv(
          this.programInfo.uniformLocations.uModelMatrix,
          false,
          object.GetMatrix(),
        );

        if (model.modelData.ELEMENT_ARRAY_BUFFER && vertexCount) {
          //Tell opengl which texture we're currently using, then tell our shader which texture we're using
          this.gl.drawElements(mode, vertexCount, this.gl.UNSIGNED_SHORT, offset);
        } else {
          this.gl.drawArrays(
            mode,
            offset,
            model.modelData.ARRAY_BUFFER.aVertexPosition[0].length /
              model.modelData.ARRAY_BUFFER.aVertexPosition[1],
          ); //bad hardcoding, oh well
        }

        //If the object we just rendered has a custom texture id, swap back to the old one
        if (object.texId != undefined && model.textureId != undefined) {
          this.gl.activeTexture(this.gl.TEXTURE0 + model.textureId);
          this.gl.uniform1i(this.programInfo.uniformLocations.uSampler, model.textureId);
        }
      });
    });
  }
}
