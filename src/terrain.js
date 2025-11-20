// 地形生成和管理模块
import { loadFile } from "/canvas.js";

// 区块大小
const CHUNK_SIZE_X = 16;
const CHUNK_SIZE_Y = 16;
const CHUNK_SIZE_Z = 16;

// 创建方块类型定义
const BLOCK_TYPES = {
  AIR: 0,
  GRASS: 1,
  DIRT: 2,
  STONE: 3,
  WOOD: 4,  // 用于树干
  LEAVES: 5  // 用于树叶
};

// 创建地形数据
export class Terrain {
  constructor() {
    // 初始化区块数据
    this.chunks = {};
    this.vertices = [];
    this.colors = [];
    this.normals = [];
    this.indices = [];
    this.blockData = new Array(CHUNK_SIZE_X * CHUNK_SIZE_Y * CHUNK_SIZE_Z).fill(BLOCK_TYPES.AIR);
    
    // 生成简单的地形
    this.generateTerrain();
  }

  // 生成简单地形
  generateTerrain() {
    // 创建地面层 - 简单的平面
    for (let x = 0; x < CHUNK_SIZE_X; x++) {
      for (let z = 0; z < CHUNK_SIZE_Z; z++) {
        const y = 5; // 地面高度
        
        // 设置草地层
        this.setBlock(x, y, z, BLOCK_TYPES.GRASS);
        
        // 设置泥土层
        for (let dy = 1; dy <= 3; dy++) {
          if (y - dy >= 0) {
            this.setBlock(x, y - dy, z, BLOCK_TYPES.DIRT);
          }
        }
        
        // 设置石头层
        for (let dy = 4; dy <= 7; dy++) {
          if (y - dy >= 0) {
            this.setBlock(x, y - dy, z, BLOCK_TYPES.STONE);
          }
        }
      }
    }
  }

  // 设置方块
  setBlock(x, y, z, type) {
    if (x >= 0 && x < CHUNK_SIZE_X && 
        y >= 0 && y < CHUNK_SIZE_Y && 
        z >= 0 && z < CHUNK_SIZE_Z) {
      const index = y * CHUNK_SIZE_X * CHUNK_SIZE_Z + z * CHUNK_SIZE_X + x;
      this.blockData[index] = type;
    }
  }

  // 获取方块
  getBlock(x, y, z) {
    if (x >= 0 && x < CHUNK_SIZE_X && 
        y >= 0 && y < CHUNK_SIZE_Y && 
        z >= 0 && z < CHUNK_SIZE_Z) {
      const index = y * CHUNK_SIZE_X * CHUNK_SIZE_Z + z * CHUNK_SIZE_X + x;
      return this.blockData[index];
    }
    return BLOCK_TYPES.AIR;
  }

  // 检查方块是否为实心
  isSolid(x, y, z) {
    const block = this.getBlock(x, y, z);
    return block !== BLOCK_TYPES.AIR;
  }

  // 获取方块颜色
  getBlockColor(blockType) {
    switch (blockType) {
      case BLOCK_TYPES.GRASS:
        return [0.2, 0.8, 0.2, 1.0]; // 绿色（草地）
      case BLOCK_TYPES.DIRT:
        return [0.6, 0.4, 0.2, 1.0]; // 棕色（泥土）
      case BLOCK_TYPES.STONE:
        return [0.5, 0.5, 0.5, 1.0]; // 灰色（石头）
      case BLOCK_TYPES.WOOD:
        return [0.6, 0.3, 0.1, 1.0]; // 棕色（木头）
      case BLOCK_TYPES.LEAVES:
        return [0.1, 0.6, 0.2, 0.8]; // 绿色（树叶，半透明）
      default:
        return [1.0, 1.0, 1.0, 1.0]; // 白色（默认）
    }
  }

  // 生成地形的顶点数据
  generateVertices() {
    this.vertices = [];
    this.colors = [];
    this.normals = [];
    this.indices = [];
    
    // 遍历整个区块，为每个方块生成顶点
    for (let x = 0; x < CHUNK_SIZE_X; x++) {
      for (let y = 0; y < CHUNK_SIZE_Y; y++) {
        for (let z = 0; z < CHUNK_SIZE_Z; z++) {
          const blockType = this.getBlock(x, y, z);
          
          if (blockType !== BLOCK_TYPES.AIR) {
            // 为方块的每个面生成顶点（如果相邻是空气或其他透明块）
            this.generateBlockVertices(x, y, z, blockType);
          }
        }
      }
    }
  }

