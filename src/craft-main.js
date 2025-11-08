import { createCanvas } from "/canvas.js";

const canvas = createCanvas(800, 800);

canvas.mount("#app");

const craft = await canvas.load("/src/craft.js");

let isDragging = false;
let lastMousePos = { x: 0, y: 0 };

canvas.listen("mousedown", (event) => {
    isDragging = true;
    const webglPos = canvas.webGLPos(event.clientX, event.clientY);
    lastMousePos = webglPos;
    console.log("开始拖拽:", webglPos);
})

canvas.listen("mousemove", (event) => {
    if (!isDragging) {
        return;
    }
    const webglPos = canvas.webGLPos(event.clientX, event.clientY);
    const deltaX = webglPos.x - lastMousePos.x;
    const deltaY = webglPos.y - lastMousePos.y;
    craft.onDrag(deltaX, -deltaY, webglPos.x, webglPos.y);
    lastMousePos = webglPos;
})

canvas.listen("mouseup", (event) => {
    if (!isDragging) {
        return;
    }
    isDragging = false;
    const webglPos = canvas.webGLPos(event.clientX, event.clientY);
    console.log("结束拖拽:", webglPos);
})