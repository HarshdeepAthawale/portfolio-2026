export type ExperienceItem = {
  company: string;
  logo: string;
  role: string;
  periodShort: string;
  periodLong: string;
  locationShort: string;
  locationLong: string;
  working?: boolean;
  details?: string[];
  tech?: string[];
};

export const experience: ExperienceItem[] = [
  {
    company: "Iris Intelligence",
    logo: "/assets/experience/irisintelligence.jpg",
    role: "Security Engineer",
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
  {
    company: "HackerOne",
    logo: "/assets/experience/hackerone.jpg",
    role: "Security Researcher",
    periodShort: "Dec 25 - Mar 26",
    periodLong: "December 2025 - March 2026",
    locationShort: "San Francisco, CA (Remote)",
    locationLong: "San Francisco, CA (Remote)",
    details: [
      "Submitted 35+ vulnerability reports to global programs including Goldman Sachs, Flipkart, Adobe, Netflix, Red Bull, NVIDIA, Anduril, Coca-Cola, and Superdrug - headlined by a Critical (CVSS 9.1) GraphQL flaw at Red Bull exposing employee PII, and an unauthenticated API exposing 892 employees' PII with write access to a production database.",
      "Found high-impact infra and supply-chain bugs: remote code execution in a build pipeline, a subdomain takeover at Anduril, and exposed source maps leaking OAuth secrets at Flipkart/Myntra.",
      "Discovered hardcoded OAuth secrets leaking NHS medical data and an appointment IDOR at Superdrug - preventing potential patient-data breaches.",
    ],
    tech: ["Burp Suite", "GraphQL", "IDOR", "Subdomain Takeover", "CVSS 3.1"],
  },
];
