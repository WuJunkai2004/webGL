import { loadFile } from "/canvas.js";
import { Terrain, Tree } from "./terrain.js";
import { Skybox } from "./skybox.js";
import { ShadowMap } from "./shadow.js";

let rotationH = 0;  // 水平旋转角度，单位：度
let rotationV = 0;  // 垂直旋转角度，单位：度

let ctx; // WebGL 上下文
let u_MvpMatrix;    // u_MvpMatrix uniform 的位置
let u_NormalMatrix; // u_NormalMatrix uniform 的位置
let u_ModelMatrix;  // u_ModelMatrix uniform 的位置
let u_LightColor;   // 光颜色
let u_LightDirection; // 光方向
let u_AmbientLight;   // 环境光
let mvpMatrix; // 投影-视图 矩阵
let modelMatrix; // 模型矩阵
let normalMatrix; // 法向量矩阵
let nIndices = 0; // 索引数量，用于 drawElements
// 摄像机位置（世界坐标），初始置于盒子内部中心
let camX = 0.0, camY = 0.0, camZ = 0.0;

// 昼夜系统相关变量
let dayTime = 0; // 模拟时间，从0开始
const DAY_CYCLE_DURATION = 10000; // 一个昼夜周期持续时间（毫秒）

// 地形对象
let terrain;
let tree;
let skybox;
let shadowMap;

export async function init(canvas) {
  const { getWebGLContext, initShaders, Matrix4 } = window;
  
  // 加载带光照的着色器
  const vShaderSource = await loadFile('/src/lighted.vs');
  const fShaderSource = await loadFile('/src/lighted.fs');

  ctx = getWebGLContext(canvas);
  if (!ctx) {
    console.log('获取WebGL渲染上下文失败');
    return;
  }

  if (!initShaders(ctx, vShaderSource, fShaderSource)) {
    console.log('初始化着色器失败');
    return;
  }

  // 创建地形
  terrain = new Terrain();
  
  // 在地形上种一棵树
  tree = new Tree(terrain);
  tree.plantTree(8, 5, 8); // 在区块中心种树
  
  // 生成地形顶点数据
  terrain.generateVertices();
  const data = terrain.getVertexData();
  
  // 初始化顶点缓冲区
  nIndices = initVertexBuffers(ctx, data);
  if (nIndices < 0) {
    console.log('初始化顶点缓冲失败');
    return;
  }

  // 获取 uniform 变量位置
  u_MvpMatrix = ctx.getUniformLocation(ctx.program, 'u_MvpMatrix');
  u_ModelMatrix = ctx.getUniformLocation(ctx.program, 'u_ModelMatrix');
  u_NormalMatrix = ctx.getUniformLocation(ctx.program, 'u_NormalMatrix');
  u_LightColor = ctx.getUniformLocation(ctx.program, 'u_LightColor');
  u_LightDirection = ctx.getUniformLocation(ctx.program, 'u_LightDirection');
  u_AmbientLight = ctx.getUniformLocation(ctx.program, 'u_AmbientLight');

  // 初始化矩阵
  mvpMatrix = new Matrix4();
  modelMatrix = new Matrix4();
  normalMatrix = new Matrix4();

  mvpMatrix.setPerspective(60, canvas.width / canvas.height, 0.1, 100);
  mvpMatrix.lookAt(0.0, 0.0, 0.0, 0.0, 0.0, -1.0, 0.0, 1.0, 0.0);

  // 设置清除和深度测试
  ctx.clearColor(0.0, 0.0, 0.0, 1.0);
  ctx.enable(ctx.DEPTH_TEST);

  // 初始化地形缓冲区
  terrain.initBuffers(ctx);

  // 初始化天空盒
  skybox = new Skybox();
  await skybox.init(ctx);

  // 初始化阴影映射
  shadowMap = new ShadowMap();
  shadowMap.init(ctx);

  var tick = function () {
    render();
    requestAnimationFrame(tick, canvas);
  };
  tick();
}

