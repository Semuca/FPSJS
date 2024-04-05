import { Screen, toggleFullScreen } from "./screen.js";
import { PhysicsScene } from "./physics.js";
import { LoadFileText, CreateTexture, LoadModel, LoadShader } from "./loading.js";
import { RotPos } from "./objec.js";
import { distancePointToPoint, Point2D, Segment2D, ShortestDistanceFromPointToSegment } from "./geometry.js";

let zoom = 50.0;
let time = 0;

const MODES = {
  MOVE: 0,
  PLACE: 1,
  DRAWING: 2,
}

class Wall extends Segment2D {
  constructor(point1, point2, texture) {
    super(point1, point2);
    this.texture = texture;
  }
}

let mode = MODES.PLACE;

let tile = 0;
let currentPoint = undefined;
let secondPoint = undefined;

let cursorWorldPosition = undefined;
const walls = [];
let highlightedWall = -1;

let line;
let hover;

let highlighter;
let secondHighlighter;

let selector;

//Gets the shader that the model belongs to from name. Assumes models have a one-to-one relation with shaders
let physicsScene = new PhysicsScene();
let textureGroup;

const temp = new Screen("canvas");
let cam = temp.AddCamera([0.0, 0.0], [0.8, 1.0], "2D", 0);
cam.cursor = "pointer";
let sidebar = temp.AddCamera([0.8, 0.0], [1.0, 1.0], "2D", 1);
cam.PreDraw();

Setup();

async function Setup() {
  //Load 2d shader, plus the model
  await LoadShader(temp, cam, "2DspriteVertexShader.vs", "spriteFragmentShader.fs");
  let modelData = await LoadModel("verSprite.json", temp);
  temp.shaders[0].CreateModel("verSprite.json", modelData);

  //Processing textures to be loaded. Shouldn't this be a part of the map?
  textureGroup = await LoadFileText("../textures.json");
  textureGroup = JSON.parse(textureGroup).textures;

  await Promise.all(textureGroup.map((texture) => CreateTexture(temp, texture)));

  // Load sidebar
  let width = sidebar.pxWidth / 4;
  for (let i = 0; i < textureGroup.length; i++) {
    temp.shaders[0].InstanceObject("verSprite.json", new RotPos([sidebar.pxWidth / 2 - ((i % 4) + 1) * width + sidebar.pxWidth / 8, sidebar.pxHeight / 2 - width * (Math.floor(i / 4) + 1) + sidebar.pxWidth / 8, 0.0], Math.PI, [sidebar.pxWidth / 8, sidebar.pxWidth / 8]), physicsScene, 1, textureGroup[i]);
  }
  temp.shaders[0].models["verSprite.json"].objects;

  await CreateTexture(temp, "tframe.png");
  highlighter = temp.shaders[0].InstanceObject("verSprite.json", new RotPos([0.5, 0.5, 1.0], Math.PI, [10, 10]), physicsScene, 0, "tframe.png");
  highlighter.hidden = true;
  secondHighlighter = temp.shaders[0].InstanceObject("verSprite.json", new RotPos([0.5, 0.5, 1.0], Math.PI, [10, 10]), physicsScene, 0, "tframe.png");
  secondHighlighter.hidden = true;

  hover = temp.shaders[0].InstanceObject("verSprite.json", new RotPos([0.5, 0.5, 1.0], Math.PI, [20, 20]), physicsScene, 0, "texture.png");
  hover.hidden = true;

  selector = temp.shaders[0].InstanceObject("verSprite.json", new RotPos([sidebar.pxWidth / 2 - width + sidebar.pxWidth / 8, sidebar.pxHeight / 2 - width + sidebar.pxWidth / 8, 1.0], Math.PI, [sidebar.pxWidth / 8, sidebar.pxWidth / 8]), physicsScene, 1, "tframe.png");

  //Load line models
  await LoadShader(temp, cam, "2DflatlineVertexShader.vs", "lineFragmentShader.fs");
  modelData = await LoadModel("flatline.json", temp);
  temp.shaders[1].CreateModel("flatline.json", modelData);
  line = temp.shaders[1].InstanceObject("flatline.json", new RotPos([0.0, 0.0, 0.0], undefined, [0.0, 0.0]), physicsScene, 0);

  requestAnimationFrame(RenderLoop);
}

