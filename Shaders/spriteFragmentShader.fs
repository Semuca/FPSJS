varying highp vec2 vTextureCoord;

uniform sampler2D uSampler;

void main() {
  highp vec4 texColour = texture2D(uSampler, vTextureCoord);
  //if (texColour.a < 0.1) discard;
  gl_FragColor = texColour;
}
