// 绘制三角形 (c) 2012 matsuda

let rotationH = 30;  // 水平旋转角度，单位：度
let rotationV = 30;  // 垂直旋转角度，单位：度

export function init(canvas) {
  // 顶点着色器 - 处理顶点位置和颜色传递
  const VSHADER_SOURCE = `
    attribute vec4 a_Position;
    attribute vec4 a_Color;
    varying vec4 v_Color;
    void main() {
      gl_Position = a_Position;
      v_Color = a_Color;  // 将颜色传递给片元着色器
    }`;

  // 片元着色器 - 接收颜色并设置像素
  const FSHADER_SOURCE = `
    precision mediump float;
    varying vec4 v_Color;
    void main() {
      gl_FragColor = v_Color;
    }`;

  // 获取WebGL上下文和工具函数
  const { getWebGLContext, initShaders } = window;
  
  // 获取WebGL渲染上下文
  const gl = getWebGLContext(canvas);
  if (!gl) {
    console.log('获取WebGL渲染上下文失败');
    return;
  }

  // 初始化着色器
  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
    console.log('初始化着色器失败');
    return;
  }

  // 立方体的顶点坐标和颜色 (用等距投影显示三个面)
  // 每个顶点：[x, y, r, g, b, a]
  // - x, y: 位置坐标
  // - r, g, b, a: 颜色分量
  const vertices = renderCube();

  // 创建并绑定缓冲区
  const vertexBuffer = gl.createBuffer();
  if (!vertexBuffer) {
    console.log('创建缓冲区失败');
    return;
  }

  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

  // 每个顶点数据的字节大小 (2个位置 + 4个颜色分量) * 4字节
  const FSIZE = vertices.BYTES_PER_ELEMENT;
  
  // 获取并设置位置属性
  const a_Position = gl.getAttribLocation(gl.program, 'a_Position');
  if (a_Position < 0) {
    console.log('获取a_Position位置失败');
    return;
  }

  // 配置顶点属性指针
  // 将缓冲区对象分配给a_Position变量
  // 参数：(位置, 每个顶点的分量数, 数据类型, 是否归一化, 步长, 偏移量)
  gl.vertexAttribPointer(a_Position, 2, gl.FLOAT, false, FSIZE * 6, 0);
  gl.enableVertexAttribArray(a_Position);

  // 获取并设置颜色属性
  const a_Color = gl.getAttribLocation(gl.program, 'a_Color');
  if (a_Color < 0) {
    console.log('获取a_Color位置失败');
    return;
  }
  gl.vertexAttribPointer(a_Color, 4, gl.FLOAT, false, FSIZE * 6, FSIZE * 2);
  gl.enableVertexAttribArray(a_Color);

  // 设置白色背景并清除画布
  gl.clearColor(1.0, 1.0, 1.0, 1.0); // 白色背景
  gl.clear(gl.COLOR_BUFFER_BIT);

  // 绘制立方体的六个面
  gl.drawArrays(gl.TRIANGLES, 0, 36); // 36个顶点 = 12个三角形 = 6个面
}

const renderCube = () => {
  console.log('渲染立方体');
  
  // 将角度转换为弧度
  const radH = rotationH * Math.PI / 180;
  const radV = rotationV * Math.PI / 180;
  
  // 定义正方体的6个面
  const faces = [
    { name: 'front',  color: [1.0, 0.0, 0.0, 1.0], normal: [0, 0, 1] },   // 前面 - 红色
    { name: 'back',   color: [0.0, 1.0, 0.0, 1.0], normal: [0, 0, -1] },  // 后面 - 绿色
    { name: 'right',  color: [1.0, 1.0, 0.0, 1.0], normal: [1, 0, 0] },   // 右面 - 黄色
    { name: 'left',   color: [0.0, 0.0, 1.0, 1.0], normal: [-1, 0, 0] },  // 左面 - 蓝色
    { name: 'top',    color: [1.0, 0.0, 1.0, 1.0], normal: [0, 1, 0] },   // 顶面 - 洋红
    { name: 'bottom', color: [0.0, 1.0, 1.0, 1.0], normal: [0, -1, 0] }   // 底面 - 青色
  ];
  
  let vertices = [];
  
  for (let face of faces) {
    // 1. 计算单个正方形面的坐标
    const faceVertices = calculateFaceVertices(face.normal);
    
    // 2. 转换为两个三角形
    const triangles = faceToTriangles(faceVertices);
    
    // 3. 将三角形加入颜色
    const coloredTriangles = addColorToTriangles(triangles, face.color);
    
    // 应用旋转变换
    const rotatedTriangles = applyRotation(coloredTriangles, radH, radV);
    
    // 添加到总顶点数组
    vertices = vertices.concat(rotatedTriangles);
  }
  
  // 4. 最后拼接为Float32Array
  return new Float32Array(vertices);
}

