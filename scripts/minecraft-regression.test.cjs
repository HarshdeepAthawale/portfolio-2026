const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const test = require("node:test");
const ts = require("typescript");

function loadTypeScript(relativePath, globals = {}, imports = {}) {
  const source = fs.readFileSync(path.join(__dirname, "..", relativePath), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2017, jsx: ts.JsxEmit.ReactJSX },
  });
  const exports = {};
  vm.runInNewContext(outputText, {
    exports,
    require: name => imports[name] ?? require(name),
    ...globals,
  }, { filename: relativePath });
  return exports;
}

const preferences = loadTypeScript("src/lib/minecraft-preferences.ts");

test("explicit Full motion overrides the OS setting; malformed preferences stay safe", () => {
  assert.equal(preferences.parseMinecraftPreferences('{"reduced":false}', true).reduced, false);
  assert.equal(preferences.parseMinecraftPreferences("broken JSON", true).reduced, true);
  assert.equal(preferences.parseMinecraftPreferences('{"volume":5}', false).volume, 1);
});

test("an already-open homepage follows motion changes in a second tab", () => {
  const window = new EventTarget();
  let reduced = true;
  const stop = preferences.subscribeToMinecraftPreferences(window, false, next => { reduced = next.reduced; });
  const change = (key, newValue) => {
    const event = new Event("storage");
    Object.assign(event, { key, newValue });
    window.dispatchEvent(event);
  };
  change(preferences.minecraftPreferencesKey, '{"muted":true,"volume":0.3,"reduced":false}');
  assert.equal(reduced, false, "the existing homepage must resume without a reload");
  change("unrelated.setting", '{"reduced":true}');
  assert.equal(reduced, false);
  change(preferences.minecraftPreferencesKey, '{"reduced":true}');
  assert.equal(reduced, true);
  stop();
  change(preferences.minecraftPreferencesKey, '{"reduced":false}');
  assert.equal(reduced, true, "unmount removes the subscription");
});

test("the actual panorama loop rotates at reference speed, pauses, and resumes", async () => {
  const host = { clientWidth: 1280, clientHeight: 720, appendChild() {} };
  const frames = new Map();
  const textures = [];
  const document = { hidden: false };
  const window = new EventTarget();
  let nextFrame = 0;
  let now = 0;
  let cursor = 0;
  let renderer;
  const hooks = [];
  const pendingEffects = [];
  const react = {
    useRef(value) {
      const index = cursor++;
      if (!hooks[index]) hooks[index] = { current: index === 0 ? host : value };
      return hooks[index];
    },
    useEffect(callback, dependencies) {
      const index = cursor++;
      const previous = hooks[index];
      if (previous && dependencies.every((value, i) => value === previous.dependencies[i])) return;
      pendingEffects.push(() => {
        previous?.cleanup?.();
        hooks[index] = { dependencies, cleanup: callback() };
      });
    },
  };
  const three = {
    WebGLRenderer: class {
      constructor() {
        renderer = this;
        this.angles = [];
        this.domElement = Object.assign(new EventTarget(), { style: {}, remove() {} });
      }
      setPixelRatio() {}
      setSize() {}
      render(scene, camera) { this.angles.push(camera.rotation.y); }
      dispose() { this.disposed = true; }
    },
    Scene: class { add() {} },
    PerspectiveCamera: class {
      constructor() { this.rotation = { x: 0, y: 0 }; }
      updateProjectionMatrix() {}
    },
    TextureLoader: class {
      load(url, onLoad) { textures.push(onLoad); return { dispose() {} }; }
    },
    MeshBasicMaterial: class { constructor(options) { Object.assign(this, options); } dispose() {} },
    BoxGeometry: class { dispose() {} },
    Mesh: class {},
    BackSide: 1,
    SRGBColorSpace: "srgb",
  };
  const { Panorama } = loadTypeScript("src/components/minecraft/panorama.tsx", {
    document, window, devicePixelRatio: 1, performance: { now: () => now },
    requestAnimationFrame(callback) { const id = ++nextFrame; frames.set(id, callback); return id; },
    cancelAnimationFrame(id) { frames.delete(id); },
  }, { react, three });

  const render = reduced => {
    cursor = 0;
    Panorama({ reduced });
    while (pendingEffects.length) pendingEffects.shift()();
  };
  const tick = count => {
    for (let i = 0; i < count; i++) {
      now += 34;
      const callbacks = [...frames.values()];
      frames.clear();
      callbacks.forEach(callback => callback(now));
    }
  };

  render(true);
  await new Promise(setImmediate);
  assert.equal(textures.length, 6);
  textures.forEach(onLoad => onLoad());
  tick(10);
  assert.equal(renderer.angles.length, 1, "Reduced mode paints a still frame");
  render(false);
  tick(120);
  assert.ok(Math.abs(renderer.angles.at(-1) - 120 * 0.034 * 0.04) < 1e-9);
  const activeFrames = renderer.angles.length;
  render(true);
  tick(30);
  assert.equal(renderer.angles.length, activeFrames);
  render(false);
  tick(1);
  assert.equal(renderer.angles.length, activeFrames + 1);
  document.hidden = true;
  tick(30);
  assert.equal(renderer.angles.length, activeFrames + 1, "hidden tabs do not waste rendering work");
  document.hidden = false;
  tick(1);
  assert.equal(renderer.angles.length, activeFrames + 2);
  hooks.forEach(hook => hook.cleanup?.());
  assert.equal(renderer.disposed, true);
  assert.equal(frames.size, 0);
});

