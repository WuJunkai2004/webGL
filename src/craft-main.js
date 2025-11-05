import { createCanvas } from "/canvas.js";

const canvas = createCanvas(800, 800);

canvas.mount("#app");

const craft = await canvas.load("/src/craft.js");