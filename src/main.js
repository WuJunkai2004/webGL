import { createCanvas } from '/canvas.js';

const canvas = createCanvas(800, 800);

canvas.mount('#app');

const draw = await canvas.load('/src/draw.js');

// 鼠标事件处理
let isDragging = false;
let lastMousePos = { x: 0, y: 0 };

// 将屏幕坐标转换为WebGL坐标
function screenToWebGL(canvas, x, y) {
  const rect = canvas.getBoundingClientRect();
  const canvasX = x - rect.left;
  const canvasY = y - rect.top;
  
  // 转换为WebGL坐标系 [-1, 1]
  const webglX = (canvasX / canvas.width) * 2 - 1;
  const webglY = -((canvasY / canvas.height) * 2 - 1); // Y轴翻转
  
  return { x: webglX, y: webglY };
}

// 点击事件处理
canvas.canvas.addEventListener('click', (event) => {
  const webglPos = screenToWebGL(canvas.canvas, event.clientX, event.clientY);
  console.log('点击位置:', webglPos);
  
  // 调用draw模块的点击检测函数（如果存在）
  if (draw && typeof draw.checkHit === 'function') {
    const hitResult = draw.checkHit(webglPos.x, webglPos.y);
    if (hitResult) {
      console.log('点击到了:', hitResult);
    } else {
      console.log('没有点击到任何对象');
    }
  }
});

// 鼠标按下事件
canvas.canvas.addEventListener('mousedown', (event) => {
  isDragging = true;
  const webglPos = screenToWebGL(canvas.canvas, event.clientX, event.clientY);
  lastMousePos = webglPos;
  
  console.log('开始拖拽:', webglPos);
  
  // 调用draw模块的拖拽开始函数（如果存在）
  if (draw && typeof draw.onDragStart === 'function') {
    draw.onDragStart(webglPos.x, webglPos.y);
  }
});

// 鼠标移动事件
canvas.canvas.addEventListener('mousemove', (event) => {
  if (!isDragging) return;
  
  const webglPos = screenToWebGL(canvas.canvas, event.clientX, event.clientY);
  const deltaX = webglPos.x - lastMousePos.x;
  const deltaY = webglPos.y - lastMousePos.y;
  
  // 调用draw模块的拖拽函数（如果存在）
  if (draw && typeof draw.onDrag === 'function') {
    draw.onDrag(deltaX, deltaY, webglPos.x, webglPos.y);
  }
  
  lastMousePos = webglPos;
});

// 鼠标释放事件
canvas.canvas.addEventListener('mouseup', (event) => {
  if (!isDragging) return;
  
  isDragging = false;
  const webglPos = screenToWebGL(canvas.canvas, event.clientX, event.clientY);
  
  console.log('结束拖拽:', webglPos);
  
  // 调用draw模块的拖拽结束函数（如果存在）
  if (draw && typeof draw.onDragEnd === 'function') {
    draw.onDragEnd(webglPos.x, webglPos.y);
  }
});

// 防止拖拽时选中文本
canvas.canvas.addEventListener('selectstart', (event) => {
  event.preventDefault();
});