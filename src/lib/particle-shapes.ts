/**
 * 3D point clouds for the threat console. Every shape returns exactly
 * POINT_COUNT points (roughly within a unit sphere), so the console can morph
 * any shape into any other point-for-point.
 */

export type Vec3 = [number, number, number];
export type ShapeName = "graph" | "browser" | "servers" | "padlock";

export const POINT_COUNT = 720;

type Segment = [Vec3, Vec3];

// A small deterministic PRNG so shapes look the same on every render.
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const dist = (a: Vec3, b: Vec3) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

/** Spreads `count` points along segments (by length), plus a little jitter. */
function sampleSegments(segments: Segment[], count: number, rand: () => number, jitter = 0.012): Vec3[] {
  const lengths = segments.map(([a, b]) => dist(a, b));
  const total = lengths.reduce((sum, l) => sum + l, 0);
  const points: Vec3[] = [];
  segments.forEach(([a, b], i) => {
    const n = i === segments.length - 1 ? count - points.length : Math.round((lengths[i] / total) * count);
    for (let k = 0; k < n; k++) {
      const t = rand();
      points.push([
        a[0] + (b[0] - a[0]) * t + (rand() - 0.5) * jitter,
        a[1] + (b[1] - a[1]) * t + (rand() - 0.5) * jitter,
        a[2] + (b[2] - a[2]) * t + (rand() - 0.5) * jitter,
      ]);
    }
  });
  return points.slice(0, count);
}

/** Small round clusters (nodes, LEDs, keyholes). */
function clusters(centers: Vec3[], count: number, radius: number, rand: () => number): Vec3[] {
  const points: Vec3[] = [];
  for (let i = 0; i < count; i++) {
    const c = centers[i % centers.length];
    const u = rand() * Math.PI * 2;
    const v = Math.acos(2 * rand() - 1);
    const r = radius * Math.cbrt(rand());
    points.push([c[0] + r * Math.sin(v) * Math.cos(u), c[1] + r * Math.sin(v) * Math.sin(u), c[2] + r * Math.cos(v)]);
  }
  return points;
}

/** The 12 edges of an axis-aligned box. */
function boxEdges([cx, cy, cz]: Vec3, w: number, h: number, d: number): Segment[] {
  const x = [cx - w / 2, cx + w / 2];
  const y = [cy - h / 2, cy + h / 2];
  const z = [cz - d / 2, cz + d / 2];
  const edges: Segment[] = [];
  for (const yy of y) for (const zz of z) edges.push([[x[0], yy, zz], [x[1], yy, zz]]);
  for (const xx of x) for (const zz of z) edges.push([[xx, y[0], zz], [xx, y[1], zz]]);
  for (const xx of x) for (const yy of y) edges.push([[xx, yy, z[0]], [xx, yy, z[1]]]);
  return edges;
}

function arc(center: Vec3, radius: number, from: number, to: number, z: number, steps = 24): Segment[] {
  const segments: Segment[] = [];
  for (let i = 0; i < steps; i++) {
    const a = from + ((to - from) * i) / steps;
    const b = from + ((to - from) * (i + 1)) / steps;
    segments.push([
      [center[0] + Math.cos(a) * radius, center[1] + Math.sin(a) * radius, z],
      [center[0] + Math.cos(b) * radius, center[1] + Math.sin(b) * radius, z],
    ]);
  }
  return segments;
}

// ---------------------------------------------------------------- Shapes

/** API & GraphQL: a node graph on a sphere, wired to a hub. */
function graph(rand: () => number): Vec3[] {
  const nodes: Vec3[] = [];
  const n = 11;
  for (let i = 0; i < n; i++) {
    const y = 1 - (i / (n - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const theta = i * 2.39996;
    nodes.push([Math.cos(theta) * r * 0.85, y * 0.85, Math.sin(theta) * r * 0.85]);
  }
  const hub: Vec3 = [0, 0, 0];
  const edges: Segment[] = nodes.map((node) => [hub, node]);
  nodes.forEach((a, i) => {
    const nearest = nodes
      .map((b, j) => ({ j, d: dist(a, b) }))
      .filter(({ j }) => j !== i)
      .sort((p, q) => p.d - q.d)
      .slice(0, 2);
    nearest.forEach(({ j }) => j > i && edges.push([a, nodes[j]]));
  });
  return [...clusters([...nodes, hub], 260, 0.07, rand), ...sampleSegments(edges, POINT_COUNT - 260, rand)];
}

/** Web apps: a browser window with a title bar and lines of content. */
function browser(rand: () => number): Vec3[] {
  const w = 1.7;
  const h = 1.15;
  const top = h / 2;
  const left = -w / 2;
  const frame: Segment[] = [
    [[left, top, 0], [-left, top, 0]],
    [[left, -top, 0], [-left, -top, 0]],
    [[left, top, 0], [left, -top, 0]],
    [[-left, top, 0], [-left, -top, 0]],
    [[left, top - 0.2, 0], [-left, top - 0.2, 0]],
    // Address bar
    [[left + 0.42, top - 0.1, 0], [-left - 0.12, top - 0.1, 0]],
  ];
  const content: Segment[] = [0.12, -0.04, -0.2, -0.36].map((y, i) => [
    [left + 0.14, y, 0.02],
    [left + 0.14 + (i % 2 ? 0.9 : 1.3), y, 0.02],
  ]);
  const dots = clusters(
    [
      [left + 0.1, top - 0.1, 0],
      [left + 0.18, top - 0.1, 0],
      [left + 0.26, top - 0.1, 0],
    ],
    36,
    0.025,
    rand,
  );
  return [...dots, ...sampleSegments([...frame, ...content], POINT_COUNT - 36, rand, 0.01)];
}

/** Cloud & infra: three stacked server units with status LEDs. */
function servers(rand: () => number): Vec3[] {
  const edges = [0.48, 0, -0.48].flatMap((y) => boxEdges([0, y, 0], 1.5, 0.36, 0.8));
  const leds = clusters(
    [0.48, 0, -0.48].flatMap((y): Vec3[] => [
      [0.5, y, 0.4],
      [0.6, y, 0.4],
    ]),
    84,
    0.03,
    rand,
  );
  return [...leds, ...sampleSegments(edges, POINT_COUNT - 84, rand, 0.01)];
}

/** Secrets: a padlock - box body, arched shackle and a keyhole. */
function padlock(rand: () => number): Vec3[] {
  const body = boxEdges([0, -0.3, 0], 1.1, 0.8, 0.36);
  const shackle = [-0.08, 0.08].flatMap((z) => arc([0, 0.1, 0], 0.36, 0, Math.PI, z));
  const legs: Segment[] = [-0.36, 0.36].flatMap((x): Segment[] => [
    [[x, 0.1, -0.08], [x, 0.1, 0.08]],
  ]);
  const keyhole = clusters([[0, -0.24, 0.19]], 50, 0.06, rand);
  const slot = sampleSegments([[[0, -0.28, 0.19], [0, -0.48, 0.19]]], 30, rand, 0.02);
  return [...keyhole, ...slot, ...sampleSegments([...body, ...shackle, ...legs], POINT_COUNT - 80, rand, 0.012)];
}

const GENERATORS: Record<ShapeName, (rand: () => number) => Vec3[]> = {
  graph,
  browser,
  servers,
  padlock,
};

const cache = new Map<ShapeName, Vec3[]>();

export function getShape(name: ShapeName): Vec3[] {
  if (!cache.has(name)) cache.set(name, GENERATORS[name](rng(name.length * 7919 + 17)));
  return cache.get(name)!;
}
