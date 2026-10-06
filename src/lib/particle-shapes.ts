/**
 * 3D shapes for the threat console and project posters, built once as
 * geometry (edges + node points) and rendered two ways:
 *  - dark mode: a cloud of exactly POINT_COUNT glowing points sampled from the
 *    geometry, so any shape can morph into any other point-for-point;
 *  - light mode: the geometry itself as a fine line drawing.
 */

export type Vec3 = [number, number, number];
export type Segment = [Vec3, Vec3];
export type ShapeName = "graph" | "browser" | "servers" | "padlock" | "shield" | "face";

/** The line-drawing form of a shape: edges, plus accent nodes. */
export type Wireframe = { segments: Segment[]; nodes: Vec3[] };

export const POINT_COUNT = 720;

/** Flat shapes sway gently instead of spinning, so they never turn edge-on. */
export const FLAT_SHAPES: ReadonlySet<ShapeName> = new Set(["browser", "shield"]);

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

/** An arc in the XY plane (at depth z), as short segments. */
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

/** A horizontal ring (XZ plane) at height y. */
function ring(y: number, rx: number, rz: number, steps = 40): Segment[] {
  return arc([0, 0, 0], 1, 0, Math.PI * 2, 0, steps).map(([a, b]): Segment => [
    [a[0] * rx, y, a[1] * rz],
    [b[0] * rx, y, b[1] * rz],
  ]);
}

// ---------------------------------------------------------------- Geometry

type Geometry = {
  wire: Wireframe;
  /** Dark-mode dots: how many cluster round the nodes, and how tightly. */
  nodePoints: number;
  nodeRadius: number;
  jitter: number;
  /** A custom point cloud, when the dots shouldn't just follow the edges. */
  points?: (rand: () => number) => Vec3[];
};