//Should only be called once per animation frame. Starts a loop of updating shaders.
function RenderLoop(now) {
  now *= 0.001;  // convert to seconds
  const deltaTime = now - time;
  time = now;

  let activeShaders = temp.shaders;

  if (activeShaders.length > 0) {
    temp.gl.clear(temp.gl.COLOR_BUFFER_BIT | temp.gl.DEPTH_BUFFER_BIT); //Temporary solution
  }

  //Should do much less draws here, but for now things seem to be fine

  cam.PreDraw();

  //Sets up grid to be drawn
  temp.gl.useProgram(temp.shaders[1].shaderProgram);
  temp.gl.bindVertexArray(temp.shaders[1].models["flatline.json"].vao);
  temp.gl.uniform4fv(temp.shaders[1].programInfo.uniformLocations["colour"], new Float32Array([1.0, 0.0, 0.0, 1.0]));

  //Grid rendering - Y
  let offsetX = (cam.rotpos.position[0] + (cam.pxWidth * cam.zoom / 2)) % 50.0;

  quat.setAxisAngle(line.rotpos.rotation, [0.0, 0.0, 1.0], Math.PI);

  line.rotpos.position[0] = offsetX - cam.pxWidth * cam.zoom / 2;
  line.rotpos.position[1] = cam.pxHeight * cam.zoom / 2;
  line.rotpos.scale[1] = cam.pxHeight * cam.zoom;

  //Draws rendering every vertical line
  for (let i = 0; i < (cam.pxWidth * cam.zoom - offsetX) / 50.0; i++) {

    temp.gl.uniformMatrix4fv(
      temp.shaders[1].programInfo.uniformLocations.uModelMatrix,
      false,
      line.GetMatrix());

    temp.gl.drawArrays(temp.gl.LINES, 0, 2);

    line.rotpos.position[0] += 50.0;
  }

  //Grid rendering - X
  let offsetY = (cam.rotpos.position[1] + (cam.pxHeight * cam.zoom / 2)) % 50.0;

  line.rotpos.position[0] = cam.pxWidth * cam.zoom / 2;
  line.rotpos.position[1] = offsetY - cam.pxHeight * cam.zoom / 2;
  line.rotpos.scale[1] = cam.pxWidth * cam.zoom;

  quat.setAxisAngle(line.rotpos.rotation, [0.0, 0.0, 1.0], Math.PI / 2);

  //Draws rendering every horizontal line
  for (let i = 0; i < cam.pxHeight * cam.zoom / 50.0; i++) {

    temp.gl.uniformMatrix4fv(
      temp.shaders[1].programInfo.uniformLocations.uModelMatrix,
      false,
      line.GetMatrix());

    temp.gl.drawArrays(temp.gl.LINES, 0, 2);

    line.rotpos.position[1] += 50.0;
  }

  //Draw X axis
  temp.gl.uniform4fv(temp.shaders[1].programInfo.uniformLocations["colour"], new Float32Array([1.0, 1.0, 1.0, 1.0]));

  line.rotpos.position[1] = cam.rotpos.position[1];

  temp.gl.uniformMatrix4fv(
    temp.shaders[1].programInfo.uniformLocations.uModelMatrix,
    false,
    line.GetMatrix());

  temp.gl.drawArrays(temp.gl.LINES, 0, 2);

  //Y axis
  line.rotpos.position[0] = cam.rotpos.position[0];
  line.rotpos.position[1] = cam.pxHeight * cam.zoom / 2;
  line.rotpos.scale[1] = cam.pxHeight * cam.zoom;

  quat.setAxisAngle(line.rotpos.rotation, [0.0, 0.0, 1.0], Math.PI);

  temp.gl.uniformMatrix4fv(
    temp.shaders[1].programInfo.uniformLocations.uModelMatrix,
    false,
    line.GetMatrix());

  temp.gl.drawArrays(temp.gl.LINES, 0, 2);

  // Draw walls
  walls.forEach((wall, index) => {
    let colour = [1.0, 1.0, 1.0, 1.0];
    if (index === highlightedWall) {
      colour = [0.0, 1.0, 1.0, 1.0];
    } else if (highlightedWall != -1 && wall.texture === walls[highlightedWall].texture) {
      colour = [1.0, 0.0, 1.0, 1.0];
    }

    temp.gl.uniform4fv(temp.shaders[1].programInfo.uniformLocations["colour"], new Float32Array(colour));


    // Draw line from point
    line.rotpos.position[0] = cam.rotpos.position[0] - wall.point1.x * 50;
    line.rotpos.position[1] = cam.rotpos.position[1] + wall.point1.y * 50;

    // Get x and y distance
    const xDist = (wall.point1.x - wall.point2.x) * 50;
    const yDist = (wall.point1.y - wall.point2.y) * 50;
    line.rotpos.scale[1] = Math.sqrt(xDist ** 2 + yDist ** 2);
    const angle = Math.atan(xDist / yDist) + ((yDist < 0) ? 0 : -Math.PI);

    quat.setAxisAngle(line.rotpos.rotation, [0.0, 0.0, 1.0], angle);
    temp.gl.uniformMatrix4fv(
      temp.shaders[1].programInfo.uniformLocations.uModelMatrix,
      false,
      line.GetMatrix());
    temp.gl.drawArrays(temp.gl.LINES, 0, 2);

  });

  // Draw line from selected point to cursor
  if (currentPoint && mode === MODES.DRAWING) {
    line.rotpos.position[0] = cam.rotpos.position[0] + highlighter.rotpos.position[0];
    line.rotpos.position[1] = cam.rotpos.position[1] + highlighter.rotpos.position[1];

    // Get x and y distance
    const xDist = highlighter.rotpos.position[0] + cursorWorldPosition.x * 50;
    const yDist = cursorWorldPosition.y * 50 - highlighter.rotpos.position[1];
    line.rotpos.scale[1] = Math.sqrt(xDist ** 2 + yDist ** 2);
    const angle = Math.atan(xDist / yDist) + ((yDist < 0) ? Math.PI : 0);

    quat.setAxisAngle(line.rotpos.rotation, [0.0, 0.0, 1.0], angle);
    temp.gl.uniformMatrix4fv(
      temp.shaders[1].programInfo.uniformLocations.uModelMatrix,
      false,
      line.GetMatrix());
    temp.gl.drawArrays(temp.gl.LINES, 0, 2);
  }

  // Draws sprites
  temp.shaders[0].DrawScene(0);

  DrawSidebar();
}

