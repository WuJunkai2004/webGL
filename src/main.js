import { createCanvas } from '/canvas.js';

const canvas = createCanvas(800, 800);

canvas.mount('#app');

const draw = await canvas.load('/src/cube.js');

// 鼠标事件处理
let isDragging = false;
let lastMousePos = { x: 0, y: 0 };

// 鼠标按下事件
canvas.listen('mousedown', (event) => {
  isDragging = true;
  const webglPos = canvas.webGLPos(event.clientX, event.clientY);
  lastMousePos = webglPos;
  console.log('开始拖拽:', webglPos);
});

// 鼠标移动事件
canvas.listen('mousemove', (event) => {
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
canvas.listen('mouseup', (event) => {
  if (!isDragging){
    return;
  }
  isDragging = false;
  const webglPos = canvas.webGLPos(event.clientX, event.clientY);
  console.log('结束拖拽:', webglPos);
});

// 鼠标中间滚动事件
canvas.listen('wheel', (event) => {
  event.preventDefault();
  const delta = Math.sign(event.deltaY);
  console.log('滚轮滚动:', delta);
  draw.onWheel(delta);
});

// 防止拖拽时选中文本
canvas.listen('selectstart', (event) => {
  event.preventDefault();
});

document.getElementById('btn-reset').addEventListener('click', () => {
  draw.resetRotation();
});

document.getElementById('btn-rotate').addEventListener('click', () => {
  const angle = draw.getRotation();
  document.getElementById('btn-rotate').innerText = `显示角度
水平角度: ${angle.h.toFixed(1)}°\n垂直角度: ${angle.v.toFixed(1)}°`;
});