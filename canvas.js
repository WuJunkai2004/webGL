export function createCanvas(width, height) {
    const canvas = document.createElement('canvas');
    let mount_selector = undefined;
    canvas.width = width;
    canvas.height = height;

    (function init() {
        const injectScript = (src) => {
            const script = document.createElement('script');
            script.src = src;
            script.async = false;
            script.mo
            document.head.appendChild(script);
        };
        [
            '/lib/webgl-utils.js',
            '/lib/webgl-debug.js',
            '/lib/cuon-utils.js',
            '/lib/cuon-matrix.js'
        ].forEach(src => injectScript(src));
    })();

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
            const module = await import(src);
            let is_run = false;
            ['main', 'init', 'default'].forEach( fnName => {
                if (!is_run && module[fnName] && typeof module[fnName] === 'function') {
                    module[fnName](canvas, mount_selector);
                    is_run = true;
                }
            })
            if(!is_run) {
                console.warn(`No suitable function found to execute in module "${src}".`);
            }
        } catch (error) {
            console.error(`Error loading module "${src}":`, error);
        }
    }

    return {
        canvas,
        load,
        mount,
    };
}