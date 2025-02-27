import { mat4 } from 'gl-matrix';
import { Point2D } from './geometry.js';
import { Model, RotPos } from './objec.js';
import { FScreen } from './screen.js';
import { Scene } from './scene.js';
// import { PhysicsScene } from "./physics.js";

export class CameraData {
  scene: Scene;

  tlCorner: [number, number];
  // width and height in percent
  width: number;
  height: number;
  worldIndex: number;

  zoom: number;
  zNear = 0.1;
  zFar = 100.0;

  rotpos: RotPos = new RotPos([0.0, 0.0, 0.0], undefined, [1.0, 1.0, 1.0]);

  onMouseDown: (e: MouseEvent) => void = () => {};
  onMouseMove: (e: MouseEvent) => void = () => {};
  onMouseUp: (e: MouseEvent) => void = () => {};
  onWheel: (e: WheelEvent) => void = () => {};

  cursor: string = 'default';

  constructor({
    scene,
    tlCorner = [0, 0],
    width = 1,
    height = 1,
    zoom = 1,
    worldIndex = 0,
  }: {
    scene: Scene;
    tlCorner?: [number, number];
    width?: number;
    height?: number;
    zoom?: number;
    worldIndex?: number;
  }) {
    this.scene = scene;
    this.scene.AddCamera(this);
    this.tlCorner = tlCorner;
    this.width = width;
    this.height = height;
    this.zoom = zoom;
    this.worldIndex = worldIndex;
  }
}

//A viewpoint into the world. Main features is having a shader and a rotpos. Should probably implement this later
export class Camera {
  window: FScreen;
  camera_data: CameraData;

  aspectRatio: number;

  pxWidth: number;
  pxHeight: number;

  // I would like the field of view to be directly proportional to the screen size, but can't figure it out right now
  fieldOfView: number = (45 * Math.PI) / 180;

  orthoMatrix: mat4 = mat4.create();
  perspectiveMatrix: mat4 = mat4.create();
  viewMatrix: mat4 = mat4.create();

  constructor(window: FScreen, camera_data: CameraData) {
    //Set window and viewport
    this.window = window;
    this.camera_data = camera_data;

    //Other default camera values
    this.aspectRatio = this.window.canvas.width / this.window.canvas.height;

    //Pixel values of camera. ?Does floor matter?
    this.pxWidth = Math.floor(this.window.canvas.width * this.camera_data.width);
    this.pxHeight = Math.floor(this.window.canvas.height * this.camera_data.height);
    this.SetViewport();

    //Set up projection and view matrix
    this.RecalculateProjMatrix();
    this.UpdatePos();
  }

  //(Should get a better name) Calculates projection matrix based on whether the camera is 2D or 3D
  RecalculateProjMatrix() {
    mat4.ortho(
      this.orthoMatrix,
      this.pxWidth / this.camera_data.zoom / 2,
      -this.pxWidth / this.camera_data.zoom / 2,
      -this.pxHeight / this.camera_data.zoom / 2,
      this.pxHeight / this.camera_data.zoom / 2,
      -1.0,
      1.0,
    );

    mat4.perspective(
      this.perspectiveMatrix,
      this.fieldOfView,
      this.aspectRatio,
      this.camera_data.zNear,
      this.camera_data.zFar,
    );
  }

  //Change view matrix when camera moves
  UpdatePos() {
    mat4.fromRotationTranslation(
      this.viewMatrix,
      this.camera_data.rotpos.rotation,
      this.camera_data.rotpos.position,
    );
    this.SetUniform('uViewMatrix', this.viewMatrix);
  }

  CursorToWorldPosition(cursor_pos: [number, number]) {
    const ndc_x =
      ((cursor_pos[0] - this.camera_data.tlCorner[0] * this.window.canvas.width) / this.pxWidth) *
        2 -
      1;
    const ndc_y =
      -(
        (cursor_pos[1] - this.camera_data.tlCorner[1] * this.window.canvas.height) /
        this.pxHeight
      ) *
        2 +
      1;

    const world_x =
      (ndc_x * (this.pxWidth / this.camera_data.zoom)) / 2 + this.camera_data.rotpos.position[0];
    const world_y =
      (ndc_y * (this.pxHeight / this.camera_data.zoom)) / 2 - this.camera_data.rotpos.position[1];

    return new Point2D(world_x, world_y);
  }

  SetUniform(uniform: string, property: Iterable<GLfloat>) {
    //Should have a list of shaders this camera uses, and run through those.
    this.window.shaders.forEach((shader) => {
      if (shader.programInfo.uniformLocations[uniform] && shader.shaderProgram) {
        this.window.gl.useProgram(shader.shaderProgram);

        if (Array.from(property).length == 2) {
          this.window.gl.uniform2fv(shader.programInfo.uniformLocations[uniform], property);
        } else {
          this.window.gl.uniformMatrix4fv(
            shader.programInfo.uniformLocations[uniform],
            false,
            property,
          );
        }
      }
    });
  }

