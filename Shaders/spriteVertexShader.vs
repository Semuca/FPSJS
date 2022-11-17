attribute vec2 aVertexPosition;
attribute vec2 aTextureCoord;

uniform mat4 uProjectionMatrix;
uniform mat4 uModelMatrix;

varying highp vec2 vTextureCoord;

void main() {
	vTextureCoord = aTextureCoord;
	gl_Position = uProjectionMatrix * uModelMatrix * vec4(aVertexPosition, 0.0, 1.0);
}
