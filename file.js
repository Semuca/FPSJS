//// DEBUG:
//const test = document.getElementById("test");

class Window {
  constructor(canvasID) {
    this.canvas = document.getElementById("canvas");
    this.gl = this.canvas.getContext("webgl");

    //Ensure webgl is properly set up
    if (!this.gl) {
      alert("Unable to initialize WebGL. Your browser or machine may not support it.");
      return;
    }
    this.shader = new Shader(this.gl, "vertexShader.vs", "fragmentShader.fs");
  }
}

class Shader {
  constructor(gl, vertexUrl, fragmentUrl) {
    let self = this;//I dunno, some bullshit
    this.gl = gl;

    //const vSource = LoadFileText(vertexUrl);
    //const fSource = LoadFileText(fragmentUrl);
    //self.CompileShader(vSource, fSource);

    //Load VertexShader, then FragmentShader. Really need to make a better solution for this later.
    fetch(vertexUrl).then(function(response) {
      response.text().then(function(text) {
        const vSource = text;
        fetch(fragmentUrl).then(function(response) {
          response.text().then(function(text) {
            const fSource = text;
            self.CompileShader(vSource, fSource);
          });
        });
      });
    });
  }

  CompileShader(vertexSource, fragmentSource) {
    const vertexShader = this.LoadShader(this.gl.VERTEX_SHADER, vertexSource);
    const fragmentShader = this.LoadShader(this.gl.FRAGMENT_SHADER, fragmentSource);

    const shaderProgram = this.gl.createProgram();
    this.gl.attachShader(shaderProgram, vertexShader);
    this.gl.attachShader(shaderProgram, fragmentShader);
    this.gl.linkProgram(shaderProgram);

    if (!this.gl.getProgramParameter(shaderProgram, this.gl.LINK_STATUS)) {
      alert('Unable to initialize the shader program: ' + this.gl.getProgramInfoLog(shaderProgram));
      return null;
    }

    //Set up program info object
    this.programInfo = {
      program: shaderProgram,
      attribLocations: {},
      uniformLocations: {},
    };

    //Fills program info object with attribute and uniform locations
    const attribCount = this.gl.getProgramParameter(shaderProgram, this.gl.ACTIVE_ATTRIBUTES);
    const uniformCount = this.gl.getProgramParameter(shaderProgram, this.gl.ACTIVE_UNIFORMS);

    for (var i = 0; i < attribCount; i++) {
      const attribInfo = this.gl.getActiveAttrib(shaderProgram, i);
      this.programInfo.attribLocations[attribInfo.name] = this.gl.getAttribLocation(shaderProgram, attribInfo.name);
    }

    for (var i = 0; i < uniformCount; i++) {
      const uniformInfo = this.gl.getActiveUniform(shaderProgram, i);
      this.programInfo.uniformLocations[uniformInfo.name] = this.gl.getUniformLocation(shaderProgram, uniformInfo.name);
    }

    const buffers = this.InitBuffers();

    this.DrawScene(buffers);
  }

  //Loads a type of shader (Eg. Vertex or Fragment)
  LoadShader(type, source) {
    const shader = this.gl.createShader(type);

    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);

    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      alert("An error occured compiling the shaders: " + this.gl.getShaderInfoLog(shader));
      this.gl.deleteShader(shader);
      return null;
    }

    return shader;
  }

  //Inserts data into an attribute
  InitBuffers() {
    const positionBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, positionBuffer);

    const positions = [
      1.0,  1.0,
      -1.0,  1.0,
      1.0, -1.0,
      -1.0, -1.0,
    ];

    this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(positions), this.gl.STATIC_DRAW);

    return {
      position: positionBuffer,
    };
  }

  DrawScene(buffers) {
    this.gl.clearColor(0.0, 0.0, 0.0, 1.0); //Clear to black, fully opaque
    this.gl.clearDepth(1.0); //Clear everything
    this.gl.enable(this.gl.DEPTH_TEST); //Enable depth testing
    this.gl.depthFunc(this.gl.LEQUAL); //Near things obscure far things

    //Clear canvas before drawing
    this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);

    const fieldOfView = 45 * Math.PI / 180;
    const aspect = this.gl.canvas.clientWidth / this.gl.canvas.clientHeight;
    const zNear = 0.1;
    const zFar = 100.0;
    const projectionMatrix = mat4.create();

    mat4.perspective(projectionMatrix, fieldOfView, aspect, zNear, zFar);

    const modelViewMatrix = mat4.create();

    mat4.translate(modelViewMatrix, modelViewMatrix, [-0.0, 0.0, -6.0]);

    {
      const numComponents = 2;
      const type = this.gl.FLOAT;
      const normalize = false;
      const stride = 0;
      const offset = 0;

      this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffers.position);
      this.gl.vertexAttribPointer(
        this.programInfo.attribLocations.aVertexPosition,
        numComponents,
        type,
        normalize,
        stride,
        offset);
      this.gl.enableVertexAttribArray(this.programInfo.attribLocations.aVertexPosition);
    }

    this.gl.useProgram(this.programInfo.program);

    this.gl.uniformMatrix4fv(
      this.programInfo.uniformLocations.uProjectionMatrix,
      false,
      projectionMatrix);

    this.gl.uniformMatrix4fv(
      this.programInfo.uniformLocations.uModelViewMatrix,
      false,
      modelViewMatrix);

    {
      const offset = 0;
      const vertexCount = 4;
      this.gl.drawArrays(this.gl.TRIANGLE_STRIP, offset, vertexCount);
    }
  }
}

async function LoadFileText(url) {
  const response = await fetch(url).then(function(response) {
    return response;
  });
  const text = await response.text().then(function(text) {
    return text;
  });
  console.log(text);
  return text;
}
const temp = new Window("canvas");