// 将相机沿局部前向/右向移动（forward: 正为向前，right: 正为向右）
export function moveCamera(forward, right) {
  // 根据当前旋转角计算前向向量
  const toRad = (d) => d * Math.PI / 180.0;
  const yaw = toRad(rotationH);
  const pitch = toRad(rotationV);
  const frontX = Math.cos(pitch) * Math.sin(yaw);
  const frontY = Math.sin(pitch);
  const frontZ = -Math.cos(pitch) * Math.cos(yaw);

  // 计算右向量 (cross(front, up))，up=(0,1,0)
  let rightX = -frontZ;
  let rightY = 0.0;
  let rightZ = frontX;
  // 归一化右向量
  const len = Math.hypot(rightX, rightY, rightZ) || 1.0;
  rightX /= len; rightY /= len; rightZ /= len;

  // 应用前向移动
  camX += frontX * forward + rightX * right;
  camY += frontY * forward + rightY * right;
  camZ += frontZ * forward + rightZ * right;
}

// 初始化顶点缓冲区
function initVertexBuffers(gl, data) {
  // 创建顶点缓冲区
  if (!initArrayBuffer(gl, data.vertices, 3, gl.FLOAT, 'a_Position')) return -1;
  if (!initArrayBuffer(gl, data.colors, 4, gl.FLOAT, 'a_Color')) return -1;
  if (!initArrayBuffer(gl, data.normals, 3, gl.FLOAT, 'a_Normal')) return -1;

  // 创建索引缓冲区
  var indexBuffer = gl.createBuffer();
  if (!indexBuffer) { return -1; }
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, data.indices, gl.STATIC_DRAW);

  return data.numIndices;
}

// 初始化数组缓冲区
function initArrayBuffer(gl, data, num, type, attribute) {
  // 创建缓冲区对象
  var buffer = gl.createBuffer();
  if (!buffer) {
    console.log('Failed to create the buffer object');
    return false;
  }
  // 将数据写入缓冲区对象
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
  // 将缓冲区对象分配给attribute变量
  var a_attribute = gl.getAttribLocation(gl.program, attribute);
  if (a_attribute < 0) {
    console.log('获取属性位置失败: ' + attribute);
    return false;
  }
  gl.vertexAttribPointer(a_attribute, num, type, false, 0, 0);
  // 启用attribute变量的赋值
  gl.enableVertexAttribArray(a_attribute);

  return true;
}