function DrawSidebar() {
  sidebar.PreDraw();

  //Draw sidebar
  temp.shaders[0].DrawScene(1);
}

// Start drawing when the mouse is pressed down
cam.onMouseDown = () => {
  if (mode === MODES.PLACE) {
    if (currentPoint) {
      mode = MODES.DRAWING;
      requestAnimationFrame(RenderLoop);
    }
  }
};

cam.onMouseMove = (e) => {
  const highlightRadiusTrigger = 0.3;
  cursorWorldPosition = cam.CursorToWorldPosition([e.pageX, e.pageY]);
  if (mode === MODES.PLACE) {
    let drawFlag = false;

    // Calculate from position, if a point is enabled or not
    // Logic: figure out the closest point, figure out if that's in range
    const roundedPoint = new Point2D(Math.round(cursorWorldPosition.x), Math.round(cursorWorldPosition.y));

    if (distancePointToPoint(cursorWorldPosition, roundedPoint) <= highlightRadiusTrigger) {
      if (highlighter.rotpos.position[0] != roundedPoint.x * 50 || highlighter.rotpos.position[1] != roundedPoint.y * 50 || highlighter.hidden === true) {
        highlighter.hidden = false;
        currentPoint = new Point2D(roundedPoint.x, roundedPoint.y);
        highlighter.rotpos.position = [-roundedPoint.x * 50, roundedPoint.y * 50, 1.0];

        drawFlag = true;
      }
    } else if (highlighter.hidden === false) {
      highlighter.hidden = true;
      currentPoint = undefined;
      drawFlag = true;
    }

    // Calculate line that is being hovered over
    const oldHighlightedWall = highlightedWall;
    highlightedWall = walls.findIndex((wall) => ShortestDistanceFromPointToSegment(cursorWorldPosition, wall) <= highlightRadiusTrigger);
    if (oldHighlightedWall != -1 || highlightedWall != -1) {
      if (highlightedWall === -1) {
        hover.hidden = true;
      } else {
        hover.rotpos.position = [-cursorWorldPosition.x * 50, cursorWorldPosition.y * 50 + 25, 1.0];
        hover.texId = temp.texIds[walls[highlightedWall].texture];
        hover.hidden = false;
      }

      drawFlag = true;
    }

    if (drawFlag) requestAnimationFrame(RenderLoop);
  } else if (mode === MODES.MOVE) {
    if (e.buttons === 1) {
      document.body.style.cursor = "grabbing";
      cam.rotpos.position[0] -= e.movementX * cam.zoom;
      cam.rotpos.position[1] -= e.movementY * cam.zoom;

      cam.UpdatePos();
      requestAnimationFrame(RenderLoop);
    } else {
      document.body.style.cursor = "grab";
    }
  } else if (mode === MODES.DRAWING) {
    // Calculate from position, if a point is enabled or not
    // Logic: figure out the closest point, figure out if that's in range
    const roundedPoint = new Point2D(Math.round(cursorWorldPosition.x), Math.round(cursorWorldPosition.y));

    if (distancePointToPoint(cursorWorldPosition, roundedPoint) <= highlightRadiusTrigger) {
      if (secondHighlighter.rotpos.position[0] != roundedPoint.x * 50 || secondHighlighter.rotpos.position[1] != roundedPoint.y * 50 || secondHighlighter.hidden === true) {
        secondHighlighter.hidden = false;
        secondPoint = new Point2D(roundedPoint.x, roundedPoint.y);
        secondHighlighter.rotpos.position = [-roundedPoint.x * 50, roundedPoint.y * 50, 1.0];

        requestAnimationFrame(RenderLoop);
      }
    } else if (secondHighlighter.hidden === false) {
      secondHighlighter.hidden = true;
      secondPoint = undefined;
    }
    requestAnimationFrame(RenderLoop);
  }
};

