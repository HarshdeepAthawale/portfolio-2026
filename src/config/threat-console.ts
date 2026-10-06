import type { ShapeName } from "@/lib/particle-shapes";

/**
 * The home page "threat console": one card per attack surface, each backed by
 * a real finding. Keep every number sourced from reports or the resume.
 */
export type ConsoleDomain = {
  label: string;
  shape: ShapeName;
  /** The big figure on the findings card. */
  value: string;
  /** Optional small unit after the figure. */
  unit?: string;
  caption: string;
};

export const consoleDomains: ConsoleDomain[] = [
  {
    label: "API & GraphQL",
    shape: "graph",
    value: "9.1",
    unit: "CVSS",
    caption: "Critical GraphQL flaw exposing employee PII at Red Bull",
  },
  {
    label: "Web applications",
    shape: "browser",
    value: "892",
    caption: "Employee records behind an unauthenticated API with production write access at Coca-Cola",
  },
  {
    label: "Cloud & infrastructure",
    shape: "servers",
    value: "RCE",
    caption: "Remote code execution in a build pipeline, plus a subdomain takeover at Anduril",
  },
  {
    label: "Secrets & supply chain",
    shape: "padlock",
    value: "OAuth",
    caption: "Hardcoded secrets leaking NHS medical data, and source maps exposing keys at Flipkart/Myntra",
  },
];

/** The disclosure pipeline the progress bar walks through for each domain. */
export const pipelineStages = ["Recon", "Exploit", "Report", "Triaged"] as const;

export const consoleSummary = "35+ vulnerability reports";
