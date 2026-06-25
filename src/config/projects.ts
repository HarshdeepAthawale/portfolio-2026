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
      "An AI-driven web application firewall using Transformer-based anomaly detection (DistilBERT) trained on benign traffic — signature- and rule-agnostic, detecting zero-day patterns in real time. Production pipeline with Redis-backed rate limiting, DDoS mitigation, and a multi-tenant Next.js dashboard.",
    tech: ["PyTorch", "DistilBERT", "FastAPI", "Next.js", "Docker", "Redis", "Nginx"],
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
  {
    slug: "scada-ics-topology",
    title: "Secure SCADA/ICS Topology",
    date: "01.2026",
    description:
      "Secure, non-intrusive topology discovery for industrial control networks, aligned with the Purdue Model (Levels 0–5) and NIST. Eliminated insecure protocols (CDP/LLDP) in favour of authenticated telemetry (SNMPv3, NetFlow, Syslog) for real-time OT visibility.",
    tech: ["AWS", "PostgreSQL", "Grafana", "MQTT"],
    href: "https://github.com/HarshdeepAthawale",
    featured: true,
    cover: "/assets/projects/scada-ics.jpg",
    gradient: "from-emerald-500/25 via-teal-500/15 to-cyan-500/25",
  },
];
