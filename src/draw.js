// 绘制三角形 (c) 2012 matsuda

let rotationH = 30;  // 水平旋转角度，单位：度
let rotationV = 30;  // 垂直旋转角度，单位：度

// 全局变量用于存储WebGL状态
let ctx, vertexBuffer;
let u_ModelMatrix;
let animationId = null;

// 从文件加载着色器代码
async function loadShaderFromFile(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.text();
  } catch (error) {
    console.error(`加载着色器文件失败: ${url}`, error);
    throw error;
  }
}

export async function init(canvas) {
  // 获取WebGL上下文和工具函数
  const { getWebGLContext, initShaders } = window;

  // 从文件加载着色器代码
  const VSHADER_SOURCE = await loadShaderFromFile('/src/draw.vs');
  const FSHADER_SOURCE = await loadShaderFromFile('/src/draw.fs');

  // 获取WebGL渲染上下文
  ctx = getWebGLContext(canvas);
  if (!ctx) {
    console.log('获取WebGL渲染上下文失败');
    return;
  }

  // 初始化着色器
  if (!initShaders(ctx, VSHADER_SOURCE, FSHADER_SOURCE)) {
    console.log('初始化着色器失败');
    return;
  }

  // 启用深度测试和背面剔除
  ctx.enable(ctx.DEPTH_TEST);           // 启用深度测试
  ctx.enable(ctx.CULL_FACE);            // 启用面剔除
  ctx.cullFace(ctx.BACK);               // 剔除背面
  ctx.frontFace(ctx.CCW);               // 逆时针为正面

  // 获取矩阵uniform变量位置
  u_ModelMatrix = ctx.getUniformLocation(ctx.program, 'u_ModelMatrix');

  // 立方体的顶点坐标和颜色
  const vertices = renderCube();

  // 创建并绑定缓冲区
  vertexBuffer = ctx.createBuffer();
  if (!vertexBuffer) {
    console.log('创建缓冲区失败');
    return;
  }

  ctx.bindBuffer(ctx.ARRAY_BUFFER, vertexBuffer);
  ctx.bufferData(ctx.ARRAY_BUFFER, vertices, ctx.STATIC_DRAW);

  // 每个顶点数据的字节大小 (3个位置分量 + 4个颜色分量) * 4字节
  const FSIZE = vertices.BYTES_PER_ELEMENT;

  // 获取并设置位置属性
  const a_Position = ctx.getAttribLocation(ctx.program, 'a_Position');
  if (a_Position < 0) {
    console.log('获取a_Position位置失败');
    return;
  }

  // 配置顶点属性指针 - 3D坐标
  ctx.vertexAttribPointer(a_Position, 3, ctx.FLOAT, false, FSIZE * 7, 0);
  ctx.enableVertexAttribArray(a_Position);

  // 获取并设置颜色属性
  const a_Color = ctx.getAttribLocation(ctx.program, 'a_Color');
  if (a_Color < 0) {
    console.log('获取a_Color位置失败');
    return;
  }
  ctx.vertexAttribPointer(a_Color, 4, ctx.FLOAT, false, FSIZE * 7, FSIZE * 3);
  ctx.enableVertexAttribArray(a_Color);

  // 开始渲染循环
  startRenderLoop();
}

// 渲染循环函数
function renderLoop() {
  // 创建并设置模型变换矩阵
  const { Matrix4 } = window;
  const modelMatrix = new Matrix4();
  modelMatrix.setRotate(rotationV, 1, 0, 0); // X轴旋转
  modelMatrix.rotate(rotationH, 0, 1, 0);    // Y轴旋转

  // 传递模型矩阵到着色器
  ctx.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);

  // 设置白色背景并清除画布
  ctx.clearColor(1.0, 1.0, 1.0, 1.0); // 白色背景
  ctx.clear(ctx.COLOR_BUFFER_BIT | ctx.DEPTH_BUFFER_BIT); // 清除颜色和深度缓冲区

  // 绘制立方体的六个面
  ctx.drawArrays(ctx.TRIANGLES, 0, 36); // 36个顶点 = 12个三角形 = 6个面

  // 请求浏览器在下一次重绘之前调用renderLoop，实现持续动画
  animationId = requestAnimationFrame(renderLoop);
}

// 开始渲染循环
function startRenderLoop() {
  if (!animationId) {
    renderLoop();
  }
}

// 停止渲染循环
function stopRenderLoop() {
  if (animationId) {
    cancelAnimationFrame(animationId);
    animationId = null;
  }
}

