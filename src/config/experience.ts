export type ExperiencePhoto = { src: string; alt: string };

/** One position within a company, for multi-role entries (like LinkedIn). */
export type ExperienceRole = {
  title: string;
  periodShort: string;
  periodLong: string;
  working?: boolean;
  details?: string[];
  photos?: ExperiencePhoto[];
};

export type ExperienceItem = {
  company: string;
  logo: string;
  /** Single-role entries. Multi-role entries use `roles` instead. */
  role?: string;
  employmentType?: string;
  periodShort: string;
  periodLong: string;
  locationShort: string;
  locationLong: string;
  working?: boolean;
  details?: string[];
  tech?: string[];
  /** Photos shown in the expanded details (open in the lightbox). */
  photos?: ExperiencePhoto[];
  /** Positions held at this company, newest first. */
  roles?: ExperienceRole[];
};

export const experience: ExperienceItem[] = [
  {
    company: "HackerOne",
    logo: "/assets/experience/hackerone.jpg",
    role: "Security Researcher",
    employmentType: "Part-time",
    periodShort: "Dec 25 - Present",
    periodLong: "December 2025 - Present",
    locationShort: "San Francisco, CA (Remote)",
    locationLong: "San Francisco, CA (Remote)",
    working: true,
    details: [
      "Submitted 35+ vulnerability reports to global programs including Goldman Sachs, Flipkart, Adobe, Netflix, Red Bull, NVIDIA, Anduril, Coca-Cola, and Superdrug - headlined by a Critical (CVSS 9.1) GraphQL flaw at Red Bull exposing employee PII, and an unauthenticated API exposing 892 employees' PII with write access to a production database.",
      "Found high-impact infra and supply-chain bugs: remote code execution in a build pipeline, a subdomain takeover at Anduril, and exposed source maps leaking OAuth secrets at Flipkart/Myntra.",
      "Discovered hardcoded OAuth secrets leaking NHS medical data and an appointment IDOR at Superdrug - preventing potential patient-data breaches.",
    ],
    tech: ["Burp Suite", "GraphQL", "IDOR", "Subdomain Takeover", "CVSS 3.1"],
  },
  {
    company: "Google Developer Groups TIET",
    logo: "/assets/experience/gdg-tiet.png",
    employmentType: "Full-time",
    periodShort: "Jul 25 - Present",
    periodLong: "July 2025 - Present",
    locationShort: "Patiala, IN (On-site)",
    locationLong: "Patiala, India (On-site)",
    working: true,
    roles: [
      {
        title: "Head of Cyber Security",
        periodShort: "Aug 26 - Present",
        periodLong: "August 2026 - Present",
        working: true,
        details: [
          "Leading the club's security work - building security projects with core members, alongside bug bounty hunting and security research.",
        ],
        photos: [
          { src: "/assets/experience/gdg-tiet-team.jpg", alt: "The GDG TIET team at the 'Welcome to the family' induction" },
        ],
      },
      {
        title: "Core Member",
        periodShort: "Jul 25 - Aug 26",
        periodLong: "July 2025 - August 2026",
        details: [
          "Delivered a 2-hour cybersecurity workshop at DevFest 2025, covering core security concepts through live demonstrations for 160+ attendees.",
        ],
        photos: [
          { src: "/assets/experience/gdg-tiet-speaking.jpg", alt: "Presenting the DevFest 2025 cybersecurity workshop" },
          { src: "/assets/experience/gdg-tiet-workshop.jpg", alt: "Attendees following along in the DevFest 2025 cybersecurity workshop" },
          { src: "/assets/experience/gdg-tiet-devfest.jpg", alt: "1st-year orientation 2025 with the GDG at Thapar team" },
        ],
      },
    ],
  },
  {
    company: "Iris Intelligence",
    logo: "/assets/experience/irisintelligence.jpg",
    role: "Security Engineer",
    employmentType: "Internship",
    periodShort: "Apr 26 - Jun 26",
    periodLong: "April 2026 - June 2026",
    locationShort: "Delhi, IN (Hybrid)",
    locationLong: "Delhi, India (Hybrid)",
    details: [
      "Performed vulnerability assessments across REST APIs, authentication flows, and a sandboxed code-execution layer - surfacing broken access control, injection, and cross-tenant data-leakage gaps and driving remediation before launch.",
      "Secured an agentic AI platform - sandboxed untrusted code execution and runtime isolation that stopped cross-tenant leakage and kept workloads secure at 5K+ concurrent users.",
      "Authored SOC 2 and ISO 27001 compliance documentation with privacy-by-design controls (data classification, encryption, retention), establishing the company's GRC baseline.",
    ],
    tech: ["API Security", "SOC 2", "ISO 27001", "RLS", "Threat Modeling"],
  },
];
