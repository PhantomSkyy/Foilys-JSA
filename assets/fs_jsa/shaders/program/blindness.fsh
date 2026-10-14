#version 150

uniform sampler2D DiffuseSampler;
uniform sampler2D PrevSampler;
uniform vec2 InSize;

out vec4 fragColor;

void main() {
    vec2 texCoord = gl_FragCoord.xy / InSize;
    
    vec4 current = texture(DiffuseSampler, texCoord);
    vec4 previous = texture(PrevSampler, texCoord);
    
    // 1. Blend current frame with previous frame at full brightness to maintain trail history.
    // 0.70 controls how long the streak lingers (0.50 = shorter trail, 0.85 = longer trail)
    vec3 streak = mix(current.rgb, previous.rgb, 0.70);
    
    // 2. Darken the final result for daytime blindness without collapsing the feedback loop to black.
    // Tweak 0.20 up or down (e.g., 0.15 for darker, 0.30 for lighter)
    vec3 finalOutput = streak * 0.20;
    
    fragColor = vec4(finalOutput, current.a);
}