// Stop drawing when the mouse is lifted up
cam.onMouseUp = (e) => {
  if (mode === MODES.DRAWING) {
    if (currentPoint && secondPoint) {
      mode = MODES.PLACE;
      secondHighlighter.hidden = true;
      if (secondPoint) walls.push(new Wall(currentPoint, secondPoint, textureGroup[tile]));
      requestAnimationFrame(RenderLoop);
    }
  } else if (mode === MODES.PLACE) {
    if (temp.keysDown["ShiftLeft"] && highlightedWall != undefined) {
      // Delete wall
      walls.splice(highlightedWall, 1)
      requestAnimationFrame(RenderLoop);
    }
  }
};

// Select tile
sidebar.onMouseDown = (e) => {
  let x = Math.floor((e.pageX - cam.pxWidth) / (sidebar.pxWidth / 4));
  let y = Math.floor(e.pageY / (sidebar.pxWidth / 4));

  if (textureGroup[x + 4 * y] != undefined) {
    tile = x + 4 * y;
    selector.rotpos.position[0] = sidebar.pxWidth / 2 - (x % 4) * sidebar.pxWidth / 4 - sidebar.pxWidth / 8;
    // TODO: Implement y-selector for this

    requestAnimationFrame(RenderLoop);
  }
};

// Downloads the map on C
temp.keyDownCallbacks["KeyC"] = () => {
  const element = document.createElement('a');

  const text = JSON.stringify({
    shaders: [{
      vertexShader: "vertexShader.vs",
      fragmentShader: "fragmentShader.fs"
    }],
    models: {
      "plane.json": 0,
    },
    objects: walls.map((wall) => {
      const q = quat.create();
      quat.rotateY(q, q, -Math.atan(wall.gradient));
      return {
        object: "plane.json",
        position: [(wall.point1.x + wall.point2.x), 0, (wall.point1.y + wall.point2.y)],
        rotation: q,
        scale: [wall.length, 1, 1],
        texture: wall.texture,
      };
    })
  });
  element.setAttribute('href', 'data:application/json;charset=utf-8,' + encodeURIComponent(text));
  element.setAttribute('download', "map");

  element.style.display = "none";
  document.body.appendChild(element);

  element.click();

  document.body.removeChild(element);
};

temp.keyDownCallbacks["Enter"] = toggleFullScreen;

temp.keyDownCallbacks["Space"] = () => {
  mode = (mode === MODES.MOVE) ? MODES.PLACE : MODES.MOVE;
  cam.cursor = (mode === MODES.MOVE) ? "grab" : "pointer";
  highlighter.hidden = true;
  requestAnimationFrame(RenderLoop);
};


//Zooming
document.addEventListener("wheel", e => {
  if (e.pageX > cam.pxWidth) {
    return;
  }
  zoom += e.deltaY / 50;

  //Zoom cap
  if (zoom < 4) {
    zoom = 4;
  }

  cam.zoom = 50 / zoom;

  cam.RecalculateProjMatrix();

  requestAnimationFrame(RenderLoop);
});


//Resizing for the window. What's the difference between "resize" and "onresize"?
window.addEventListener("resize", e => {
  temp.canvas.width = temp.canvas.clientWidth;
  temp.canvas.height = temp.canvas.clientHeight;

  for (let i = 0; i < temp.cameras.length; i++) {
    temp.cameras[i].pxWidth = temp.canvas.width * temp.cameras[i].width;
    temp.cameras[i].pxHeight = temp.canvas.height * temp.cameras[i].height;
    temp.cameras[i].aspectRatio = temp.cameras[i].pxWidth / temp.cameras[i].pxHeight;
    temp.cameras[i].RecalculateProjMatrix();
  }

  requestAnimationFrame(RenderLoop);
});