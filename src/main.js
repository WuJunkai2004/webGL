import { createCanvas } from '/canvas.js';

const canvas = createCanvas(400, 400);

canvas.mount('#app');

canvas.load('/examples/example1.js');