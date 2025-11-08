attribute vec3 a_Position;
varying vec3 v_texCoord;
uniform mat4 u_MvpMatrix;
void main(void)
{
    //三维方向中心到顶点的向量，定义的立方体的中心是(0,0,0)，所以采样坐标就是顶点位置
    v_texCoord = normalize(a_Position);
    gl_Position =  u_MvpMatrix*vec4(a_Position, 1.0);
}