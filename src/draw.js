// 绘制三角形 (c) 2012 matsuda

export function main(canvas) {
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
  const vertices = new Float32Array([
    // 正面 (红色) - 中央正方形
    -0.2, -0.2,  1.0, 0.0, 0.0, 1.0,  // 左下 红色
     0.2, -0.2,  1.0, 0.0, 0.0, 1.0,  // 右下 红色
    -0.2,  0.2,  1.0, 0.0, 0.0, 1.0,  // 左上 红色
     0.2, -0.2,  1.0, 0.0, 0.0, 1.0,  // 右下 红色
     0.2,  0.2,  1.0, 0.0, 0.0, 1.0,  // 右上 红色
    -0.2,  0.2,  1.0, 0.0, 0.0, 1.0,  // 左上 红色

    // 右面 (黄色) - 右侧菱形
     0.2, -0.2,  1.0, 1.0, 0.0, 1.0,  // 正面右下
     0.5,  0.0,  1.0, 1.0, 0.0, 1.0,  // 右面右下
     0.2,  0.2,  1.0, 1.0, 0.0, 1.0,  // 正面右上
     0.5,  0.4,  1.0, 1.0, 0.0, 1.0,  // 右面右下
     0.5,  0.0,  1.0, 1.0, 0.0, 1.0,  // 右面右上
     0.2,  0.2,  1.0, 1.0, 0.0, 1.0,  // 正面右上

    // 顶面 (蓝色) - 上方菱形
    -0.2,  0.2,  0.0, 0.0, 1.0, 1.0,  // 正面左上
     0.2,  0.2,  0.0, 0.0, 1.0, 1.0,  // 正面右上
     0.1,  0.4,  0.0, 0.0, 1.0, 1.0,  // 顶面左上
     0.2,  0.2,  0.0, 0.0, 1.0, 1.0,  // 正面右上
     0.5,  0.4,  0.0, 0.0, 1.0, 1.0,  // 顶面右上
     0.1,  0.4,  0.0, 0.0, 1.0, 1.0   // 顶面左上
  ]);

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

  // 绘制立方体的三个面
  gl.drawArrays(gl.TRIANGLES, 0, 18); // 18个顶点 = 6个三角形 = 3个面
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
