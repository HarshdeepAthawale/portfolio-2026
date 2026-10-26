/** Screen content; shared biography, experience, and project data stay in their existing files. */
export const skillCategories = [
  { title: "Languages", icon: "diamond-sword.png", items: ["Python", "C", "C++", "Bash", "TypeScript", "SQL"] },
  { title: "Security & Research", icon: "diamond-pickaxe.png", items: ["Burp Suite", "Wireshark", "Metasploit", "Kali Linux", "Frida", "MobSF", "GraphQL Security", "API Security", "OWASP Top 10", "MITRE ATT&CK"] },
  { title: "AI & Development", icon: "diamond-shovel.png", items: ["PyTorch", "DistilBERT", "ResNet50", "EfficientNet", "FastAPI", "Next.js", "React", "Node.js", "FFmpeg"] },
  { title: "Tools & Infra", icon: "diamond-axe.png", items: ["Docker", "Linux", "Git", "GitHub", "PostgreSQL", "MongoDB", "Redis", "Nginx", "Cloudflare"] },
];

export const currentInventory = [
  { label: "Hunting", value: "Critical bugs in real systems", note: "35+ vulnerability reports across Red Bull, Netflix, Adobe, NVIDIA, and more. Clear reproduction, real impact, and remediation that holds.", icon: "images/skills/diamond-sword.png", tooltip: "Diamond Sword", motion: "orb", duration: "2.4s", iconScale: .8 },
  { label: "Building", value: "AI-powered defenses", note: "A transformer-based WAF that detects 96% of real-world attack payloads, and a four-agent deepfake detection system.", icon: "images/skills/enchant-book.png", tooltip: "Enchantment Book", motion: "orb", duration: "2.4s", iconScale: .82 },
  { label: "Learning", value: "Top 1% on TryHackMe", note: "230+ hands-on labs and a 300+ day learning streak. Consistency over intensity.", icon: "images/experience-orb.png", tooltip: "Experience Orb", motion: "bob", duration: "2.7s", iconScale: .8 },
  { label: "Off the clock", value: "Mr. Robot & Suits", note: "A couple of favorites from my watchlist. Also a fan of The Social Network, Anandi Gopal, and Natsamrat.", icon: "images/items/music-disc.png", tooltip: "Music Disc", motion: "bob", duration: "2.9s", iconScale: .84 },
];

/** Programs named in the bio, shown as the About page's bug bounty chest. */
export const bountyPrograms = [["Red Bull", "redbull.png"], ["Goldman Sachs", "goldman-sachs.png"], ["Adobe", "adobe.png"], ["Netflix", "netflix.png"], ["NVIDIA", "nvidia.png"], ["Anduril", "anduril.png"], ["Flipkart", "flipkart.png"], ["Coca-Cola", "coca-cola.svg"]] as const;
