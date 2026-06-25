import { heroConfig } from "@/config/hero";

export const aboutConfig = {
  headline: ["From curious tinkering", "to breaking real systems."],
  intro:
    "I'm Harshdeep Athawale — a **security engineer** and **offensive security researcher**. I find and report critical vulnerabilities across **web, API, and mobile** targets, and I care about the full picture: clear **reproduction**, real **impact**, and remediation that actually holds.",
  quote:
    "The best security work is reproducible, honestly scoped, and written so the defender can fix it the same day.",
  traits: ["Curious", "Relentless", "Methodical", "Ethical"] as const,
  traitStyles: {
    Curious:
      "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-800/80 dark:bg-sky-950/40 dark:text-sky-300",
    Relentless:
      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/80 dark:bg-emerald-950/40 dark:text-emerald-300",
    Methodical:
      "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800/80 dark:bg-amber-950/40 dark:text-amber-300",
    Ethical:
      "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-800/80 dark:bg-violet-950/40 dark:text-violet-300",
  },
  meta: [
    { label: "Location", value: heroConfig.location },
    { label: "Status", value: "Open to security roles" },
    { label: "Focus", value: "AppSec · Bug Bounty · Mobile" },
  ],
  story: {
    title: "How it started",
    paragraphs: [
      "It started with a simple question that wouldn't leave me alone: how does software actually **break**? I'd pull apart apps just to see what assumptions they made — and which ones I could violate. That **curiosity** pulled me straight into security.",
      "At **Thapar Institute**, coursework was only half the story. The other half was late nights on **TryHackMe** labs, reading disclosed reports, and learning to think like an attacker. The grind compounded — 230+ labs and a 300+ day streak into the **Top 1% worldwide**.",
      "**HackerOne** changed everything. Hunting real programs — Goldman Sachs, NASA, Flipkart, Red Bull — taught me that finding a bug is the easy part. **Proving impact**, writing a report a stranger can reproduce, and scoring it honestly is the craft. A **Critical CVSS 9.1** at Red Bull and an API leaking 892 employees' PII drove that home.",
      "Now I work across the offensive and defensive sides — **vulnerability research**, **Android security** at C3i Hub (IIT Kanpur), and **GRC** (SOC 2, ISO 27001) at Iris Intelligence. I'm still learning fast, and I'm doing it by **breaking things and writing it up**.",
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
      "I'm drawn to engineers who combine **deep technical depth** with **clear communication** — because in security, the report is the product.",
    ],
  },
  connectLinks: [
    {
      name: "Email",
      href: "mailto:harshdeepathawale27@gmail.com",
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
  ],
};
