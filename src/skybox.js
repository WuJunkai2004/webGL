// 天空盒系统
import { loadFile } from "/canvas.js";

// 天空盒顶点数据（单位立方体）
const SKYBOX_VERTICES = new Float32Array([
  // 前面
  -1.0, -1.0,  1.0,
   1.0, -1.0,  1.0,
   1.0,  1.0,  1.0,
  -1.0,  1.0,  1.0,
  // 后面
  -1.0, -1.0, -1.0,
  -1.0,  1.0, -1.0,
   1.0,  1.0, -1.0,
   1.0, -1.0, -1.0,
  // 左面
  -1.0, -1.0, -1.0,
  -1.0, -1.0,  1.0,
  -1.0,  1.0,  1.0,
  -1.0,  1.0, -1.0,
  // 右面
   1.0, -1.0,  1.0,
   1.0, -1.0, -1.0,
   1.0,  1.0, -1.0,
   1.0,  1.0,  1.0,
  // 顶面
  -1.0,  1.0, -1.0,
  -1.0,  1.0,  1.0,
   1.0,  1.0,  1.0,
   1.0,  1.0, -1.0,
  // 底面
  -1.0, -1.0, -1.0,
   1.0, -1.0, -1.0,
   1.0, -1.0,  1.0,
  -1.0, -1.0,  1.0
]);

// 天空盒索引
const SKYBOX_INDICES = new Uint16Array([
  // 前面
  0, 1, 2,   0, 2, 3,
  // 后面
  4, 5, 6,   4, 6, 7,
  // 左面
  8, 9, 10,  8, 10, 11,
  // 右面
  12, 13, 14, 12, 14, 15,
  // 顶面
  16, 17, 18, 16, 18, 19,
  // 底面
  20, 21, 22, 20, 22, 23
]);

export class Skybox {
  constructor() {
    this.verticesBuffer = null;
    this.indicesBuffer = null;
    this.vao = null;
    this.program = null;
    this.uMvpMatrix = null;
    this.uSkyColor = null;
  }

  async init(gl) {
    // 加载天空盒着色器
    const vShaderSource = `
      attribute vec4 a_Position;
      uniform mat4 u_MvpMatrix;
      varying vec3 v_TexCoord;
      
      void main() {
        // 移除位置变换，保持天空盒在视点中心
        gl_Position = u_MvpMatrix * a_Position;
        // 传递顶点坐标作为纹理坐标
        v_TexCoord = a_Position.xyz;
      }
    `;
    
    const fShaderSource = `
      #ifdef GL_FRAGMENT_PRECISION_HIGH
        precision highp float;
      #else
        precision mediump float;
      #endif
      
      uniform vec3 u_SkyColor; // 天空颜色
      uniform float u_TimeOfDay; // 一天中的时间 (0.0-1.0)
      varying vec3 v_TexCoord;
      
      void main() {
        // 根据时间调整天空颜色
        float time = u_TimeOfDay;
        vec3 dayColor = vec3(0.4, 0.6, 1.0);    // 白天蓝色
        vec3 dawnColor = vec3(1.0, 0.6, 0.2);   // 黎明橙色
        vec3 nightColor = vec3(0.05, 0.05, 0.2); // 夜晚深蓝
        
        vec3 skyColor;
        if (time > 0.75 || time < 0.25) {
          // 夜晚
          skyColor = mix(nightColor, dawnColor, abs(time - 0.75) * 4.0);
        } else if (time < 0.5) {
          // 黎明
          skyColor = mix(dawnColor, dayColor, (time - 0.25) * 4.0);
        } else if (time < 0.75) {
          // 白天
          skyColor = mix(dayColor, dawnColor, (time - 0.5) * 4.0);
        } else {
          // 黄昏
          skyColor = mix(dawnColor, nightColor, (time - 0.75) * 4.0);
        }
        
        // 基于Y坐标创建渐变效果
        float yFactor = (v_TexCoord.y + 1.0) / 2.0;
        skyColor = mix(skyColor, vec3(0.7, 0.8, 1.0), yFactor * 0.5);
        
        gl_FragColor = vec4(skyColor, 1.0);
      }
    `;
    
    // 初始化着色器
    const { initShaders } = window;
    if (!initShaders(gl, vShaderSource, fShaderSource)) {
      console.log('初始化天空盒着色器失败');
      return false;
    }
    
    this.program = gl.program;
    
    // 获取uniform变量位置
    this.uMvpMatrix = gl.getUniformLocation(this.program, 'u_MvpMatrix');
    this.uSkyColor = gl.getUniformLocation(this.program, 'u_SkyColor');
    this.uTimeOfDay = gl.getUniformLocation(this.program, 'u_TimeOfDay');
    
    // 创建缓冲区
    this.verticesBuffer = gl.createBuffer();
    this.indicesBuffer = gl.createBuffer();
    
    // 顶点数据
    gl.bindBuffer(gl.ARRAY_BUFFER, this.verticesBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, SKYBOX_VERTICES, gl.STATIC_DRAW);
    
    // 索引数据
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indicesBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, SKYBOX_INDICES, gl.STATIC_DRAW);
    
    // 获取attribute变量位置
    const aPosition = gl.getAttribLocation(this.program, 'a_Position');
    
    // 启用顶点属性
    gl.enableVertexAttribArray(aPosition);
    gl.vertexAttribPointer(aPosition, 3, gl.FLOAT, false, 0, 0);
    
    return true;
  }

  render(gl, mvpMatrix, timeOfDay) {
    if (!this.program) return;
    
    // 保存当前program
    const currentProgram = gl.getParameter(gl.CURRENT_PROGRAM);
    
    // 使用天空盒着色器程序
    gl.useProgram(this.program);
    
    // 提取视图矩阵部分，移除平移分量以保持天空盒在视点中心
    const skyboxMvp = new Matrix4(mvpMatrix);
    // 将位置设置为原点
    skyboxMvp.elements[12] = 0.0;  // x平移
    skyboxMvp.elements[13] = 0.0;  // y平移
    skyboxMvp.elements[14] = 0.0;  // z平移
    
    // 上传MVP矩阵
    gl.uniformMatrix4fv(this.uMvpMatrix, false, skyboxMvp.elements);
    
    // 上传时间信息
    gl.uniform1f(this.uTimeOfDay, timeOfDay);
    
    // 绘制天空盒
    gl.bindBuffer(gl.ARRAY_BUFFER, this.verticesBuffer);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indicesBuffer);
    
    const aPosition = gl.getAttribLocation(this.program, 'a_Position');
    gl.enableVertexAttribArray(aPosition);
    gl.vertexAttribPointer(aPosition, 3, gl.FLOAT, false, 0, 0);
    
    // 禁用深度写入，但保持深度测试（让天空盒总是在背景中）
    gl.depthMask(false);
    gl.drawElements(gl.TRIANGLES, SKYBOX_INDICES.length, gl.UNSIGNED_SHORT, 0);
    gl.depthMask(true);
    
    // 恢复之前的program
    gl.useProgram(currentProgram);
  }
}