const renderCube = () => {
  console.log('渲染立方体');

  // 直接定义立方体的8个顶点
  const vertices = [
    // 正面 (红色)
    -0.5, -0.5,  0.5,  1.0, 0.0, 0.0, 1.0,  // 左下前
     0.5, -0.5,  0.5,  1.0, 0.0, 0.0, 1.0,  // 右下前
     0.5,  0.5,  0.5,  1.0, 0.0, 0.0, 1.0,  // 右上前
    -0.5, -0.5,  0.5,  1.0, 0.0, 0.0, 1.0,  // 左下前
     0.5,  0.5,  0.5,  1.0, 0.0, 0.0, 1.0,  // 右上前
    -0.5,  0.5,  0.5,  1.0, 0.0, 0.0, 1.0,  // 左上前

    // 背面 (绿色)
     0.5, -0.5, -0.5,  0.0, 1.0, 0.0, 1.0,  // 右下后
    -0.5, -0.5, -0.5,  0.0, 1.0, 0.0, 1.0,  // 左下后
    -0.5,  0.5, -0.5,  0.0, 1.0, 0.0, 1.0,  // 左上后
     0.5, -0.5, -0.5,  0.0, 1.0, 0.0, 1.0,  // 右下后
    -0.5,  0.5, -0.5,  0.0, 1.0, 0.0, 1.0,  // 左上后
     0.5,  0.5, -0.5,  0.0, 1.0, 0.0, 1.0,  // 右上后

    // 右面 (黄色)
     0.5, -0.5,  0.5,  1.0, 1.0, 0.0, 1.0,  // 右下前
     0.5, -0.5, -0.5,  1.0, 1.0, 0.0, 1.0,  // 右下后
     0.5,  0.5, -0.5,  1.0, 1.0, 0.0, 1.0,  // 右上后
     0.5, -0.5,  0.5,  1.0, 1.0, 0.0, 1.0,  // 右下前
     0.5,  0.5, -0.5,  1.0, 1.0, 0.0, 1.0,  // 右上后
     0.5,  0.5,  0.5,  1.0, 1.0, 0.0, 1.0,  // 右上前

    // 左面 (蓝色)
    -0.5, -0.5, -0.5,  0.0, 0.0, 1.0, 1.0,  // 左下后
    -0.5, -0.5,  0.5,  0.0, 0.0, 1.0, 1.0,  // 左下前
    -0.5,  0.5,  0.5,  0.0, 0.0, 1.0, 1.0,  // 左上前
    -0.5, -0.5, -0.5,  0.0, 0.0, 1.0, 1.0,  // 左下后
    -0.5,  0.5,  0.5,  0.0, 0.0, 1.0, 1.0,  // 左上前
    -0.5,  0.5, -0.5,  0.0, 0.0, 1.0, 1.0,  // 左上后

    // 顶面 (洋红)
    -0.5,  0.5,  0.5,  1.0, 0.0, 1.0, 1.0,  // 左上前
     0.5,  0.5,  0.5,  1.0, 0.0, 1.0, 1.0,  // 右上前
     0.5,  0.5, -0.5,  1.0, 0.0, 1.0, 1.0,  // 右上后
    -0.5,  0.5,  0.5,  1.0, 0.0, 1.0, 1.0,  // 左上前
     0.5,  0.5, -0.5,  1.0, 0.0, 1.0, 1.0,  // 右上后
    -0.5,  0.5, -0.5,  1.0, 0.0, 1.0, 1.0,  // 左上后

    // 底面 (青色)
    -0.5, -0.5, -0.5,  0.0, 1.0, 1.0, 1.0,  // 左下后
     0.5, -0.5, -0.5,  0.0, 1.0, 1.0, 1.0,  // 右下后
     0.5, -0.5,  0.5,  0.0, 1.0, 1.0, 1.0,  // 右下前
    -0.5, -0.5, -0.5,  0.0, 1.0, 1.0, 1.0,  // 左下后
     0.5, -0.5,  0.5,  0.0, 1.0, 1.0, 1.0,  // 右下前
    -0.5, -0.5,  0.5,  0.0, 1.0, 1.0, 1.0   // 左下前
  ];

  return new Float32Array(vertices);
}

// 定义立方体的三个面边界（用于点击检测）
const cubeFaces = [
  {
    name: '正面-红色',
    color: 'red',
    bounds: { minX: -0.2, maxX: 0.2, minY: -0.2, maxY: 0.2 }
  },
  {
    name: '右面-黄色', 
    color: 'yellow',
    // 右面是平行四边形，用简化的矩形近似
    bounds: { minX: 0.2, maxX: 0.5, minY: -0.5, maxY: 0.1 }
  },
  {
    name: '顶面-蓝色',
    color: 'blue', 
    // 顶面也是平行四边形，用简化的边界
    bounds: { minX: -0.5, maxX: 0.5, minY: 0.1, maxY: 0.5 }
  }
];

// 点击检测函数
export function checkHit(x, y) {
  console.log(`检测点击位置: (${x.toFixed(3)}, ${y.toFixed(3)})`);

  for (let face of cubeFaces) {
    const { minX, maxX, minY, maxY } = face.bounds;

    if (x >= minX && x <= maxX && y >= minY && y <= maxY) {
      console.log(`命中: ${face.name}`);
      return {
        face: face.name,
        color: face.color,
        position: { x, y }
      };
    }
  }

  return null;
}

// 拖拽开始函数
export function onDragStart(x, y) {
  console.log(`开始拖拽: (${x.toFixed(3)}, ${y.toFixed(3)})`);
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

// 拖拽结束函数
export function onDragEnd(x, y) {
  console.log(`拖拽结束于: (${x.toFixed(3)}, ${y.toFixed(3)})`);
  console.log(`最终旋转角度: H=${rotationH.toFixed(1)}°, V=${rotationV.toFixed(1)}°`);
}

// 设置旋转角度（可从外部调用）
export function setRotation(h, v) {
  rotationH = h;
  rotationV = v;
}

// 获取当前旋转角度
export function getRotation() {
  return { h: rotationH, v: rotationV };
}

// 重置旋转角度
export function resetRotation() {
  rotationH = 30;
  rotationV = 30;
}

// 停止动画（清理资源）
export function cleanup() {
  stopRenderLoop();
}
