attribute vec4 aVertexPosition;

uniform mat4 uPerspectiveMatrix;
uniform mat4 uModelMatrix;
uniform mat4 uViewMatrix;

varying mediump vec4 vColour;

void main() {
	gl_Position = uPerspectiveMatrix * uViewMatrix * uModelMatrix * aVertexPosition;
}