  //Sets camera viewport in opengl - Important for cameras that change the amount of screen space they take up
  SetViewport() {
    this.window.gl.viewport(
      this.window.canvas.width * this.camera_data.tlCorner[0],
      this.window.canvas.height * this.camera_data.tlCorner[1],
      this.pxWidth,
      this.pxHeight,
    );
  }

  Draw() {
    this.RecalculateProjMatrix();
    this.SetUniform('u_resolution', [this.pxWidth, this.pxHeight]);
    this.SetUniform('uOrthoMatrix', this.orthoMatrix);
    const inverse = mat4.create();
    mat4.invert(inverse, this.orthoMatrix);
    this.SetUniform('uOrthoMatrix_inverse', inverse);
    this.SetUniform('uPerspectiveMatrix', this.perspectiveMatrix);
    this.UpdatePos();
    this.SetViewport();

    this.window.shaders.forEach((shader) => {
      shader.DrawScene(this.camera_data.worldIndex);
    });
  }
}

export class ShaderData {
  scene: Scene;

  vertexSource: string;
  fragmentSource: string;

  models: Model[] = [];

  constructor(scene: Scene, vertexSource: string, fragmentSource: string) {
    this.scene = scene;
    this.scene.AddShader(this);
    this.vertexSource = vertexSource;
    this.fragmentSource = fragmentSource;
  }

  add_model(model: Model) {
    this.models.push(model);
  }
}

export class Shader {
  screen: FScreen;
  shader_data: ShaderData;

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

  get gl() {
    return this.screen.gl;
  }

  // Constructor requires webgl context
  constructor(screen: FScreen, shader_data: ShaderData) {
    this.screen = screen;
    this.shader_data = shader_data;

    // Automatically cull backfaces for now, change later if needed
    // this.gl.enable(this.gl.CULL_FACE);

    // Creates shaders
    this.vertexShader = this.CreateShader(this.gl.VERTEX_SHADER, this.shader_data.vertexSource);
    if (!this.vertexShader) return;
    this.fragmentShader = this.CreateShader(
      this.gl.FRAGMENT_SHADER,
      this.shader_data.fragmentSource,
    );
    if (!this.fragmentShader) return;

    // Attaches shaders, links the program
    this.shaderProgram = this.gl.createProgram() ?? undefined;
    if (!this.shaderProgram) return;
    this.gl.attachShader(this.shaderProgram, this.vertexShader);
    this.gl.attachShader(this.shaderProgram, this.fragmentShader);
    this.gl.linkProgram(this.shaderProgram);
    this.gl.deleteShader(this.vertexShader);
    this.gl.deleteShader(this.fragmentShader);

    // Ensures OpenGL has loaded correctly
    if (!this.gl.getProgramParameter(this.shaderProgram, this.gl.LINK_STATUS)) {
      alert(
        'Unable to initialize the shader program: ' + this.gl.getProgramInfoLog(this.shaderProgram),
      );
      return;
    }

    this.AssembleProgramInfo();
    this.AdditionalSetup();
    this.CreateModels();
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
    for (let i = 0; i < attribCount; i++) {
      const attribInfo = this.gl.getActiveAttrib(this.shaderProgram, i);
      if (!attribInfo) continue;
      this.programInfo.attribLocations[attribInfo.name] = this.gl.getAttribLocation(
        this.shaderProgram,
        attribInfo.name,
      );
    }

    //Fill uniform locations in programInfo so we can send data to them later
    for (let i = 0; i < uniformCount; i++) {
      const uniformInfo = this.gl.getActiveUniform(this.shaderProgram, i);
      if (!uniformInfo) continue;
      const uniformLocation = this.gl.getUniformLocation(this.shaderProgram, uniformInfo.name);
      if (!uniformLocation) continue;
      this.programInfo.uniformLocations[uniformInfo.name] = uniformLocation;
    }
  }

