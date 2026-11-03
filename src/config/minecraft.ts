/** Screen content; shared biography, experience, and project data stay in their existing files. */
export const skillCategories = [
  { title: "Languages & CS", icon: "diamond-sword.png", items: ["Python", "Bash", "C++", "DSA", "OOP", "DBMS", "Operating Systems", "Computer Networks"] },
  { title: "Security Tools", icon: "diamond-pickaxe.png", items: ["Burp Suite", "Nmap", "Metasploit", "OWASP ZAP", "sqlmap", "Nuclei", "MobSF", "Frida", "JADX", "Wireshark"] },
  { title: "Frameworks & Methods", icon: "diamond-shovel.png", items: ["MITRE ATT&CK", "Cyber Kill Chain", "OWASP Top 10"] },
  { title: "Infra & Networking", icon: "diamond-axe.png", items: ["Docker", "CI/CD", "Linux", "Git", "PostgreSQL", "TCP/IP", "DNS", "DHCP", "Firewalls", "IDS/IPS"] },
];

export const currentInventory = [
  { label: "Hunting", value: "Critical bugs in real systems", note: "35+ vulnerability reports across Red Bull, Netflix, Adobe, NVIDIA, and more. Clear reproduction, real impact, and remediation that holds.", icon: "images/skills/diamond-sword.png", tooltip: "Diamond Sword", motion: "orb", duration: "2.4s", iconScale: .8 },
  { label: "Building", value: "AI-powered defenses", note: "A transformer-based WAF that detects 96% of real-world attack payloads, against 46% for ModSecurity with OWASP CRS v4.", icon: "images/skills/enchant-book.png", tooltip: "Enchantment Book", motion: "orb", duration: "2.4s", iconScale: .82 },
  { label: "Learning", value: "Top 1% on TryHackMe", note: "230+ hands-on labs and a 300+ day learning streak. Consistency over intensity.", icon: "images/experience-orb.png", tooltip: "Experience Orb", motion: "bob", duration: "2.7s", iconScale: .8 },
  { label: "Off the clock", value: "Mr. Robot & Suits", note: "A couple of favorites from my watchlist. Also a fan of The Social Network, Anandi Gopal, and Natsamrat.", icon: "images/items/music-disc.png", tooltip: "Music Disc", motion: "bob", duration: "2.9s", iconScale: .84 },
];

/** Programs named in the bio, shown as the About page's bug bounty chest. */
export const bountyPrograms = [["Red Bull", "redbull.png"], ["Goldman Sachs", "goldman-sachs.png"], ["Adobe", "adobe.png"], ["Netflix", "netflix.png"], ["NVIDIA", "nvidia.png"], ["Anduril", "anduril.png"], ["Flipkart", "flipkart.png"], ["Coca-Cola", "coca-cola.svg"]] as const;
