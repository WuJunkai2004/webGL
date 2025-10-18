export function createCanvas(width, height) {
  const canvas = document.createElement('canvas');
  let mount_selector = undefined;
  canvas.width = width;
  canvas.height = height;

  const readyPromise = new Promise((resolve, reject) => {
    const scriptsToLoad = [
      '/lib/webgl-utils.js',
      '/lib/webgl-debug.js',
      '/lib/cuon-utils.js',
      '/lib/cuon-matrix.js'
    ];
    let loadedCount = 0;
    const injectScript = (src) => {
      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      script.onload = () => {
        loadedCount++;
        if (loadedCount === scriptsToLoad.length) {
          resolve();
        }
      };
      script.onerror = () => {
        reject(new Error(`Failed to load script: ${src}`));
      };
      document.head.appendChild(script);
    };
    scriptsToLoad.forEach(src => injectScript(src));
  });

  // 装载canvas
  const mount = (selector) => {
    const container = document.querySelector(selector);
    if (container) {
      mount_selector = selector;
      container.appendChild(canvas);
    } else {
      console.error(`Container with selector "${selector}" not found.`);
    }
  };

  // 加载模块
  const load = async (src) => {
    try {
      await readyPromise;
      const module = await import(src);
      let is_run = false;
      for (const fnName of ['main', 'init', 'default']) {
        if (module[fnName] && typeof module[fnName] === 'function') {
          const result = module[fnName](canvas);
          if (result && result.then && typeof result.then === 'function') {
            await result;
          }
          is_run = true;
          break;
        }
      }

      if(!is_run) {
        console.warn(`No suitable function found to execute in module "${src}".`);
      }
      return module;
    } catch (error) {
      console.error(`Error loading module "${src}":`, error);
    }
  }

  // 将屏幕坐标转换为WebGL坐标
  const webGLPos = (x, y) => {
    const rect = canvas.getBoundingClientRect();
    const canvasX = x - rect.left;
    const canvasY = y - rect.top;

    // 转换为WebGL坐标系 [-1, 1]
    const webglX = (canvasX / canvas.width) * 2 - 1;
    const webglY = -((canvasY / canvas.height) * 2 - 1); // Y轴翻转

    return { x: webglX, y: webglY };
  }

  return {
    canvas,
    load,
    mount,
    webGLPos,
  };
}