/** API & GraphQL: a node graph on a sphere, wired to a hub. */
function graph(): Geometry {
  const nodes: Vec3[] = [];
  const n = 11;
  for (let i = 0; i < n; i++) {
    const y = 1 - (i / (n - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const theta = i * 2.39996;
    nodes.push([Math.cos(theta) * r * 0.85, y * 0.85, Math.sin(theta) * r * 0.85]);
  }
  const hub: Vec3 = [0, 0, 0];
  const segments: Segment[] = nodes.map((node) => [hub, node]);
  nodes.forEach((a, i) => {
    const nearest = nodes
      .map((b, j) => ({ j, d: dist(a, b) }))
      .filter(({ j }) => j !== i)
      .sort((p, q) => p.d - q.d)
      .slice(0, 2);
    nearest.forEach(({ j }) => j > i && segments.push([a, nodes[j]]));
  });
  return { wire: { segments, nodes: [...nodes, hub] }, nodePoints: 260, nodeRadius: 0.07, jitter: 0.012 };
}

/** Web apps: a browser window with a title bar and lines of content. */
function browser(): Geometry {
  const w = 1.7;
  const h = 1.15;
  const top = h / 2;
  const left = -w / 2;
  const segments: Segment[] = [
    [[left, top, 0], [-left, top, 0]],
    [[left, -top, 0], [-left, -top, 0]],
    [[left, top, 0], [left, -top, 0]],
    [[-left, top, 0], [-left, -top, 0]],
    [[left, top - 0.2, 0], [-left, top - 0.2, 0]],
    // Address bar
    [[left + 0.42, top - 0.1, 0], [-left - 0.12, top - 0.1, 0]],
    // Lines of content
    ...[0.12, -0.04, -0.2, -0.36].map((y, i): Segment => [
      [left + 0.14, y, 0.02],
      [left + 0.14 + (i % 2 ? 0.9 : 1.3), y, 0.02],
    ]),
  ];
  const nodes: Vec3[] = [
    [left + 0.1, top - 0.1, 0],
    [left + 0.18, top - 0.1, 0],
    [left + 0.26, top - 0.1, 0],
  ];
  return { wire: { segments, nodes }, nodePoints: 36, nodeRadius: 0.025, jitter: 0.01 };
}

/** Cloud & infra: three stacked server units with status LEDs. */
function servers(): Geometry {
  const levels = [0.48, 0, -0.48];
  return {
    wire: {
      segments: levels.flatMap((y) => boxEdges([0, y, 0], 1.5, 0.36, 0.8)),
      nodes: levels.flatMap((y): Vec3[] => [
        [0.5, y, 0.4],
        [0.6, y, 0.4],
      ]),
    },
    nodePoints: 84,
    nodeRadius: 0.03,
    jitter: 0.01,
  };
}

/** Secrets: a padlock - box body, arched shackle and a keyhole. */
function padlock(): Geometry {
  const segments: Segment[] = [
    ...boxEdges([0, -0.3, 0], 1.1, 0.8, 0.36),
    ...[-0.08, 0.08].flatMap((z) => arc([0, 0.1, 0], 0.36, 0, Math.PI, z)),
    [[-0.36, 0.1, -0.08], [-0.36, 0.1, 0.08]],
    [[0.36, 0.1, -0.08], [0.36, 0.1, 0.08]],
    // Keyhole slot
    [[0, -0.28, 0.19], [0, -0.48, 0.19]],
  ];
  return { wire: { segments, nodes: [[0, -0.24, 0.19]] }, nodePoints: 50, nodeRadius: 0.06, jitter: 0.012 };
}

/** WAF: a shield (front and back faces) with a check mark. */
function shield(): Geometry {
  // Outline from the top centre, round the right side down to the tip.
  const half: [number, number][] = [];
  for (let i = 0; i <= 12; i++) {
    const t = i / 12;
    if (t < 0.25) half.push([t * 4 * 0.66, 0.78 + Math.sin(t * 4 * Math.PI) * 0.03 - (1 - t * 4) * 0.06]);
    else if (t < 0.5) half.push([0.66, 0.78 - ((t - 0.25) / 0.25) * 0.6]);
    else {
      const u = (t - 0.5) / 0.5;
      half.push([0.66 * Math.cos((u * Math.PI) / 2), 0.18 - Math.sin((u * Math.PI) / 2) * 1.0]);
    }
  }
  const outline = [...half.map(([x, y]): [number, number] => [-x, y]).reverse(), ...half.slice(1)];
  const segments: Segment[] = [];
  for (const [z, scale] of [[0.09, 1], [-0.09, 1], [0.1, 0.78]] as const) {
    for (let i = 0; i < outline.length - 1; i++) {
      const [ax, ay] = outline[i];
      const [bx, by] = outline[i + 1];
      segments.push([[ax * scale, ay * scale, z], [bx * scale, by * scale, z]]);
    }
  }
  const check: Segment[] = [
    [[-0.34, 0.06, 0.12], [-0.08, -0.24, 0.12]],
    [[-0.08, -0.24, 0.12], [0.38, 0.36, 0.12]],
  ];
  return {
    wire: { segments: [...segments, ...check], nodes: [[-0.08, -0.24, 0.12]] },
    nodePoints: 0,
    nodeRadius: 0,
    jitter: 0.012,
    points: (rand) => [
      ...sampleSegments(check, 220, rand, 0.04),
      ...sampleSegments(segments, POINT_COUNT - 220, rand, 0.012),
    ],
  };
}

/** Deepfake detection: a scanned head - latitude/longitude mesh plus a scan ring. */
function face(): Geometry {
  // Head radius at height y (narrower towards the chin).
  const radius = (y: number) => {
    const r = Math.sqrt(Math.max(0, 1 - (y / 0.88) ** 2));
    return { rx: r * 0.6 * (y < 0 ? 1 + (y / 0.88) * 0.25 : 1), rz: r * 0.62 * (y < 0 ? 1 + (y / 0.88) * 0.25 : 1) };
  };
  const latitudes = [-0.66, -0.44, -0.22, 0, 0.22, 0.44, 0.66].flatMap((y) => {
    const { rx, rz } = radius(y);
    return ring(y, rx, rz, 36);
  });
  const meridians: Segment[] = [];
  for (let m = 0; m < 10; m++) {
    const theta = (m / 10) * Math.PI;
    for (let k = 0; k < 24; k++) {
      // Each meridian is a full loop over the head: down one side, up the other.
      const point = (step: number): Vec3 => {
        const phi = (step / 24) * Math.PI * 2;
        const y = 0.88 * Math.cos(phi);
        const side = Math.sin(phi) >= 0 ? 1 : -1;
        const { rx, rz } = radius(y);
        return [Math.cos(theta) * rx * side, y, Math.sin(theta) * rz * side];
      };
      meridians.push([point(k), point(k + 1)]);
    }
  }
  const scan = ring(0.08, 0.82, 0.82, 48);
  return {
    wire: { segments: [...latitudes, ...meridians, ...scan], nodes: [] },
    nodePoints: 0,
    nodeRadius: 0,
    jitter: 0.01,
    points: (rand) => {
      const surface: Vec3[] = [];
      const n = 560;
      for (let i = 0; i < n; i++) {
        const y = 1 - (i / (n - 1)) * 2;
        const r = Math.sqrt(1 - y * y);
        const theta = i * 2.39996;
        const taper = y < 0 ? 1 + y * 0.25 : 1;
        surface.push([Math.cos(theta) * r * 0.6 * taper, y * 0.88, Math.sin(theta) * r * 0.62 * taper]);
      }
      return [...surface, ...sampleSegments(scan, POINT_COUNT - n, rand, 0.01)];
    },
  };
}

const GEOMETRY: Record<ShapeName, () => Geometry> = { graph, browser, servers, padlock, shield, face };

const geometryCache = new Map<ShapeName, Geometry>();
const pointCache = new Map<ShapeName, Vec3[]>();

function geometry(name: ShapeName) {
  if (!geometryCache.has(name)) geometryCache.set(name, GEOMETRY[name]());
  return geometryCache.get(name)!;
}

/** The dark-mode point cloud: exactly POINT_COUNT points. */
export function getShape(name: ShapeName): Vec3[] {
  if (!pointCache.has(name)) {
    const g = geometry(name);
    const rand = rng(name.length * 7919 + 17);
    const points = g.points
      ? g.points(rand)
      : [
          ...clusters(g.wire.nodes, g.nodePoints, g.nodeRadius, rand),
          ...sampleSegments(g.wire.segments, POINT_COUNT - g.nodePoints, rand, g.jitter),
        ];
    pointCache.set(name, points);
  }
  return pointCache.get(name)!;
}

/** The light-mode line drawing. */
export function getWireframe(name: ShapeName): Wireframe {
  return geometry(name).wire;
}
