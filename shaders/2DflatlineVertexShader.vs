attribute vec2 aVertexPosition;

uniform mat4 uOrthoMatrix;
uniform mat4 uModelMatrix;
uniform vec4 colour;

varying mediump vec4 vColour;

void main() {
	gl_Position = uOrthoMatrix * uModelMatrix * vec4(aVertexPosition, 0.0, 1.0);
	vColour = colour;
}