  //Brings a model from data into opengl. This model can then be instantiated
  //TIDYING STATUS: ORANGE
  CreateModels() {
    this.shader_data.models.forEach((model) => {
      //The vertex array object is what can basically keep track of all our buffers and object data. Really handy
      const vao = this.gl.createVertexArray();
      if (!vao) return;
      this.gl.bindVertexArray(vao);

      model.vao = vao;

      //I should set the buffers of object to be the size of all the buffers that need keeping track of, but i can't be bothered. push works fine for now

      // Construct all buffers
      Object.entries(model.modelData['ARRAY_BUFFER']).forEach(([key, bufferData]) => {
        const buffer = this.InitBuffer(this.gl.ARRAY_BUFFER, new Float32Array(bufferData[0]));

        if (buffer === undefined || this.programInfo.attribLocations[key] === undefined) return;
        model.buffers[key] = buffer;
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
      if (model.modelData.ELEMENT_ARRAY_BUFFER != undefined) {
        const buffer = this.InitBuffer(
          this.gl.ELEMENT_ARRAY_BUFFER,
          new Uint16Array(model.modelData.ELEMENT_ARRAY_BUFFER),
        );
        if (buffer) model.buffers.ELEMENT_ARRAY_BUFFER = buffer;
      }

      //Could you just have a global model name hashtable?
      if (model.modelData.TEXTURE !== undefined) {
        model.textureId = parseInt(model.modelData.TEXTURE);
      }
    });
  }

  // DeleteModel(name: string) {
  //   // Need to undo vao
  //   // Delete buffers
  //   Object.values(this.models[name].modelData).forEach((buffer) => {
  //     this.gl.deleteBuffer(buffer);
  //   });

  //   delete this.models[name];
  // }

  DeleteAllObjects(worldIndex: number): void {
    this.shader_data.models.forEach((model) => {
      model.objects = model.objects.filter((object) => {
        if (object.worldIndex != worldIndex) return true;

        object.Destructor();
        return false;
      });
    });
  }

  // Deletes object instance
  DeleteObject(name: string, index: number): void {
    this.shader_data.models.find((model) => model.name === name)?.objects.splice(index, 1);
  }

  //Inserts data into an attribute. DATA SHOULD BE IN A NEW FLOAT32ARRAY FORM OR Uint16Array OR SOMETHING SIMILAR <- to fix
  //TIDYING STATUS: GREEN
  InitBuffer(bufferType: GLenum, data: AllowSharedBufferSource): WebGLBuffer | undefined {
    //Create buffer, bind it to a type, fill the target with data
    const buffer = this.gl.createBuffer();
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
  }

  DrawScene(worldIndex: number): void {
    if (!this.shaderProgram) return;
    const offset = 0;

    this.gl.useProgram(this.shaderProgram);

    //For each model...
    this.shader_data.models.forEach((model) => {
      const vao = model.vao;
      if (vao === undefined) return;

      //Bind their vertex data
      this.gl.bindVertexArray(vao);

      //Get the number of points
      const vertexCount = model.modelData.ELEMENT_ARRAY_BUFFER?.length;

      //Set texture and mode
      const mode = model.modelData.TEXTURE != undefined ? this.gl.TRIANGLES : this.gl.LINES;
      if (mode === this.gl.TRIANGLES && model.textureId != undefined) {
        this.gl.uniform1i(this.programInfo.uniformLocations.uSampler, model.textureId);
      }

      // Draw every object
      model.objects.forEach((object) => {
        object.callbackFn(this.screen, object);

        // Only render objects in our current world
        if (object.worldIndex != worldIndex) return;

        // Don't render hidden objects
        if (object.hidden) return;

        // If the object has custom texture attributes, use them
        Object.entries(object.overridden_attribs).forEach(([name, data]) => {
          const buffer = model.buffers[name];
          this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
          this.gl.bufferData(this.gl.ARRAY_BUFFER, data, this.gl.DYNAMIC_DRAW);
        });

        // If the object has a custom defined texture id, use it
        if (object.texId != undefined) {
          this.gl.uniform1i(this.programInfo.uniformLocations.uSampler, object.texId);
        }

        // Get matrix of this objects rotpos
        this.gl.uniformMatrix4fv(
          this.programInfo.uniformLocations.uModelMatrix,
          false,
          object.GetMatrix(),
        );

        if (model.modelData.ELEMENT_ARRAY_BUFFER && vertexCount) {
          // Tell opengl which texture we're currently using, then tell our shader which texture we're using
          this.gl.drawElements(mode, vertexCount, this.gl.UNSIGNED_SHORT, offset);
        } else {
          this.gl.drawArrays(
            mode,
            offset,
            model.modelData.ARRAY_BUFFER.aVertexPosition[0].length /
              model.modelData.ARRAY_BUFFER.aVertexPosition[1],
          ); // bad hardcoding, oh well
        }

        // If the object has custom texture attributes, swap back to the old ones
        Object.keys(object.overridden_attribs).forEach((name) => {
          const buffer = model.buffers[name];
          this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
          this.gl.bufferData(
            this.gl.ARRAY_BUFFER,
            new Float32Array(model.modelData['ARRAY_BUFFER'][name][0]),
            this.gl.DYNAMIC_DRAW,
          );
        });

        // If the object we just rendered has a custom texture id, swap back to the old one
        if (object.texId != undefined && model.textureId != undefined) {
          this.gl.uniform1i(this.programInfo.uniformLocations.uSampler, model.textureId);
        }
      });
    });
  }

  Destructor() {
    if (!this.shaderProgram) return;
    this.gl.deleteProgram(this.shaderProgram);
  }
}
