precision mediump float;

uniform vec2 u_resolution;
uniform mat4 uOrthoMatrix_inverse;
uniform mat4 uViewMatrix;

// Returns 1 if on the grid, 0 otherwise
float grid(vec4 world_pos, float resolution) {
    vec2 grid = fract(world_pos.xy + resolution / 2.);
    return 1. - (step(resolution, grid.x) * step(resolution, grid.y));
}

void main() {
    vec2 normalized = gl_FragCoord.xy / u_resolution * 2. - 1.;
    normalized.y *= -1.;

    vec4 world_pos = uOrthoMatrix_inverse * uViewMatrix * vec4(normalized, 0., 1.);

    vec3 colour = (abs(world_pos.x) < 0.025 || abs(world_pos.y) < 0.025) ? vec3(1., 1., 1.) : vec3(1., 0., 0.);

    colour *= grid(world_pos, 0.05);

    gl_FragColor = vec4(colour, 1.);
}
