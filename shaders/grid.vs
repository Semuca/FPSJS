attribute vec2 aVertexPosition;

void main() {
    gl_Position = vec4(aVertexPosition.x, aVertexPosition.y, 0.0, 1.0);
}