  // 生成单个方块的顶点数据
  generateBlockVertices(x, y, z, blockType) {
    const color = this.getBlockColor(blockType);
    
    // 定义方块顶点（单位立方体）
    const verticesTemplate = [
      // 前面
      x + 0.5, y + 0.5, z + 0.5, x - 0.5, y + 0.5, z + 0.5, x - 0.5, y - 0.5, z + 0.5, x + 0.5, y - 0.5, z + 0.5, // v0-v1-v2-v3
      // 右面
      x + 0.5, y + 0.5, z + 0.5, x + 0.5, y - 0.5, z + 0.5, x + 0.5, y - 0.5, z - 0.5, x + 0.5, y + 0.5, z - 0.5, // v0-v3-v4-v5
      // 上面
      x + 0.5, y + 0.5, z + 0.5, x + 0.5, y + 0.5, z - 0.5, x - 0.5, y + 0.5, z - 0.5, x - 0.5, y + 0.5, z + 0.5, // v0-v5-v6-v1
      // 左面
      x - 0.5, y + 0.5, z + 0.5, x - 0.5, y + 0.5, z - 0.5, x - 0.5, y - 0.5, z - 0.5, x - 0.5, y - 0.5, z + 0.5, // v1-v6-v7-v2
      // 下面
      x - 0.5, y - 0.5, z - 0.5, x + 0.5, y - 0.5, z - 0.5, x + 0.5, y - 0.5, z + 0.5, x - 0.5, y - 0.5, z + 0.5, // v7-v4-v3-v2
      // 后面
      x + 0.5, y + 0.5, z - 0.5, x - 0.5, y + 0.5, z - 0.5, x - 0.5, y - 0.5, z - 0.5, x + 0.5, y - 0.5, z - 0.5  // v4-v7-v6-v5
    ];

    // 定义法向量
    const normalsTemplate = [
      // 前面
      0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, // v0-v1-v2-v3
      // 右面
      1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, // v0-v3-v4-v5
      // 上面
      0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, // v0-v5-v6-v1
      // 左面
      -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, // v1-v6-v7-v2
      // 下面
      0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, // v7-v4-v3-v2
      // 后面
      0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0  // v4-v7-v6-v5
    ];

    // 检查每个面是否需要渲染（相邻是否为透明块）
    const faces = [
      { check: () => !this.isSolid(x, y, z + 1), offset: 0 },   // 前面
      { check: () => !this.isSolid(x + 1, y, z), offset: 12 },  // 右面
      { check: () => !this.isSolid(x, y + 1, z), offset: 24 },  // 上面
      { check: () => !this.isSolid(x - 1, y, z), offset: 36 },  // 左面
      { check: () => !this.isSolid(x, y - 1, z), offset: 48 },  // 下面
      { check: () => !this.isSolid(x, y, z - 1), offset: 60 }   // 后面
    ];

    let baseVertexIndex = this.vertices.length / 3;

    for (let i = 0; i < faces.length; i++) {
      if (faces[i].check()) {
        // 添加顶点
        for (let j = 0; j < 12; j++) { // 每个面有4个顶点 * 3维坐标 = 12个值
          this.vertices.push(verticesTemplate[faces[i].offset + j]);
          this.normals.push(normalsTemplate[faces[i].offset + j]);
        }

        // 添加颜色（每个顶点）
        for (let j = 0; j < 4; j++) {
          this.colors.push(...color);
        }

        // 添加索引
        this.indices.push(baseVertexIndex + 0, baseVertexIndex + 1, baseVertexIndex + 2);
        this.indices.push(baseVertexIndex + 0, baseVertexIndex + 2, baseVertexIndex + 3);
        
        baseVertexIndex += 4;
      }
    }
  }

  // 获取地形数据用于WebGL渲染
  getVertexData() {
    return {
      vertices: new Float32Array(this.vertices),
      colors: new Float32Array(this.colors),
      normals: new Float32Array(this.normals),
      indices: new Uint16Array(this.indices),
      numIndices: this.indices.length
    };
  }

  // 初始化地形的WebGL缓冲区
  initBuffers(gl) {
    const data = this.getVertexData();

    // 创建顶点缓冲区
    this.vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, data.vertices, gl.STATIC_DRAW);

    // 创建颜色缓冲区
    this.colorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, data.colors, gl.STATIC_DRAW);

    // 创建法向量缓冲区
    this.normalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, data.normals, gl.STATIC_DRAW);

    // 创建索引缓冲区
    this.indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, data.indices, gl.STATIC_DRAW);

    this.numIndices = data.numIndices;
  }

  // 渲染地形
  render(gl) {
    // 绑定并启用属性
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    const aPosition = gl.getAttribLocation(gl.program, 'a_Position');
    if (aPosition >= 0) {
      gl.enableVertexAttribArray(aPosition);
      gl.vertexAttribPointer(aPosition, 3, gl.FLOAT, false, 0, 0);
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuffer);
    const aColor = gl.getAttribLocation(gl.program, 'a_Color');
    if (aColor >= 0) {
      gl.enableVertexAttribArray(aColor);
      gl.vertexAttribPointer(aColor, 4, gl.FLOAT, false, 0, 0);
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
    const aNormal = gl.getAttribLocation(gl.program, 'a_Normal');
    if (aNormal >= 0) {
      gl.enableVertexAttribArray(aNormal);
      gl.vertexAttribPointer(aNormal, 3, gl.FLOAT, false, 0, 0);
    }

    // 绑定索引缓冲区
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);

    // 绘制
    gl.drawElements(gl.TRIANGLES, this.numIndices, gl.UNSIGNED_SHORT, 0);
  }
}

// 创建树木
export class Tree {
  constructor(terrain) {
    this.terrain = terrain;
  }

  // 在指定位置种植树
  plantTree(x, y, z) {
    // 确保树种植在地面上
    const groundY = y + 1; // 假设输入的y是地面的y坐标
    
    // 创建树干（4个单位高）
    for (let dy = 0; dy < 4; dy++) {
      this.terrain.setBlock(x, groundY + dy, z, BLOCK_TYPES.WOOD);
    }

    // 创建树叶（3x3x3的立方体，中心在树干顶部上方）
    const leavesCenterY = groundY + 4;
    for (let lx = -1; lx <= 1; lx++) {
      for (let ly = 0; ly <= 2; ly++) {
        for (let lz = -1; lz <= 1; lz++) {
          // 避免树叶覆盖树干
          if (!(lx === 0 && lz === 0 && ly >= 0)) {
            this.terrain.setBlock(x + lx, leavesCenterY + ly, z + lz, BLOCK_TYPES.LEAVES);
          }
        }
      }
    }
  }
}