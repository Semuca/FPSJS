attribute vec4 aVertexPosition;

uniform mat4 uProjectionMatrix;
uniform mat4 uModelMatrix;
uniform mat4 uViewMatrix;

void main() {
	gl_Position = uProjectionMatrix * uViewMatrix * uModelMatrix * aVertexPosition;
}
