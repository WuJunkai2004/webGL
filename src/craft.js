import { loadFile } from "/canvas.js";

let rotationH = 0;  // 水平旋转角度，单位：度
let rotationV = 0;  // 垂直旋转角度，单位：度

let ctx; // WebGL 上下文
let u_MvpMatrix;    // u_MvpMatrix uniform 的位置
let mvpMatrix; // 投影-视图 矩阵
let nIndices = 0; // 索引数量，用于 drawElements
// 摄像机位置（世界坐标），初始置于盒子内部中心
let camX = 0.0, camY = 0.0, camZ = 0.0;

export async function init(canvas) {
  const { getWebGLContext, initShaders, Matrix4 } = window;
  const vShaderSource = await loadFile('/src/craft.vs');
  const fShaderSource = await loadFile('/src/craft.fs');

  ctx = getWebGLContext(canvas);
  if (!ctx) {
    console.log('获取WebGL渲染上下文失败');
    return;
  }

  if (!initShaders(ctx, vShaderSource, fShaderSource)) {
    console.log('初始化着色器失败');
    return;
  }

  // 初始化立方体贴图（使用单张十字图）
  initCubeTexture(ctx);

  // 初始化顶点数据并记录索引数量
  nIndices = initVertexBuffers(ctx);
  if (nIndices < 0) {
    console.log('初始化顶点缓冲失败');
    return;
  }

  // 获取 u_MvpMatrix 的位置并设置投影与视图（相机位于原点，朝向 -Z）
  u_MvpMatrix = ctx.getUniformLocation(ctx.program, 'u_MvpMatrix');

  // 初始化投影-视图矩阵，使观察点处于天空盒内部
  mvpMatrix = new Matrix4();
  mvpMatrix.setPerspective(60, canvas.width / canvas.height, 0.1, 100);
  mvpMatrix.lookAt(0.0, 0.0, 0.0, 0.0, 0.0, -1.0, 0.0, 1.0, 0.0);

  // 这里先不传最终矩阵，render() 会在每帧计算并上传完整的 MVP（P*V*M）

  // 设置清除和深度测试
  ctx.clearColor(0.0, 0.0, 0.0, 1.0);
  ctx.enable(ctx.DEPTH_TEST);

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

function initCubeTexture(gl) {
  var textureObject = gl.createTexture();
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_CUBE_MAP, textureObject);

  var crossUrl = '/assets/back.png';

  var image = new Image();
  image.crossOrigin = '';
  image.onload = function () {
    // 假设图为 4 列 x 3 行，每个 face 为正方形
    var faceSize = image.width / 4;
    if (Math.abs(faceSize - image.height / 3) > 0.5) {
      console.warn('十字图像尺寸不符合 4x3 的网格：', image.width, image.height);
    }

    // 创建临时 canvas 用于裁切每个子贴图
    var canvas = document.createElement('canvas');
    canvas.width = faceSize;
    canvas.height = faceSize;
    var ctx2d = canvas.getContext('2d');

  // 禁用 Y 方向翻转
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);

    // 对应每个 cube face 在十字图中的 (col, row)
    var mapping = {};
    mapping[gl.TEXTURE_CUBE_MAP_POSITIVE_X] = { col: 2, row: 1 }; // +X（右）
    mapping[gl.TEXTURE_CUBE_MAP_NEGATIVE_X] = { col: 0, row: 1 }; // -X（左）
    mapping[gl.TEXTURE_CUBE_MAP_POSITIVE_Y] = { col: 1, row: 0 }; // +Y（上）
    mapping[gl.TEXTURE_CUBE_MAP_NEGATIVE_Y] = { col: 1, row: 2 }; // -Y（下）
    mapping[gl.TEXTURE_CUBE_MAP_POSITIVE_Z] = { col: 1, row: 1 }; // +Z（前）
    mapping[gl.TEXTURE_CUBE_MAP_NEGATIVE_Z] = { col: 3, row: 1 }; // -Z（后）

    // 将每个子图绘制到临时 canvas 并上传到对应的 cube face
    Object.keys(mapping).forEach(function (targetKey) {
      var target = Number(targetKey);
      var pos = mapping[target];
      ctx2d.clearRect(0, 0, faceSize, faceSize);
      ctx2d.drawImage(
        image,
        pos.col * faceSize, pos.row * faceSize, faceSize, faceSize,
        0, 0, faceSize, faceSize
      );

      // 上传子图到对应的 cube face
      gl.texImage2D(target, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
    });

    // 设置纹理参数
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    var u_cubeSampler = gl.getUniformLocation(gl.program, 'u_cubeSampler');
    gl.uniform1i(u_cubeSampler, 0);
  };
  image.onerror = function () {
    console.error('无法加载十字图：' + crossUrl);
  };
  image.src = crossUrl;
}

