attribute vec2 aVertexPosition;
attribute vec2 aTextureCoord;

uniform mat4 uOrthoMatrix;
uniform mat4 uViewMatrix;
uniform mat4 uModelMatrix;

varying highp vec2 vTextureCoord;

void main() {
	vTextureCoord = aTextureCoord;
	gl_Position = uOrthoMatrix * uViewMatrix * uModelMatrix * vec4(aVertexPosition, 0.0, 1.0);
}
