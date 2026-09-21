import { heroConfig } from "@/config/hero";

export const aboutConfig = {
  headline: ["From curious tinkering", "to breaking real systems."],
  intro:
    "I'm Harshdeep Athawale, a **software security engineer**. I find and report critical vulnerabilities across **web and mobile** targets, and I care about the full picture: clear **reproduction**, real **impact**, and remediation that actually holds.",
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
    { label: "Status", value: "Open to security roles · Remote" },
    { label: "Focus", value: "AppSec · Bug Bounty · Mobile" },
  ],
  story: {
    title: "How it started",
    paragraphs: [
      "It started with a simple question that wouldn't leave me alone: how does software actually **break**? I'd pull apart apps just to see what assumptions they made - and which ones I could violate. That **curiosity** pulled me straight into security.",
      "At **Thapar Institute**, coursework was only half the story. The other half was late nights on **TryHackMe** labs, reading disclosed reports, and learning to think like an attacker. The grind compounded - 230+ labs and a 300+ day streak into the **Top 1% worldwide**.",
      "**Bug bounty** changed everything. Hunting real programs on **HackerOne** and **Intigriti** - Goldman Sachs, Flipkart, Coca-Cola, Red Bull - taught me that finding a bug is the easy part. **Proving impact**, writing a report a stranger can reproduce, and scoring it honestly is the craft. A **Critical CVSS 9.1** at Red Bull and an unauthenticated API leaking 892 employees' PII drove that home.",
      "Now I work across the offensive and defensive sides - **vulnerability research**, **mobile security**, and **GRC** (SOC 2, ISO 27001), most recently at **Iris Intelligence**. I'm still learning fast, and I'm doing it by **breaking things and writing it up**.",
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
