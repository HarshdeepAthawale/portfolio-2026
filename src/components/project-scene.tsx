"use client";

import { useEffect, useRef, type CSSProperties, type PointerEvent } from "react";
import { cn } from "@/lib/utils";
import styles from "./project-scene.module.css";

export type SceneVariant = "waf" | "deepfake";

/**
 * Animated 3D project posters: CSS 3D transforms plus a small 2D canvas for
 * the point-cloud head (no WebGL / 3D library). Pauses while off-screen, tilts
 * toward the mouse, and holds still for prefers-reduced-motion.
 */
export function ProjectScene({
  variant,
  label,
  className,
}: {
  variant: SceneVariant;
  label: string;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver(([entry]) => {
      el.dataset.paused = entry.isIntersecting ? "false" : "true";
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const tilt = (event: PointerEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el || event.pointerType !== "mouse") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const rect = el.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    el.style.setProperty("--ry", `${x * 16}deg`);
    el.style.setProperty("--rx", `${-y * 12}deg`);
  };

  const resetTilt = () => {
    ref.current?.style.setProperty("--ry", "0deg");
    ref.current?.style.setProperty("--rx", "0deg");
  };

  return (
    <div
      ref={ref}
      role="img"
      aria-label={label}
      className={cn(styles.stage, styles[variant], className)}
      onPointerMove={tilt}
      onPointerLeave={resetTilt}
    >
      <div className={styles.tilt}>{variant === "waf" ? <WafScene /> : <DeepfakeScene />}</div>
    </div>
  );
}

const SHIELD_PATH = "M50 4 L92 19 L92 57 Q92 90 50 106 Q8 90 8 57 L8 19 Z";

// Back layers of the shield, stacked in depth to give it thickness.
const SHIELD_LAYERS = [
  { z: "-25px", o: 0.1 },
  { z: "-20px", o: 0.18 },
  { z: "-15px", o: 0.28 },
  { z: "-10px", o: 0.38 },
  { z: "-5px", o: 0.5 },
];

function WafScene() {
  return (
    <>
      <div className={styles.floor} />
      <div className={styles.orbit} />

      {/* Clean requests pass through; malicious ones hit the shield and bounce. */}
      {[
        { top: "46%", delay: "-0.4s" },
        { top: "66%", delay: "-1.5s" },
        { top: "34%", delay: "-2.6s" },
      ].map((p) => (
        <span
          key={p.top}
          className={cn(styles.packet, styles.pass)}
          style={{ top: p.top, animationDelay: p.delay }}
        />
      ))}
      {[
        { top: "41%", delay: "0s" },
        { top: "58%", delay: "-1.6s" },
      ].map((p) => (
        <span
          key={p.top}
          className={cn(styles.packet, styles.blocked)}
          style={{ top: p.top, animationDelay: p.delay }}
        />
      ))}

      <div className={styles.shield}>
        {SHIELD_LAYERS.map((layer) => (
          <div
            key={layer.z}
            className={styles.shieldLayer}
            style={{ "--z": layer.z, opacity: layer.o } as CSSProperties}
          >
            <svg viewBox="0 0 100 110" className={styles.svg}>
              <path d={SHIELD_PATH} fill="none" stroke="#8b7cf6" strokeWidth="2" strokeLinejoin="round" />
            </svg>
          </div>
        ))}
        <div className={styles.shieldFace}>
          <svg viewBox="0 0 100 110" className={styles.svg}>
            <path
              d={SHIELD_PATH}
              fill="rgba(133,116,192,0.22)"
              stroke="#ede9fe"
              strokeWidth="2.5"
              strokeLinejoin="round"
            />
            <g stroke="#a78bfa" strokeWidth="1.6" opacity="0.7">
              <path d="M24 40 H76 M24 55 H76 M26 70 H74 M40 40 V55 M62 40 V55 M50 55 V70 M32 55 V70 M68 55 V70 M40 70 V82 M60 70 V82" />
            </g>
            <path
              className={styles.check}
              d="M34 58 L46 70 L70 44"
              fill="none"
              stroke="#6ee7b7"
              strokeWidth="5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <div className={styles.ripple} />
      </div>

      <div className={styles.hud}>
        <span className={styles.dot} />
        WAF · Inspecting
      </div>
      <div className={styles.chip}>96% detection</div>
    </>
  );
}

type Vec3 = [number, number, number];

// Point cloud on a head-shaped ellipsoid. Unit coords: x/z scale by the head's
// half-width, y by its half-height (+y is down). Fibonacci spread; jaw tapers.
const CLOUD_SIZE = 240;
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
const jawTaper = (y: number) => (y > 0 ? 1 - 0.22 * y : 1);

const CLOUD: Vec3[] = Array.from({ length: CLOUD_SIZE }, (_, i) => {
  const y = 1 - (2 * (i + 0.5)) / CLOUD_SIZE;
  const r = Math.sqrt(1 - y * y);
  const phi = i * GOLDEN_ANGLE;
  return [Math.cos(phi) * r * jawTaper(y), y, Math.sin(phi) * r * 0.85];
});

// Mesh edges: each point joined to its 3 nearest neighbours (computed once).
const CLOUD_EDGES: [number, number][] = (() => {
  const seen = new Set<string>();
  const edges: [number, number][] = [];
  CLOUD.forEach(([x1, y1, z1], i) => {
    CLOUD.map(([x2, y2, z2], j) => ({
      j,
      d: (x1 - x2) ** 2 * 0.6 + (y1 - y2) ** 2 + (z1 - z2) ** 2 * 0.6,
    }))
      .filter((n) => n.j !== i)
      .sort((p, q) => p.d - q.d)
      .slice(0, 3)
      .forEach(({ j }) => {
        const key = i < j ? `${i}-${j}` : `${j}-${i}`;
        if (!seen.has(key)) {
          seen.add(key);
          edges.push([i, j]);
        }
      });
  });
  return edges;
})();

// Facial landmarks on the front surface: eyes, brows, forehead, nose, cheeks,
// mouth, chin.
const LANDMARKS: Vec3[] = [
  [-0.35, -0.15],
  [0.35, -0.15],
  [-0.35, -0.35],
  [0.35, -0.35],
  [0, -0.62],
  [0, 0.1],
  [-0.6, 0.25],
  [0.6, 0.25],
  [-0.25, 0.45],
  [0, 0.47],
  [0.25, 0.45],
  [0, 0.8],
].map(([x, y]): Vec3 => [
  x,
  y,
  Math.sqrt(Math.max(0, 1 - (x / jawTaper(y)) ** 2 - y * y)) * 0.85,
]);

const LANDMARK_EDGES: [number, number][] = [
  [0, 2],
  [1, 3],
  [2, 4],
  [3, 4],
  [0, 5],
  [1, 5],
  [5, 9],
  [8, 9],
  [9, 10],
  [6, 8],
  [7, 10],
  [9, 11],
];

function HeadCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    let visible = false;
    let width = 0;
    let height = 0;

    const draw = (t: number) => {
      ctx.clearRect(0, 0, width, height);
      const cx = width / 2;
      const cy = height / 2;
      const b = height * 0.3; // half-height of the head
      const a = b * 0.77; // half-width
      const yaw = reduced ? 0.35 : Math.sin(t * 0.5) * 0.85;
      const pitch = -0.12;
      const focal = a * 4;
      const scanY = cy + (reduced ? 0 : Math.sin(t * 1.1) * b * 1.05);

      const project = ([x, y, z]: Vec3) => {
        const x1 = x * Math.cos(yaw) + z * Math.sin(yaw);
        const z1 = -x * Math.sin(yaw) + z * Math.cos(yaw);
        const y2 = y * Math.cos(pitch) - z1 * Math.sin(pitch);
        const z2 = y * Math.sin(pitch) + z1 * Math.cos(pitch);
        const scale = focal / (focal - z2 * a);
        return { x: cx + x1 * a * scale, y: cy + y2 * b * scale, depth: (z2 + 1) / 2 };
      };

      const cloud = CLOUD.map(project);

      ctx.lineWidth = 0.6;
      for (const [i, j] of CLOUD_EDGES) {
        const p = cloud[i];
        const q = cloud[j];
        ctx.strokeStyle = `rgba(45, 212, 191, ${0.05 + 0.3 * ((p.depth + q.depth) / 2)})`;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(q.x, q.y);
        ctx.stroke();
      }

      for (const p of cloud) {
        const lit = Math.abs(p.y - scanY) < 7;
        ctx.fillStyle = lit
          ? "rgba(204, 251, 241, 0.95)"
          : `rgba(94, 234, 212, ${0.2 + 0.7 * p.depth})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, (lit ? 1.8 : 0.9) + 0.9 * p.depth, 0, Math.PI * 2);
        ctx.fill();
      }

      const marks = LANDMARKS.map(project);
      ctx.lineWidth = 1.2;
      for (const [i, j] of LANDMARK_EDGES) {
        const p = marks[i];
        const q = marks[j];
        ctx.strokeStyle = `rgba(204, 251, 241, ${0.25 + 0.55 * ((p.depth + q.depth) / 2)})`;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(q.x, q.y);
        ctx.stroke();
      }
      ctx.shadowColor = "#2dd4bf";
      ctx.shadowBlur = 10;
      for (const p of marks) {
        ctx.fillStyle = `rgba(204, 251, 241, ${0.45 + 0.55 * p.depth})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2 + 1.4 * p.depth, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.shadowBlur = 0;

      // Scan line sweeping over the head.
      const half = a * 1.5;
      const line = ctx.createLinearGradient(cx - half, 0, cx + half, 0);
      line.addColorStop(0, "rgba(94, 234, 212, 0)");
      line.addColorStop(0.5, "rgba(94, 234, 212, 0.9)");
      line.addColorStop(1, "rgba(94, 234, 212, 0)");
      ctx.fillStyle = line;
      ctx.fillRect(cx - half, scanY - 1, half * 2, 2);
    };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (reduced || !visible) draw(0);
    };

    const loop = (now: number) => {
      draw(now / 1000);
      raf = requestAnimationFrame(loop);
    };

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();

    // Only animate while on screen.
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      cancelAnimationFrame(raf);
      if (visible && !reduced) raf = requestAnimationFrame(loop);
    });
    io.observe(canvas);

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
    };
  }, []);

  return <canvas ref={ref} aria-hidden className={styles.canvas} />;
}

function DeepfakeScene() {
  return (
    <>
      <div className={styles.frame}>
        <span className={cn(styles.corner, styles.tl)} />
        <span className={cn(styles.corner, styles.tr)} />
        <span className={cn(styles.corner, styles.bl)} />
        <span className={cn(styles.corner, styles.br)} />
      </div>

      <HeadCanvas />

      <div className={styles.hud}>
        <span className={styles.dot} />
        Deepfake · 4-agent scan
      </div>
      <div className={styles.verdict}>
        <span className={styles.verdictScanning}>Scanning…</span>
        <span className={styles.verdictFake}>Synthetic · flagged</span>
        <span className={styles.verdictReal}>Authentic</span>
      </div>
    </>
  );
}
