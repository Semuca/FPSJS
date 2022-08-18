attribute vec4 aVertexPosition;
attribute vec2 aTexturePosition;

uniform mat4 uProjectionMatrix;
uniform mat4 uModelMatrix;
uniform mat4 uViewMatrix;

varying highp vec2 vTextureCoord;

void main() {
	gl_Position = uProjectionMatrix * uViewMatrix * uModelMatrix * aVertexPosition;
	vTextureCoord = aTexturePosition;
}