function render() {
  // 更新时间
  dayTime += 16; // 假设每帧大约16ms
  if (dayTime >= DAY_CYCLE_DURATION) {
    dayTime = dayTime % DAY_CYCLE_DURATION;
  }

  // 计算太阳位置（围绕Y轴旋转，模拟昼夜交替）
  const sunAngle = (dayTime / DAY_CYCLE_DURATION) * 2 * Math.PI;
  const sunDistance = 20.0;  // 太阳距离
  let sunX = Math.sin(sunAngle) * sunDistance;
  let sunY = Math.cos(sunAngle) * sunDistance;  // 太阳在Y轴上的位置变化
  let sunZ = 10.0;  // 固定Z轴位置，避免太极端的角度

  // 确保太阳在地平线以上时才产生直射光
  if (sunY < 1.0) {
    sunY = 1.0;
  }

  // 计算光照方向（从光源指向场景，即从太阳位置到原点的方向）
  const lightDirection = [sunX, sunY, sunZ];
  // 归一化光照方向
  const length = Math.sqrt(lightDirection[0]*lightDirection[0] +
                           lightDirection[1]*lightDirection[1] +
                           lightDirection[2]*lightDirection[2]);
  lightDirection[0] /= length;
  lightDirection[1] /= length;
  lightDirection[2] /= length;

  // 根据太阳位置调整光色和环境光强度
  let lightColor;
  let ambientLight;

  // 根据太阳高度角调整光照
  const sunHeight = Math.max(0, (sunY - 1.0) / (sunDistance - 1.0)); // 0到1之间的值

  if (sunHeight > 0.3) {
    // 白天：白光
    lightColor = [1.0, 1.0, 1.0];
    ambientLight = [0.2 * sunHeight, 0.2 * sunHeight, 0.2 * sunHeight];
  } else if (sunHeight > 0.1) {
    // 黄昏/黎明：暖色光
    lightColor = [1.0, 0.7, 0.4];
    ambientLight = [0.15 * sunHeight, 0.1 * sunHeight, 0.05 * sunHeight];
  } else {
    // 夜晚：暗淡的蓝光
    lightColor = [0.2, 0.2, 0.8];
    ambientLight = [0.02, 0.02, 0.05];
  }

  // 计算模型矩阵
  modelMatrix.setRotate(rotationV, 1, 0, 0); // 绕 X 轴旋转（垂直旋转）
  modelMatrix.rotate(rotationH, 0, 1, 0); // 绕 Y 轴旋转（水平旋转）

  // 计算视图矩阵（基于摄像机位置和当前旋转）
  const { Matrix4 } = window;
  const viewMatrix = new Matrix4();
  // 计算朝向向量
  const toRad = (d) => d * Math.PI / 180.0;
  const yaw = toRad(rotationH);
  const pitch = toRad(rotationV);
  const frontX = Math.cos(pitch) * Math.sin(yaw);
  const frontY = Math.sin(pitch);
  const frontZ = -Math.cos(pitch) * Math.cos(yaw);

  viewMatrix.lookAt(camX, camY, camZ,
                    camX + frontX, camY + frontY, camZ + frontZ,
                    0.0, 1.0, 0.0);

  // 计算最终矩阵：P * V * M
  const finalMvp = new Matrix4();
  finalMvp.set(mvpMatrix);
  finalMvp.multiply(viewMatrix);
  finalMvp.multiply(modelMatrix);

  // 计算法向量矩阵：逆转置矩阵
  normalMatrix.setInverseOf(modelMatrix);
  normalMatrix.transpose();

  // 清理并绘制天空盒（在绘制场景之前）
  ctx.clear(ctx.COLOR_BUFFER_BIT | ctx.DEPTH_BUFFER_BIT);

  // 计算天空盒的MVP矩阵（只包含投影和视图矩阵，无模型变换）
  const skyboxMvp = new Matrix4();
  skyboxMvp.set(mvpMatrix);
  skyboxMvp.multiply(viewMatrix);

  // 计算时间比例（0.0-1.0）
  const timeOfDay = dayTime / DAY_CYCLE_DURATION;

  // 上传着色器程序（保存当前程序）
  const currentProgram = ctx.getParameter(ctx.CURRENT_PROGRAM);

  // 渲染天空盒
  if (skybox) {
    skybox.render(ctx, skyboxMvp, timeOfDay);
  }

  // 确保使用正确的着色器程序
  ctx.useProgram(ctx.program);

  // 上传矩阵到着色器（只在获取到uniform位置后才设置）
  if (u_MvpMatrix) ctx.uniformMatrix4fv(u_MvpMatrix, false, finalMvp.elements);
  if (u_ModelMatrix) ctx.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
  if (u_NormalMatrix) ctx.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);

  // 更新光照参数（只在获取到uniform位置后才设置）
  if (u_LightColor) ctx.uniform3f(u_LightColor, lightColor[0], lightColor[1], lightColor[2]);
  if (u_LightDirection) ctx.uniform3f(u_LightDirection, lightDirection[0], lightDirection[1], lightDirection[2]);
  if (u_AmbientLight) ctx.uniform3f(u_AmbientLight, ambientLight[0], ambientLight[1], ambientLight[2]);

  // 设置阴影强度（根据时间调整）
  const uShadowIntensity = ctx.getUniformLocation(ctx.program, 'u_ShadowIntensity');
  if (uShadowIntensity) {
    const shadowIntensity = Math.max(0.0, Math.min(0.7, sunHeight * 0.7)); // 白天阴影较深
    ctx.uniform1f(uShadowIntensity, shadowIntensity);
  }

  // 绑定阴影贴图
  if (shadowMap) {
    shadowMap.bindShadowTexture(ctx);
    const uShadowMap = ctx.getUniformLocation(ctx.program, 'u_ShadowMap');
    if (uShadowMap) {
      ctx.uniform1i(uShadowMap, shadowMap.getShadowTextureUnit());
    }
  }

  // 绘制场景（地形和树）
  terrain.render(ctx);
}

// 拖拽进行中函数
export function onDrag(deltaX, deltaY, currentX, currentY) {
  // 将鼠标移动转换为旋转角度
  // deltaX 控制水平旋转（绕Y轴）
  // deltaY 控制垂直旋转（绕X轴）
  const sensitivity = 100; // 旋转敏感度

  rotationH += deltaX * sensitivity;
  rotationV += deltaY * sensitivity;

  // 限制垂直旋转角度，避免翻转
  rotationV = Math.max(-90, Math.min(90, rotationV));

  // 限制水平旋转角度在0-360度
  rotationH = ((rotationH % 360) + 360) % 360;

  console.log(`旋转角度: H=${rotationH.toFixed(1)}°, V=${rotationV.toFixed(1)}°`);
}

// 重置位置
export function reset() {
  rotationH = 0;
  rotationV = 0;
  camX = 0.0;
  camY = 0.0;
  camZ = 0.0;
  console.log('重置旋转和位置');
}