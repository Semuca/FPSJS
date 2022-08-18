attribute vec4 aVertexPosition;

uniform mat4 uProjectionMatrix;
uniform mat4 uModelMatrix;

varying highp vec2 vTextureCoord;

void main() {
	vTextureCoord = aVertexPosition.zw;
	gl_Position = uProjectionMatrix * uModelMatrix * aVertexPosition;
}
