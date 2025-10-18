attribute vec4 a_Position;
attribute vec4 a_Color;
uniform mat4 u_ModelMatrix;
varying vec4 v_Color;
void main() {
    // 先应用模型变换
    vec4 position = u_ModelMatrix * a_Position;

    // 简单安全的透视计算
    // 将立方体向后推，让Z坐标变成负数（远离相机）
    float distance = -position.z + 3.14;  // distance总是正数,避免除零
    float scale = 2.0 / distance;  // 简单的反比例缩放

    // 应用透视缩放
    position.x = position.x * scale;
    position.y = position.y * scale;

    gl_Position = position;
    v_Color = a_Color;
}