import { heroConfig } from "@/config/hero";

export const aboutConfig = {
  headline: ["From curious tinkering", "to breaking real systems."],
  intro:
    "I'm Harshdeep Athawale, a **security researcher/engineer** who builds software and breaks it. **35+ vulnerability reports** across Red Bull, Goldman Sachs, Adobe, Netflix, NVIDIA, Anduril, Flipkart, and Coca-Cola - and the defenses I build come straight from what breaking them taught me. I care about the full picture: clear **reproduction**, real **impact**, and remediation that holds.",
  quote:
    "The best security work is reproducible, honestly scoped, and written so the defender can fix it the same day.",
  portrait: {
    src: "/assets/portrait.jpg",
    alt: "Harshdeep Athawale",
    caption: heroConfig.location,
  },
  traits: ["Curious", "Relentless", "Methodical", "Ethical"] as const,
  traitStyles: {
    // Warm, cohesive earthy palette: honey → terracotta → taupe → dusty rose.
    Curious:
      "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300",
    Relentless:
      "border-orange-200 bg-orange-50 text-orange-800 dark:border-orange-900/50 dark:bg-orange-950/40 dark:text-orange-300",
    Methodical:
      "border-stone-300 bg-stone-100 text-stone-700 dark:border-stone-700 dark:bg-stone-900/60 dark:text-stone-300",
    Ethical:
      "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300",
  },
  meta: [
    { label: "Location", value: heroConfig.location },
    { label: "Education", value: "3rd year CS · TIET" },
    { label: "Status", value: "Security Intern · Fall 2026" },
    { label: "Focus", value: "AppSec · Bug Bounty · GRC" },
  ],
  story: {
    title: "How it started",
    paragraphs: [
      "It started with a simple question that wouldn't leave me alone: how does software actually **break**? I'd pull apart apps just to see what assumptions they made - and which ones I could violate. That **curiosity** pulled me straight into security.",
      "At **TIET**, coursework was only half the story. The other half was late nights on **TryHackMe** labs, reading disclosed reports, and learning to think like an attacker. The grind compounded - 230+ labs and a 300+ day streak into the **Top 1% worldwide**.",
      "**Bug bounty** changed everything. Hunting real programs on **HackerOne** and **Intigriti** - Red Bull, Netflix, Adobe, NVIDIA, Anduril, Flipkart, Coca-Cola - taught me that finding a bug is the easy part. **Proving impact**, writing a report a stranger can reproduce, and scoring it honestly is the craft.",
      "Then I flipped it. **Finding the bugs is what taught me to build the defenses** - a transformer-based WAF, runtime isolation for an agentic AI platform, and the SOC 2 / ISO 27001 GRC baseline at **Iris Intelligence**. Along the way I **won 1st place at Nio Hack** (NioGraph, American Society - 120+ teams) and placed **1st runner-up at the PSB Hackathon Series 2026** (Govt. of India, 227 teams), and I'm still learning fast by breaking things and writing it up.",
    ],
  },
  findings: {
    title: "Selected findings",
    items: [
      {
        org: "Red Bull",
        severity: "CVSS 9.1",
        tier: "critical",
        text: "Critical GraphQL flaw exposing employee PII.",
      },
      {
        org: "Netflix",
        severity: "CVSS 8.6",
        tier: "high",
        text: "Auth bypass on the Law Enforcement Portal - government emails auto-approved without review, and consumer domains could register too.",
      },
      {
        org: "Coca-Cola",
        severity: "Unauth API",
        tier: "neutral",
        text: "Unauthenticated API leaking PII for 892 employees, with write access to a production database.",
      },
      {
        org: "NHS · Superdrug",
        severity: "Secrets · IDOR",
        tier: "neutral",
        text: "Hardcoded OAuth secrets exposing medical data, and an appointment IDOR - both caught before patient data could be breached.",
      },
      {
        org: "Anduril · NVIDIA",
        severity: "Takeover",
        tier: "neutral",
        text: "A subdomain takeover, and dangling DNS records silently serving gambling content to real users.",
      },
      {
        org: "Flipkart · Myntra",
        severity: "RCE",
        tier: "neutral",
        text: "Remote code execution in a build pipeline, and exposed source maps leaking OAuth secrets.",
      },
    ],
  },
  built: {
    title: "What I've built",
    items: [
      {
        title: "Transformer-based WAF",
        text: "Catches 96% of real-world attack payloads across 10 attack classes - versus 46% for ModSecurity with OWASP CRS v4.",
      },
      {
        title: "Agentic AI platform security",
        text: "Sandboxed untrusted code execution and runtime isolation that stopped cross-tenant leakage at 5,000+ concurrent users.",
      },
      {
        title: "GRC baseline",
        text: "SOC 2 and ISO 27001 compliance documentation with privacy-by-design controls, establishing the company's GRC foundation.",
      },
    ],
  },
  principles: {
    title: "How I work",
    items: [
      {
        title: "Impact over noise",
        description:
          "A finding only matters if it has real, demonstrable impact. I prove exploitability before I ever write the word 'critical'.",
      },
      {
        title: "Reproducible or it didn't happen",
        description:
          "Every report ships with clear steps, a working PoC, and a CVSS score the triager can verify in minutes.",
      },
      {
        title: "Map the whole chain",
        description:
          "Single bugs are fine; chains are where it gets interesting. IDOR to ATO, source-map leak to OAuth theft, dep-confusion to RCE.",
      },
      {
        title: "Stay ethical",
        description:
          "Scope is sacred. I only test what I'm authorized to, and I report to defenders before anyone else.",
      },
    ],
  },
  beyond: {
    title: "Beyond the bugs",
    paragraphs: [
      "Outside of hunting, you'll find me grinding **CTFs** and labs, reading disclosed reports, and reverse-engineering apps just to understand how they tick. I like **learning in public** and sharing what actually worked.",
      "I'm drawn to engineers who combine **deep technical depth** with **clear communication** - because in security, the report is the product.",
    ],
  },
  connectLinks: [
    {
      name: "Email",
      href: "mailto:athawaleharshdeep@gmail.com",
      icon: "mail" as const,
    },
    {
      name: "LinkedIn",
      href: "https://www.linkedin.com/in/harshdeepathawale/",
      icon: "linkedin" as const,
    },
    {
      name: "GitHub",
      href: "https://github.com/HarshdeepAthawale",
      icon: "github" as const,
    },
    {
      name: "X",
      href: "https://x.com/harshdeep0x01",
      icon: "x" as const,
    },
  ],
};
