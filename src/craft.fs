#ifdef GL_FRAGMENT_PRECISION_HIGH
    precision highp float;
#else
    precision mediump float;
#endif
uniform samplerCube u_cubeSampler;
varying vec3 v_texCoord;
void main(void)
{
    //着色器内建的取样函数要变成立方图纹理的版本,采样坐标vec3
    gl_FragColor = textureCube(u_cubeSampler, normalize(v_texCoord));
}