"use client";

import { useEffect, useRef } from "react";

// ---------------------------------------------------------------------------
// WebGPU (vgpu) ember atmosphere: drifting steam fbm + wandering ember orbs +
// a soft "heat well" that follows the pointer. Battery-safe: 30fps cap,
// auto-suspends offscreen/hidden, honours prefers-reduced-motion, and falls
// back to a lightweight GLSL shader when WebGPU is unavailable.
// ---------------------------------------------------------------------------

const EMBER_WGSL = `
struct Params {
  time: f32,
  texel: vec2f,
  pointer: vec2f,
}

@group(0) @binding(0) var<uniform> params: Params;

fn hash(p: vec2f) -> f32 {
  return fract(sin(dot(p, vec2f(127.1, 311.7))) * 43758.5453123);
}

fn noise(p: vec2f) -> f32 {
  let i = floor(p);
  let f = fract(p);
  let u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2f(1.0, 0.0)), u.x),
    mix(hash(i + vec2f(0.0, 1.0)), hash(i + vec2f(1.0, 1.0)), u.x),
    u.y
  );
}

fn fbm(p: vec2f) -> f32 {
  var v = 0.0;
  var a = 0.5;
  var q = p;
  for (var i = 0; i < 5; i = i + 1) {
    v = v + a * noise(q);
    q = q * 2.03 + vec2f(13.7, 7.3);
    a = a * 0.55;
  }
  return v;
}

@fragment fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {
  let t = params.time * 0.05;

  // Slow upward steam draft.
  var p = uv * 2.2 + vec2f(0.0, t * 0.6);
  var n = fbm(p + vec2f(0.0, t));
  n = n + 0.5 * fbm(uv * 5.2 - vec2f(t * 0.7, 0.0));
  n = n / 1.5;

  // Two wandering ember orbs.
  let o1 = vec2f(0.26, 0.60) + vec2f(0.18 * sin(t * 0.7), 0.12 * cos(t * 0.9));
  let o2 = vec2f(0.72, 0.42) + vec2f(0.16 * cos(t * 0.8 + 2.0), 0.14 * sin(t * 0.6 + 1.0));
  let d1 = 0.08 / (distance(uv, o1) + 0.05);
  let d2 = 0.06 / (distance(uv, o2) + 0.05);

  // Pointer heat well (soft hot spot that eases after the pointer leaves).
  let pd = distance(uv, params.pointer);
  let well = 0.10 / (pow(pd, 1.4) + 0.09);

  let n2 = n * n;
  // Opaque, dimmed output: no CSS blend/opacity tricks in the compositor.
  // The base is the surface dark (#1c110c ≈ 0.11,0.07,0.05); embers add up
  // to the amber highlight, bakes the historic 0.35 screen-blend intensity.
  let k = clamp(n2 * 0.55 + (d1 + d2) * 0.02 + well * 0.035, 0.0, 1.0);
  let col = mix(vec3f(0.11, 0.07, 0.05), vec3f(0.85, 0.47, 0.03), k);
  return vec4f(col, 1.0);
}
`;

const GLSL_VERT = `
attribute vec2 a_pos;
void main() {
  gl_Position = vec4(a_pos, 0.0, 1.0);
}
`;

const GLSL_FRAG = `
#ifdef GL_ES
precision mediump float;
#endif
uniform vec2 u_res;
uniform float u_time;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}
float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  vec2 q = p;
  for (int i = 0; i < 5; i++) {
    v += a * noise(q);
    q = q * 2.03 + vec2(13.7, 7.3);
    a *= 0.55;
  }
  return v;
}
void main() {
  vec2 uv = gl_FragCoord.xy / u_res;
  float t = u_time * 0.05;
  vec2 p = uv * 2.2 + vec2(0.0, t * 0.6);
  float n = fbm(p + vec2(0.0, t));
  n += 0.5 * fbm(uv * 5.2 - vec2(t * 0.7, 0.0));
  n = n / 1.5;
  vec2 o1 = vec2(0.26, 0.60) + vec2(0.18 * sin(t * 0.7), 0.12 * cos(t * 0.9));
  vec2 o2 = vec2(0.72, 0.42) + vec2(0.16 * cos(t * 0.8 + 2.0), 0.14 * sin(t * 0.6 + 1.0));
  float d1 = 0.08 / (distance(uv, o1) + 0.05);
  float d2 = 0.06 / (distance(uv, o2) + 0.05);
  float n2 = n * n;
  // Opaque, dimmed output: no CSS blend/opacity tricks in the compositor.
  // Base ≈ surface dark (#1c110c); embers add up to the amber highlight.
  float k = clamp(n2 * 0.55 + (d1 + d2) * 0.03, 0.0, 1.0);
  vec3 col = mix(vec3(0.11, 0.07, 0.05), vec3(0.85, 0.47, 0.03), k);
  gl_FragColor = vec4(col, 1.0);
}
`;

interface AtmosphereHandle {
  dispose(): void;
}