test("smooth panes preserve native input and release Lenis when motion is reduced", async () => {
  const listeners = new Map();
  const host = {
    scrollTop: 123,
    addEventListener(name, listener) { listeners.set(name, listener); },
    removeEventListener(name, listener) { if (listeners.get(name) === listener) listeners.delete(name); },
  };
  const inner = {};
  const hooks = [];
  const effects = [];
  const instances = [];
  const observers = [];
  let cursor = 0;
  let reduced = false;
  class Lenis {
    constructor(options) { this.options = options; this.syncs = []; instances.push(this); }
    scrollTo(value, options) { this.syncs.push({ value, options }); }
    resize() { this.resized = true; }
    destroy() { this.destroyed = true; }
  }
  const react = {
    forwardRef: render => render,
    useRef() { const index = cursor++; return hooks[index] ??= { current: index === 0 ? host : inner }; },
    useImperativeHandle() {},
    useEffect(callback, dependencies) {
      const index = cursor++;
      const previous = hooks[index];
      if (previous && dependencies.every((value, i) => value === previous.dependencies[i])) return;
      effects.push(() => { previous?.cleanup?.(); hooks[index] = { dependencies, cleanup: callback() }; });
    },
  };
  const { GameScroll } = loadTypeScript("src/components/minecraft/game-scroll.tsx", {
    ResizeObserver: class {
      constructor(callback) { this.callback = callback; this.targets = []; observers.push(this); }
      observe(target) { this.targets.push(target); }
      disconnect() { this.disconnected = true; }
    },
  }, { react, "./world": { useWorld: () => ({ reduced }) }, lenis: { default: Lenis } });
  const render = async next => {
    reduced = next; cursor = 0;
    GameScroll({ children: "content" }, null);
    while (effects.length) effects.shift()();
    await new Promise(setImmediate);
  };

  await render(false);
  assert.equal(instances.length, 1);
  assert.equal(instances[0].options.lerp, 0.16);
  assert.equal(instances[0].options.smoothWheel, true);
  assert.equal(instances[0].options.syncTouch, false, "touch remains native");
  assert.deepEqual(observers[0].targets, [host, inner]);
  listeners.get("keydown")();
  listeners.get("pointerdown")();
  listeners.get("focusin")();
  assert.equal(instances[0].syncs.length, 3, "native input synchronizes the wheel animation");
  assert.equal(instances[0].syncs[0].value, 123);
  assert.equal(instances[0].syncs[0].options.immediate, true);
  observers[0].callback();
  assert.equal(instances[0].resized, true);

  await render(true);
  assert.equal(instances[0].destroyed, true);
  assert.equal(observers[0].disconnected, true);
  assert.equal(listeners.size, 0, "Reduced mode removes smoothing listeners");
  await render(false);
  assert.equal(instances.length, 2, "Full mode can resume smoothing");
  hooks.forEach(hook => hook.cleanup?.());
  assert.equal(instances[1].destroyed, true);
  assert.equal(listeners.size, 0);
});
