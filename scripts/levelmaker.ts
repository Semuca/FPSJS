import { FScreen, toggleFullScreen } from './screen.js';
import { LoadFileText, CreateTexture, LoadModel, LoadShader, MapFile } from './loading.js';
import { Objec, RotPos2D } from './objec.js';
import {
  roundToNearest,
  distancePointToPoint,
  Point2D,
  Segment2D,
  ShortestDistanceFromPointToSegment,
} from './geometry.js';
import { quat, vec3 } from 'gl-matrix';

const MODES = {
  MOVE: 0,
  PLACE: 1,
  DRAWING: 2,
};

class Sprite extends Point2D {
  texture: string;
  tags: string[];

  constructor(point1: Point2D, texture: string, tags: string[]) {
    super(point1.x, point1.y);
    this.texture = texture;
    this.tags = tags;
  }
}

class Wall extends Segment2D {
  texture: string;
  tags: string[];

  constructor(point1: Point2D, point2: Point2D, texture: string, tags: string[]) {
    super(point1, point2);
    this.texture = texture;
    this.tags = tags;
  }
}

let mode = MODES.PLACE;

let tile = 0;
let currentPoint: Point2D | undefined = undefined;
let secondPoint: Point2D | undefined = undefined;

let cursorWorldPosition: Point2D;

const sprites: Sprite[] = [];
const walls: Wall[] = [];
let highlightedWall = -1;

let line: Objec;
let hover: Objec;

let highlighter: Objec;
let secondHighlighter: Objec;

let selector: Objec;

const temp = new FScreen('canvas');
const cam = temp.AddCamera([0.0, 0.0], [0.8, 1.0], 0);
cam.zoom = 50;
cam.RecalculateProjMatrix();
cam.cursor = 'pointer';
const sidebar = temp.AddCamera([0.8, 0.0], [1.0, 1.0], 1);

let currentSidepaneIndex = 0;

interface Sidepane {
  textures: string[];
  selector: number;
  place: string;
  tags: string[];
}
let sidepanes: Sidepane[] = [];

function UpdateSidebar(sidebarIndex: number) {
  const textureGroup = sidepanes.at(sidebarIndex)?.textures;
  if (!textureGroup) return;

  currentSidepaneIndex = sidebarIndex;

  const width = sidebar.pxWidth / 4;

  textureGroup.forEach((texture, i) => {
    temp.shaders[0].InstanceObject(
      'verSprite.json',
      new RotPos2D(
        [
          width * 2 - ((i % 4) + 1) * width + width / 2,
          sidebar.pxHeight / 2 - width * (Math.floor(i / 4) + 1) + width / 2,
        ],
        Math.PI,
        [width / 2, width / 2],
      ),
      1,
      texture,
    );
  });

  selector = temp.shaders[0].InstanceObject(
    'verSprite.json',
    new RotPos2D(
      [width * 2 - width + width / 2, sidebar.pxHeight / 2 - width + width / 2],
      Math.PI,
      [width / 2, width / 2],
    ),
    1,
    'tframe.png',
  );

  DrawSidebar();
}

cam.PreDraw();
Setup();