function startGLSL(canvas: HTMLCanvasElement): AtmosphereHandle {
  const gl = (canvas.getContext("webgl", { alpha: true }) ??
    canvas.getContext("experimental-webgl", { alpha: true })) as WebGLRenderingContext | null;

  if (!gl) {
    return { dispose: () => {} };
  }

  const compile = (type: number, src: string) => {
    const sh = gl.createShader(type)!;
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    return sh;
  };
  const prog = gl.createProgram()!;
  gl.attachShader(prog, compile(gl.VERTEX_SHADER, GLSL_VERT));
  gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, GLSL_FRAG));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    gl.deleteProgram(prog);
    return { dispose: () => {} };
  }
  gl.useProgram(prog);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
    gl.STATIC_DRAW
  );
  const loc = gl.getAttribLocation(prog, "a_pos");
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const uRes = gl.getUniformLocation(prog, "u_res");
  const uTime = gl.getUniformLocation(prog, "u_time");

  const draw = (time: number) => {
    if (gl.isContextLost()) return;
    gl.uniform1f(uTime, time);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  };
  // Half-resolution rendering: the embers are soft and diffuse, so downsizing
  // the draw surface 2x (4x fewer pixels) is imperceptible and keeps the
  // fallback cheap on CPU/SwiftShader compositors.
  const resize = () => {
    const w = Math.max(2, Math.floor(canvas.clientWidth / 2));
    const h = Math.max(2, Math.floor(canvas.clientHeight / 2));
    if (canvas.width === w && canvas.height === h) return;
    canvas.width = w;
    canvas.height = h;
    gl.viewport(0, 0, w, h);
    gl.uniform2f(uRes, w, h);
  };

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduceMotion) {
    resize();
    draw(3.7);
    return { dispose: () => gl.getExtension("WEBGL_lose_context")?.loseContext() };
  }

  // 30fps cap (mirrors the WebGPU path) to bound per-frame raster cost.
  const FRAME_MS = 1000 / 30;
  let raf = 0;
  let running = false;
  let lastT = 0;
  const loop = (t: number) => {
    if (!running) return;
    if (t - lastT >= FRAME_MS) {
      lastT = t;
      draw(t * 0.001);
    }
    raf = requestAnimationFrame(loop);
  };
  const start = () => {
    if (running) return;
    running = true;
    resize();
    draw(0);
    raf = requestAnimationFrame(loop);
  };
  const stop = () => {
    running = false;
    cancelAnimationFrame(raf);
  };
  const onVisibility = () => {
    if (document.hidden) stop();
    else if (visible) start();
  };

  let visible = true;
  const obs = new IntersectionObserver(
    ([entry]) => {
      visible = entry.isIntersecting;
      if (document.hidden || !visible) stop();
      else start();
    },
    { threshold: 0.01 }
  );

  window.addEventListener("resize", resize);
  document.addEventListener("visibilitychange", onVisibility);
  obs.observe(canvas);
  start();

  return {
    dispose: () => {
      stop();
      obs.disconnect();
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisibility);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    },
  };
}

async function startVgpu(canvas: HTMLCanvasElement): Promise<AtmosphereHandle | null> {
  if (typeof navigator === "undefined" || !("gpu" in navigator)) return null;

  const { init, surface, effect, clock, frameLoop, frame } = await import("vgpu");

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const gpu = await init({ powerPreference: "low-power" });
  const canvasSurface = surface(gpu, canvas, { dpr: [1, Math.min(window.devicePixelRatio || 1, 1.5)] });

  const pointer = { x: 0.77, y: 0.35 };
  const onPointer = (e: PointerEvent) => {
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    pointer.x = (e.clientX - rect.left) / rect.width;
    pointer.y = (e.clientY - rect.top) / rect.height;
  };
  window.addEventListener("pointermove", onPointer, { passive: true });
  window.addEventListener("pointerdown", onPointer, { passive: true });

  const ember = effect(
    gpu,
    EMBER_WGSL,
    { set: { params: { time: 0, texel: canvasSurface.texelSize, pointer: [pointer.x, pointer.y] } } }
  );
  canvasSurface.onResize(() => {
    ember.set({ params: { texel: canvasSurface.texelSize } });
  });

  const time = clock(gpu);

  const renderFrame = () => {
    ember.set({ params: { time: time.time, pointer: [pointer.x, pointer.y] } });
    return canvasSurface;
  };

  if (reduceMotion) {
    frame(gpu, (f) => f.pass(renderFrame(), ember));
    return {
      dispose: () => {
        window.removeEventListener("pointermove", onPointer);
        window.removeEventListener("pointerdown", onPointer);
        gpu.dispose();
      },
    };
  }

  let loop: { stop(): void } | null = null;
  const startLoop = () => {
    if (loop) return;
    loop = frameLoop(gpu, (f) => f.pass(renderFrame(), ember), { fps: 30 });
  };
  const stopLoop = () => {
    loop?.stop();
    loop = null;
  };

  const onVisibility = () => {
    if (document.hidden || !visible) stopLoop();
    else startLoop();
  };
  let visible = true;
  const obs = new IntersectionObserver(
    ([entry]) => {
      visible = entry.isIntersecting;
      if (document.hidden || !visible) stopLoop();
      else startLoop();
    },
    { threshold: 0.01 }
  );

  document.addEventListener("visibilitychange", onVisibility);
  obs.observe(canvas);
  startLoop();

  return {
    dispose: () => {
      stopLoop();
      obs.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("pointerdown", onPointer);
      gpu.dispose();
    },
  };
}

async function createAtmosphere(canvas: HTMLCanvasElement): Promise<AtmosphereHandle> {
  try {
    const vgpuHandle = await startVgpu(canvas);
    if (vgpuHandle) return vgpuHandle;
  } catch {
    // WebGPU unavailable or init failed — silently fall back to GLSL.
  }
  return startGLSL(canvas);
}

export function AmbientBackdrop({ className = "" }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    let handle: AtmosphereHandle | null = null;
    let disposed = false;
    createAtmosphere(canvas).then((h) => {
      if (disposed) {
        h.dispose();
        return;
      }
      handle = h;
    });
    return () => {
      disposed = true;
      handle?.dispose();
    };
  }, []);

  return (
    <div
      className={`fixed inset-0 -z-10 pointer-events-none overflow-hidden ${className}`}
      aria-hidden="true"
    >
      <canvas ref={ref} className="w-full h-full" />
    </div>
  );
}