// 1. 计算单个正方形面的坐标
const calculateFaceVertices = (normal) => {
  const [nx, ny, nz] = normal;
  const halfSize = 0.5; // 边长为1，半边长为0.5
  
  let vertices = [];
  
  if (nz === 1) {
    // 前面 (z = 0.5)
    vertices = [
      [-halfSize, -halfSize, halfSize],  // 左下
      [halfSize, -halfSize, halfSize],   // 右下
      [halfSize, halfSize, halfSize],    // 右上
      [-halfSize, halfSize, halfSize]    // 左上
    ];
  } else if (nz === -1) {
    // 后面 (z = -0.5)
    vertices = [
      [halfSize, -halfSize, -halfSize],  // 左下
      [-halfSize, -halfSize, -halfSize], // 右下
      [-halfSize, halfSize, -halfSize],  // 右上
      [halfSize, halfSize, -halfSize]    // 左上
    ];
  } else if (nx === 1) {
    // 右面 (x = 0.5)
    vertices = [
      [halfSize, -halfSize, halfSize],   // 左下
      [halfSize, -halfSize, -halfSize],  // 右下
      [halfSize, halfSize, -halfSize],   // 右上
      [halfSize, halfSize, halfSize]     // 左上
    ];
  } else if (nx === -1) {
    // 左面 (x = -0.5)
    vertices = [
      [-halfSize, -halfSize, -halfSize], // 左下
      [-halfSize, -halfSize, halfSize],  // 右下
      [-halfSize, halfSize, halfSize],   // 右上
      [-halfSize, halfSize, -halfSize]   // 左上
    ];
  } else if (ny === 1) {
    // 顶面 (y = 0.5)
    vertices = [
      [-halfSize, halfSize, halfSize],   // 左下
      [halfSize, halfSize, halfSize],    // 右下
      [halfSize, halfSize, -halfSize],   // 右上
      [-halfSize, halfSize, -halfSize]   // 左上
    ];
  } else if (ny === -1) {
    // 底面 (y = -0.5)
    vertices = [
      [-halfSize, -halfSize, -halfSize], // 左下
      [halfSize, -halfSize, -halfSize],  // 右下
      [halfSize, -halfSize, halfSize],   // 右上
      [-halfSize, -halfSize, halfSize]   // 左上
    ];
  }
  
  return vertices;
}

// 2. 转换为两个三角形
const faceToTriangles = (faceVertices) => {
  // 每个正方形面分解为两个三角形
  // 三角形1: 顶点0, 1, 2
  // 三角形2: 顶点0, 2, 3
  return [
    faceVertices[0], faceVertices[1], faceVertices[2], // 第一个三角形
    faceVertices[0], faceVertices[2], faceVertices[3]  // 第二个三角形
  ];
}

// 3. 将三角形加入颜色 (保留3D坐标)
const addColorToTriangles = (triangles, color) => {
  let result = [];
  for (let vertex of triangles) {
    result.push(...vertex, ...color); // [x, y, z, r, g, b, a]
  }
  return result;
}

// 应用旋转变换并投影到2D
const applyRotation = (triangleData, rotH, rotV) => {
  let result = [];
  
  // 每7个元素为一个顶点 (x, y, z, r, g, b, a)
  for (let i = 0; i < triangleData.length; i += 7) {
    let x = triangleData[i];
    let y = triangleData[i + 1];
    let z = triangleData[i + 2];
    
    // 应用Y轴旋转 (水平旋转)
    let cosH = Math.cos(rotH);
    let sinH = Math.sin(rotH);
    let rotatedX = x * cosH + z * sinH;
    let rotatedZ = -x * sinH + z * cosH;
    
    // 应用X轴旋转 (垂直旋转)
    let cosV = Math.cos(rotV);
    let sinV = Math.sin(rotV);
    let finalY = y * cosV - rotatedZ * sinV;
    let finalZ = y * sinV + rotatedZ * cosV;
    
    // 透视投影
    let distance = 3; // 观察距离
    let perspective = distance / (distance + finalZ);
    
    result.push(
      rotatedX * perspective * 0.8,    // x (缩放0.8适应画布)
      finalY * perspective * 0.8,      // y
      triangleData[i + 3],             // r
      triangleData[i + 4],             // g
      triangleData[i + 5],             // b
      triangleData[i + 6]              // a
    );
  }
  
  return result;
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
  const hitResult = checkHit(x, y);
  if (hitResult) {
    console.log(`开始拖拽: ${hitResult.face}`);
  }
}

// 拖拽进行中函数
export function onDrag(deltaX, deltaY, currentX, currentY) {
  console.log(`拖拽中: 移动量(${deltaX.toFixed(3)}, ${deltaY.toFixed(3)})`);
  // 这里可以添加立方体旋转或移动逻辑
}

// 拖拽结束函数
export function onDragEnd(x, y) {
  console.log(`拖拽结束于: (${x.toFixed(3)}, ${y.toFixed(3)})`);
}