async function Setup() {
  //Load 2d shader, plus the model
  await LoadShader(cam, '2DspriteVertexShader.vs', 'spriteFragmentShader.fs');
  let modelData = await LoadModel(temp, 'verSprite.json');
  temp.shaders[0].CreateModel('verSprite.json', modelData);

  //Processing textures to be loaded. Shouldn't this be a part of the map?
  const sidepaneData = await LoadFileText('../sidepanes.json');
  sidepanes = JSON.parse(sidepaneData).sidepanes;

  sidepanes.forEach((_sidepane, index) => {
    temp.keyDownCallbacks[`Digit${index + 1}`] = () => {
      if (currentSidepaneIndex === index) return;
      temp.shaders[0].DeleteAllObjects(1);
      UpdateSidebar(index);
      requestAnimationFrame(RenderLoop);
    };
  });

  await Promise.allSettled([
    sidepanes
      .map((sidepane) => sidepane.textures)
      .flat()
      .map((texture) => CreateTexture(temp, texture)),
    CreateTexture(temp, 'tframe.png'),
  ]);

  // Load sidebar
  UpdateSidebar(currentSidepaneIndex);

  highlighter = temp.shaders[0].InstanceObject(
    'verSprite.json',
    new RotPos2D([0.5, 0.5], Math.PI, [0.2, 0.2]),
    0,
    'tframe.png',
  );
  highlighter.hidden = true;
  secondHighlighter = temp.shaders[0].InstanceObject(
    'verSprite.json',
    new RotPos2D([0.5, 0.5], Math.PI, [0.2, 0.2]),
    0,
    'tframe.png',
  );
  secondHighlighter.hidden = true;

  hover = temp.shaders[0].InstanceObject(
    'verSprite.json',
    new RotPos2D([0.5, 0.5], Math.PI, [0.5, 0.5]),
    0,
    'texture.png',
  );
  hover.hidden = true;

  //Load line models
  await LoadShader(cam, '2DflatlineVertexShader.vs', 'lineFragmentShader.fs');
  modelData = await LoadModel(temp, 'flatline.json');
  temp.shaders[1].CreateModel('flatline.json', modelData);
  line = temp.shaders[1].InstanceObject(
    'flatline.json',
    new RotPos2D([0.0, 0.0], undefined, [0.0, 0.0]),
    0,
  );

  await LoadShader(cam, 'grid.vs', 'grid.fs');
  const plane = await LoadModel(temp, 'verSprite.json');
  temp.shaders[2].CreateModel('verSprite.json', plane);
  temp.shaders[2].InstanceObject('verSprite.json', new RotPos2D([0.0, 0.0]), 0);

  cam.SetUniform('u_resolution', [cam.pxWidth, cam.pxHeight]);

  requestAnimationFrame(RenderLoop);
}

