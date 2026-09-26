#version 300 es
precision highp float;

in vec2 fragTexCoord;

uniform sampler2D texture0;
uniform float lightClipNear;
uniform float lightClipFar;

float LinearDepth(float depth, float near, float far)
{
    return (2.0 * near) / (far + near - depth * (far - near));
}

void main()
{
    if (texture(texture0, fragTexCoord).a < 0.2)
    {
        discard;
    }

    gl_FragDepth = LinearDepth(gl_FragCoord.z, lightClipNear, lightClipFar);
}
