// 带光照的顶点着色器
attribute vec4 a_Position;
attribute vec4 a_Color;
attribute vec4 a_Normal;

uniform mat4 u_MvpMatrix;
uniform mat4 u_ModelMatrix;
uniform mat4 u_NormalMatrix;

varying vec4 v_Color;
varying vec3 v_Normal;
varying vec3 v_Position;

void main(void)
{
    // 将顶点位置变换到世界坐标系
    vec4 pos = u_ModelMatrix * a_Position;
    v_Position = pos.xyz;

    // 计算法向量并变换
    v_Normal = normalize(vec3(u_NormalMatrix * a_Normal));

    // 传递颜色
    v_Color = a_Color;

    // 设置最终位置
    gl_Position = u_MvpMatrix * a_Position;
}