//Should only be called once per animation frame. Starts a loop of updating shaders.
function RenderLoop() {
  temp.gl.clear(temp.gl.COLOR_BUFFER_BIT | temp.gl.DEPTH_BUFFER_BIT);

  //Should do much less draws here, but for now things seem to be fine
  cam.PreDraw();

  temp.shaders[2].DrawScene(0);

  //Sets up grid to be drawn
  if (!temp.shaders[1].shaderProgram) return;
  temp.gl.useProgram(temp.shaders[1].shaderProgram);
  temp.gl.bindVertexArray(temp.shaders[1].models['flatline.json'].vao);
  temp.gl.uniform4fv(
    temp.shaders[1].programInfo.uniformLocations['colour'],
    new Float32Array([1.0, 0.0, 0.0, 1.0]),
  );

  // Draw walls
  walls.forEach((wall, index) => {
    let colour = [1.0, 1.0, 1.0, 1.0];
    if (index === highlightedWall) {
      colour = [0.0, 1.0, 1.0, 1.0];
    } else if (highlightedWall != -1 && wall.texture === walls[highlightedWall].texture) {
      colour = [1.0, 0.0, 1.0, 1.0];
    }

    temp.gl.uniform4fv(
      temp.shaders[1].programInfo.uniformLocations['colour'],
      new Float32Array(colour),
    );

    // Draw line from point
    line.rotpos.position[0] = cam.rotpos.position[0] - wall.point1.x;
    line.rotpos.position[1] = cam.rotpos.position[1] + wall.point1.y;

    // Get x and y distance
    const xDist = wall.point1.x - wall.point2.x;
    const yDist = wall.point1.y - wall.point2.y;
    line.rotpos.scale[1] = Math.sqrt(xDist ** 2 + yDist ** 2);
    const angle = Math.atan(xDist / yDist) + (yDist < 0 ? 0 : -Math.PI);

    quat.setAxisAngle(line.rotpos.rotation, [0.0, 0.0, 1.0], angle);
    temp.gl.uniformMatrix4fv(
      temp.shaders[1].programInfo.uniformLocations.uModelMatrix,
      false,
      line.GetMatrix(),
    );
    temp.gl.drawArrays(temp.gl.LINES, 0, 2);
  });

  // Draw line from selected point to cursor
  if (currentPoint && mode === MODES.DRAWING) {
    line.rotpos.position[0] = cam.rotpos.position[0] + highlighter.rotpos.position[0];
    line.rotpos.position[1] = cam.rotpos.position[1] + highlighter.rotpos.position[1];

    // Get x and y distance
    const xDist = highlighter.rotpos.position[0] + cursorWorldPosition.x;
    const yDist = cursorWorldPosition.y - highlighter.rotpos.position[1];
    line.rotpos.scale[1] = Math.sqrt(xDist ** 2 + yDist ** 2);
    const angle = Math.atan(xDist / yDist) + (yDist < 0 ? Math.PI : 0);

    quat.setAxisAngle(line.rotpos.rotation, [0.0, 0.0, 1.0], angle);
    temp.gl.uniformMatrix4fv(
      temp.shaders[1].programInfo.uniformLocations.uModelMatrix,
      false,
      line.GetMatrix(),
    );
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
  if (sidepanes[currentSidepaneIndex].place === 'point' && highlighter.hidden === false) {
    sprites.push(
      new Sprite(
        new Point2D(highlighter.rotpos.position[0], highlighter.rotpos.position[1]),
        sidepanes[currentSidepaneIndex].textures[tile],
        sidepanes[currentSidepaneIndex].tags,
      ),
    );

    temp.shaders[0].InstanceObject(
      'verSprite.json',
      new RotPos2D(
        [highlighter.rotpos.position[0], highlighter.rotpos.position[1]],
        Math.PI,
        [0.5, 0.5],
      ),
      0,
      sidepanes[currentSidepaneIndex].textures[tile],
    );

    requestAnimationFrame(RenderLoop);
  } else if (sidepanes[currentSidepaneIndex].place === 'line') {
    if (mode === MODES.PLACE) {
      if (currentPoint) {
        mode = MODES.DRAWING;
        requestAnimationFrame(RenderLoop);
      }
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
    const roundedPoint = new Point2D(
      roundToNearest(cursorWorldPosition.x, sidepanes[currentSidepaneIndex].selector),
      roundToNearest(cursorWorldPosition.y, sidepanes[currentSidepaneIndex].selector),
    );

    if (distancePointToPoint(cursorWorldPosition, roundedPoint) <= highlightRadiusTrigger) {
      if (
        highlighter.rotpos.position[0] != roundedPoint.x ||
        highlighter.rotpos.position[1] != roundedPoint.y ||
        highlighter.hidden === true
      ) {
        highlighter.hidden = false;
        currentPoint = new Point2D(roundedPoint.x, roundedPoint.y);
        highlighter.rotpos.position = [-roundedPoint.x, roundedPoint.y, 1.0];

        drawFlag = true;
      }
    } else if (highlighter.hidden === false) {
      highlighter.hidden = true;
      currentPoint = undefined;
      drawFlag = true;
    }

    // Calculate line that is being hovered over
    const oldHighlightedWall = highlightedWall;
    highlightedWall = walls.findIndex(
      (wall) =>
        ShortestDistanceFromPointToSegment(cursorWorldPosition, wall) <= highlightRadiusTrigger,
    );
    if (oldHighlightedWall != -1 || highlightedWall != -1) {
      if (highlightedWall === -1) {
        hover.hidden = true;
      } else {
        hover.rotpos.position = [-cursorWorldPosition.x, cursorWorldPosition.y + 0.5, 1.0];
        hover.texId = temp.texIds[walls[highlightedWall].texture];
        hover.hidden = false;
      }

      drawFlag = true;
    }

    if (drawFlag) requestAnimationFrame(RenderLoop);
  } else if (mode === MODES.MOVE) {
    if (e.buttons === 1) {
      document.body.style.cursor = 'grabbing';
      cam.rotpos.position[0] -= e.movementX / cam.zoom;
      cam.rotpos.position[1] -= e.movementY / cam.zoom;

      cam.UpdatePos();
      requestAnimationFrame(RenderLoop);
    } else {
      document.body.style.cursor = 'grab';
    }
  } else if (mode === MODES.DRAWING) {
    // Calculate from position, if a point is enabled or not
    // Logic: figure out the closest point, figure out if that's in range
    const roundedPoint = new Point2D(
      Math.round(cursorWorldPosition.x),
      Math.round(cursorWorldPosition.y),
    );

    if (distancePointToPoint(cursorWorldPosition, roundedPoint) <= highlightRadiusTrigger) {
      if (
        secondHighlighter.rotpos.position[0] != roundedPoint.x ||
        secondHighlighter.rotpos.position[1] != roundedPoint.y ||
        secondHighlighter.hidden === true
      ) {
        secondHighlighter.hidden = false;
        secondPoint = new Point2D(roundedPoint.x, roundedPoint.y);
        secondHighlighter.rotpos.position = [-roundedPoint.x, roundedPoint.y, 1.0];

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
      if (secondPoint)
        walls.push(
          new Wall(
            currentPoint,
            secondPoint,
            sidepanes[currentSidepaneIndex].textures[tile],
            sidepanes[currentSidepaneIndex].tags,
          ),
        );
      cam.onMouseMove(e);
    }
  } else if (mode === MODES.PLACE) {
    if (temp.keysDown['ShiftLeft'] && highlightedWall != undefined) {
      // Delete wall
      walls.splice(highlightedWall, 1);
      requestAnimationFrame(RenderLoop);
    }
  }
};

// Select tile
sidebar.onMouseDown = (e) => {
  const x = Math.floor((e.pageX - cam.pxWidth) / (sidebar.pxWidth / 4));
  const y = Math.floor(e.pageY / (sidebar.pxWidth / 4));

  if (sidepanes[currentSidepaneIndex].textures[x + 4 * y] != undefined) {
    tile = x + 4 * y;
    selector.rotpos.position[0] =
      sidebar.pxWidth / 2 - ((x % 4) * sidebar.pxWidth) / 4 - sidebar.pxWidth / 8;
    // TODO: Implement y-selector for this

    requestAnimationFrame(RenderLoop);
  }
};

// Loads a map on U
temp.keyDownCallbacks['KeyU'] = () => {
  const input = document.createElement('input');
  input.type = 'file';

  input.onchange = async (e) => {
    const files = (e.target as HTMLInputElement).files;
    if (!files) return;
    const file = JSON.parse(await files[0].text()) as MapFile;
    file.objects.forEach((object) => {
      if (!object.texture) return;

      const tags = object.tags ?? [];
      if (tags.includes('wall')) {
        const rotationVec = vec3.create();
        const angle = quat.getAxisAngle(rotationVec, object.rotation);

        const scale = object.scale[0];
        const xBonus = Math.cos(angle) * scale;
        const yBonus = Math.sin(angle) * scale * (rotationVec[1] < 0 ? 1 : -1);

        const point1 = new Point2D(object.position[2] + yBonus, object.position[0] + xBonus);
        const point2 = new Point2D(object.position[2] - yBonus, object.position[0] - xBonus);

        walls.push(new Wall(point1, point2, object.texture, sidepanes[currentSidepaneIndex].tags));
      } else if (tags.includes('sprite')) {
        sprites.push(
          new Sprite(
            new Point2D(object.position[0], object.position[2]),
            object.texture,
            sidepanes[currentSidepaneIndex].tags,
          ),
        );
        temp.shaders[0].InstanceObject(
          'verSprite.json',
          new RotPos2D([object.position[0], object.position[2]], Math.PI, [1, 1]),
          0,
          object.texture,
        );
      }
    });
  };

  input.click();
};

// Downloads the map on C
temp.keyDownCallbacks['KeyC'] = () => {
  const element = document.createElement('a');

  const text = JSON.stringify({
    shaders: [
      {
        vertexShader: 'vertexShader.vs',
        fragmentShader: 'fragmentShader.fs',
      },
    ],
    models: {
      'plane.json': 0,
    },
    objects: walls
      .map((wall) => {
        const q = quat.create();
        quat.rotateY(q, q, -Math.atan(wall.gradient));
        return {
          object: 'plane.json',
          position: [wall.point1.x + wall.point2.x, 0, wall.point1.y + wall.point2.y],
          rotation: q,
          scale: [wall.length, 1, 1],
          texture: wall.texture,
          tags: wall.tags,
        };
      })
      .concat(
        sprites.map((sprite) => {
          return {
            object: 'plane.json',
            position: [sprite.x, 0, sprite.y],
            rotation: [0, 0, 0, 1],
            scale: [1, 1, 1],
            texture: sprite.texture,
            tags: sprite.tags,
          };
        }),
      ),
  });
  element.setAttribute('href', 'data:application/json;charset=utf-8,' + encodeURIComponent(text));
  element.setAttribute('download', 'map');

  element.style.display = 'none';
  document.body.appendChild(element);

  element.click();

  document.body.removeChild(element);
};

temp.keyDownCallbacks['Enter'] = toggleFullScreen;

temp.keyDownCallbacks['Space'] = () => {
  mode = mode === MODES.MOVE ? MODES.PLACE : MODES.MOVE;
  cam.cursor = mode === MODES.MOVE ? 'grab' : 'pointer';
  highlighter.hidden = true;
  requestAnimationFrame(RenderLoop);
};

//Zooming
document.addEventListener('wheel', (e) => {
  if (e.pageX > cam.pxWidth) return;

  cam.zoom += e.deltaY / 5;

  //Zoom cap
  if (cam.zoom < 20) {
    cam.zoom = 20;
  }

  cam.RecalculateProjMatrix();

  requestAnimationFrame(RenderLoop);
});

//Resizing for the window. What's the difference between "resize" and "onresize"?
window.addEventListener('resize', () => {
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
