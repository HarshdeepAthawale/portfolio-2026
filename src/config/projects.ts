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
  /** 2-letter monogram shown on the gradient tile */
  monogram?: string;
  gradient: string;
};

export const projects: Project[] = [
  {
    slug: "ai-waf-pipeline",
    title: "Transformer-Based WAF Pipeline",
    date: "02.2026",
    description:
      "A reverse-proxy WAF combining sliding-window rate limiting with transformer-based request inspection, benchmarked against ModSecurity with OWASP CRS v4 on 675 labeled real-world payloads for a 96% detection rate vs. 46%. Fine-tuned DistilBERT to detect 10 web attack classes - Path Traversal, SQLi, XSS, SSRF, and IDOR - at 97.5% accuracy, with OWASP Juice Shop, WebGoat, and DVWA deployed behind a Docker Compose reverse-proxy gateway enforcing per-IP rate limiting and monitor, block, and challenge modes before reaching the origin.",
    tech: ["PyTorch", "DistilBERT", "ONNX", "FastAPI", "Next.js", "Docker", "Redis", "Nginx"],
    href: "https://github.com/HarshdeepAthawale",
    featured: true,
    monogram: "AW",
    cover: "/assets/projects/ai-waf-cover.png",
    gradient: "from-[#0f1015] via-[#332c63] to-[#8574c0]",
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
    monogram: "DD",
    cover: "/assets/projects/deepfake-cover.png",
    gradient: "from-[#0f1015] via-[#173a3c] to-[#4fa39c]",
  },
];