// 顶点缓冲和索引缓冲
function initVertexBuffers(gl) {
  var vertices = new Float32Array([   // 顶点坐标
    1.0, 1.0, 1.0, -1.0, 1.0, 1.0, -1.0, -1.0, 1.0, 1.0, -1.0, 1.0,    // v0-v1-v2-v3 front
    1.0, 1.0, 1.0, 1.0, -1.0, 1.0, 1.0, -1.0, -1.0, 1.0, 1.0, -1.0,    // v0-v3-v4-v5 right
    1.0, 1.0, 1.0, 1.0, 1.0, -1.0, -1.0, 1.0, -1.0, -1.0, 1.0, 1.0,    // v0-v5-v6-v1 up
    -1.0, 1.0, 1.0, -1.0, 1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, 1.0,    // v1-v6-v7-v2 left
    -1.0, -1.0, -1.0, 1.0, -1.0, -1.0, 1.0, -1.0, 1.0, -1.0, -1.0, 1.0,    // v7-v4-v3-v2 down
    1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, 1.0, -1.0, 1.0, 1.0, -1.0     // v4-v7-v6-v5 back
  ]);
  // Indices of the vertices
  var indices = new Uint8Array([
    0, 1, 2, 0, 2, 3,    // front
    4, 5, 6, 4, 6, 7,    // right
    8, 9, 10, 8, 10, 11,    // up
    12, 13, 14, 12, 14, 15,    // left
    16, 17, 18, 16, 18, 19,    // down
    20, 21, 22, 20, 22, 23     // back
  ]);

  // Create vertex buffer
  if (!initArrayBuffer(gl, vertices, 3, gl.FLOAT, 'a_Position')) return -1; // 创建顶点缓冲并绑定 a_Position
  // Create a buffer object
  var indexBuffer = gl.createBuffer();
  if (!indexBuffer) { return -1; }
  // Write the indices to the buffer object
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

  // 返回索引数量用于 drawElements
  return indices.length;
}

function initArrayBuffer(gl, data, num, type, attribute) {
  // Create a buffer object
  var buffer = gl.createBuffer();
  if (!buffer) {
    console.log('Failed to create the buffer object');
    return false;
  }
  // Write date into the buffer object
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
  // Assign the buffer object to the attribute variable
  var a_attribute = gl.getAttribLocation(gl.program, attribute);
  if (a_attribute < 0) {
    console.log('获取属性位置失败: ' + attribute);
    return false;
  }
  gl.vertexAttribPointer(a_attribute, num, type, false, 0, 0);
  // Enable the assignment to a_attribute variable
  gl.enableVertexAttribArray(a_attribute);

  return true;
}

function render() {
  // 计算模型矩阵并构造完整的 MVP（P * V * M），然后绘制
  const { Matrix4 } = window;
  const modelMatrix = new Matrix4();
  // 绕 X 轴旋转（垂直旋转）
  modelMatrix.setRotate(rotationV, 1, 0, 0);
  // 绕 Y 轴旋转（水平旋转）
  modelMatrix.rotate(rotationH, 0, 1, 0);
  // 计算视图矩阵（基于摄像机位置和当前旋转）并组合最终的 MVP：P * V * M
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

  // 计算最终矩阵：先是投影（mvpMatrix 存储的是 projection），再乘以视图和模型
  const finalMvp = new Matrix4();
  finalMvp.set(mvpMatrix);
  finalMvp.multiply(viewMatrix);
  finalMvp.multiply(modelMatrix);

  // 上传最终的 MVP 矩阵到着色器
  ctx.uniformMatrix4fv(u_MvpMatrix, false, finalMvp.elements);

  // 清理并绘制
  ctx.clear(ctx.COLOR_BUFFER_BIT | ctx.DEPTH_BUFFER_BIT);
  if (nIndices > 0) {
    ctx.drawElements(ctx.TRIANGLES, nIndices, ctx.UNSIGNED_BYTE, 0);
  }
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