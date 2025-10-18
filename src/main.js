import { createCanvas } from '/canvas.js';

const canvas = createCanvas(800, 800);

canvas.mount('#app');

const draw = await canvas.load('/src/draw.js');

// 鼠标事件处理
let isDragging = false;
let lastMousePos = { x: 0, y: 0 };

// 鼠标按下事件
canvas.canvas.addEventListener('mousedown', (event) => {
  isDragging = true;
  const webglPos = canvas.webGLPos(event.clientX, event.clientY);
  lastMousePos = webglPos;
  console.log('开始拖拽:', webglPos);
});

// 鼠标移动事件
canvas.canvas.addEventListener('mousemove', (event) => {
  if (!isDragging){
    return;
  }
  const webglPos = canvas.webGLPos(event.clientX, event.clientY);
  const deltaX = webglPos.x - lastMousePos.x;
  const deltaY = webglPos.y - lastMousePos.y;
  // 调用draw模块的拖拽函数
  draw.onDrag(deltaX, -deltaY, webglPos.x, webglPos.y);
  lastMousePos = webglPos;
});

// 鼠标释放事件
canvas.canvas.addEventListener('mouseup', (event) => {
  if (!isDragging){
    return;
  }
  isDragging = false;
  const webglPos = canvas.webGLPos(event.clientX, event.clientY);
  console.log('结束拖拽:', webglPos);
});

// 防止拖拽时选中文本
canvas.canvas.addEventListener('selectstart', (event) => {
  event.preventDefault();
});