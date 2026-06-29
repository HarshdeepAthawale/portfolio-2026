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
    periodShort: "Mar 26 – Apr 26",
    periodLong: "March 2026 – April 2026",
    locationShort: "Delhi, IN (Hybrid)",
    locationLong: "Delhi, India (Hybrid)",
    details: [
      "Performed vulnerability assessments across REST APIs, authentication flows, and a sandboxed code-execution layer — surfacing broken access control, injection, and cross-tenant data-leakage gaps and driving remediation before launch.",
      "Authored SOC 2 and ISO 27001 compliance documentation with privacy-by-design controls — data classification, encryption, retention, and Row-Level Security — establishing the company's GRC baseline.",
      "Hardened request rate limiting and agent runtime restrictions to keep workloads isolated and abuse-resistant as the platform securely scaled to 5K+ concurrent users.",
    ],
    tech: ["API Security", "SOC 2", "ISO 27001", "RLS", "Threat Modeling"],
  },
  {
    company: "HackerOne",
    logo: "/assets/experience/hackerone.jpg",
    role: "Security Researcher",
    periodShort: "Dec 25 – Mar 26",
    periodLong: "December 2025 – March 2026",
    locationShort: "San Francisco, CA (Remote)",
    locationLong: "San Francisco, CA (Remote)",
    details: [
      "Submitted 35+ vulnerability reports to global programs including Goldman Sachs, Flipkart, Adobe, Netflix, Red Bull, NVIDIA, Anduril, Coca-Cola, and Superdrug — headlined by a Critical (CVSS 9.1) GraphQL flaw at Red Bull exposing employee PII, and an unauthenticated API exposing 892 employees' PII with write access to a production database.",
      "Identified infrastructure and supply-chain risks: an unauthenticated Artifactory access chain combined with npm dependency confusion for build-pipeline RCE, a dangling-CNAME subdomain takeover at Anduril, and exposed source maps leaking OAuth credentials and 149 microservice definitions at Flipkart/Myntra.",
      "Surfaced sensitive-data exposures: hardcoded OAuth secrets leaking NHS medical data and a cross-organization appointment IDOR at Superdrug, plus PingFederate metrics mapping internal network topology at Goldman Sachs — each documented in a CVSS 3.1-scored, reproducible report.",
    ],
    tech: ["Burp Suite", "GraphQL", "IDOR", "Subdomain Takeover", "CVSS 3.1"],
  },
];
