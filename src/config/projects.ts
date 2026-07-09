export type Project = {
  slug: string;
  title: string;
  date: string;
  description: string;
  tech: string[];
  href: string;
  website?: string;
  featured?: boolean;
  /** Optional cover image for project cards */
  cover?: string;
  gradient: string;
};

export const projects: Project[] = [
  {
    slug: "ai-waf-pipeline",
    title: "Transformer-Based AI WAF",
    date: "02.2026",
    description:
      "A reverse-proxy AI WAF pairing DistilBERT request inspection with Redis rate limiting, DDoS detection, and bot scoring — outperforming ModSecurity OWASP CRS v4 (96% vs 46%) on 675 real-world payloads. Fine-tuned across 10 web attack classes for 97.5% detection on Path Traversal, XXE, SSRF, and LDAP/XPath injection, with inference cut 8× (46ms → 6ms p50) via ONNX Runtime and served as a multi-tenant FastAPI service with monitor, block, and challenge modes.",
    tech: ["PyTorch", "DistilBERT", "ONNX", "FastAPI", "Next.js", "Docker", "Redis", "Nginx"],
    href: "https://github.com/HarshdeepAthawale",
    featured: true,
    cover: "/assets/projects/ai-waf.jpg",
    gradient: "from-blue-500/25 via-indigo-500/15 to-violet-500/25",
  },
  {
    slug: "deepfake-detection",
    title: "Deepfake Detection System",
    date: "03.2026",
    description:
      "Full-stack AI platform with a 4-agent orchestration system (Perception, Detection, Compression, Cognitive) for deepfake media analysis. ResNet50/EfficientNet models trained on FaceForensics++ (16GB, 7000+ samples) for high-accuracy detection of AI-generated content.",
    tech: ["Next.js", "React", "TypeScript", "Node.js", "MongoDB", "FFmpeg"],
    href: "https://github.com/HarshdeepAthawale",
    featured: true,
    cover: "/assets/projects/deepfake.jpg",
    gradient: "from-fuchsia-500/25 via-purple-500/15 to-violet-500/25",
  },
];
