// 带光照的片元着色器
#ifdef GL_FRAGMENT_PRECISION_HIGH
    precision highp float;
#else
    precision mediump float;
#endif

uniform vec3 u_LightColor;       // 光颜色
uniform vec3 u_LightDirection;   // 光方向（世界坐标系下，已归一化）
uniform vec3 u_AmbientLight;     // 环境光
uniform sampler2D u_ShadowMap;   // 阴影贴图
uniform float u_ShadowIntensity; // 阴影强度

varying vec4 v_Color;
varying vec3 v_Normal;
varying vec3 v_Position;
varying vec4 v_ShadowCoord;

void main(void)
{
    // 归一化法向量
    vec3 normal = normalize(v_Normal);

    // 计算光照方向（使用固定的平行光方向）
    vec3 lightDir = normalize(u_LightDirection);

    // 计算漫反射强度
    float nDotL = max(dot(lightDir, normal), 0.0);

    // 计算漫反射光颜色
    vec3 diffuse = u_LightColor * v_Color.rgb * nDotL;

    // 计算环境光颜色
    vec3 ambient = u_AmbientLight * v_Color.rgb;

    // 为了兼容简化阴影系统，我们使用一个基于光照方向和高度的简单阴影估计算法
    // 这里我们使用光照方向的Y分量来估算阴影
    float shadow = 0.0;
    if (u_LightDirection.y < 0.5) {  // 当太阳较低时，阴影更强
        shadow = (0.5 - u_LightDirection.y) * 1.5;
        shadow = min(shadow, 0.7);   // 限制最大阴影强度
    }

    // 应用阴影
    vec3 finalColor = (ambient + (1.0 - shadow * u_ShadowIntensity) * diffuse);

    gl_FragColor = vec4(finalColor, v_Color.a);
}