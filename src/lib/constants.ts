export const APP_NAME = "Votewise";
export const APP_DESCRIPTION =
  "Secure, transparent election management platform for organizations";
export const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
export const APP_DOMAIN =
  process.env.NEXT_PUBLIC_APP_DOMAIN ?? "votewise.com.ng";

export const ELECTION_STATUS_FLOW = [
  "DRAFT",
  "CONFIGURATION",
  "VOTER_IMPORT",
  "CANDIDATE_SETUP",
  "VERIFICATION",
  "READY",
  "SCHEDULED",
  "LIVE",
  "PAUSED",
  "CLOSED",
  "RESULTS_REVIEW",
  "PUBLISHED",
  "ARCHIVED",
] as const;

export type ElectionStatusType = (typeof ELECTION_STATUS_FLOW)[number];

export const VALID_STATUS_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ["CONFIGURATION"],
  CONFIGURATION: ["VOTER_IMPORT", "DRAFT"],
  VOTER_IMPORT: ["CANDIDATE_SETUP", "CONFIGURATION"],
  CANDIDATE_SETUP: ["VERIFICATION", "VOTER_IMPORT"],
  VERIFICATION: ["READY", "CANDIDATE_SETUP"],
  READY: ["SCHEDULED", "VERIFICATION"],
  SCHEDULED: ["LIVE", "READY", "PAUSED"],
  LIVE: ["PAUSED", "CLOSED"],
  PAUSED: ["LIVE", "CLOSED"],
  CLOSED: ["RESULTS_REVIEW"],
  RESULTS_REVIEW: ["PUBLISHED", "CLOSED"],
  PUBLISHED: ["ARCHIVED"],
  ARCHIVED: [],
};

export const MAX_OTP_ATTEMPTS = 5;
export const OTP_EXPIRY_MINUTES = 10;
export const OTP_LENGTH = 6;

export const MAX_FILE_SIZE_MB = 10;
export const ALLOWED_IMPORT_EXTENSIONS = [".xlsx", ".xls", ".csv"];

export const RATE_LIMIT = {
  AUTH: { windowMs: 15 * 60 * 1000, max: 10 },
  OTP: { windowMs: 60 * 1000, max: 3 },
  VOTE: { windowMs: 60 * 1000, max: 5 },
  API: { windowMs: 60 * 1000, max: 100 },
} as const;

export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
} as const;

export const ROLES = {
  PLATFORM_ADMIN: "PLATFORM_ADMIN",
  ORG_OWNER: "ORG_OWNER",
  ORG_ADMIN: "ORG_ADMIN",
  ELECTION_MANAGER: "ELECTION_MANAGER",
  ELECTION_OFFICER: "ELECTION_OFFICER",
  OBSERVER: "OBSERVER",
  AUDITOR: "AUDITOR",
  VOTER: "VOTER",
} as const;

export const SUBSCRIPTION_PLANS = [
  {
    id: "FREE",
    name: "Free",
    price: 0,
    description: "For small organizations testing the waters",
    maxVoters: 100,
    maxElections: 1,
    features: [
      "Up to 100 voters",
      "1 active election",
      "Email verification",
      "Basic results",
      "Community support",
    ],
  },
  {
    id: "STARTER",
    name: "Starter",
    price: 25000,
    description: "For departments and small faculties",
    maxVoters: 1000,
    maxElections: 5,
    features: [
      "Up to 1,000 voters",
      "5 active elections",
      "Email + SMS verification",
      "Real-time monitoring",
      "Audit logs",
      "Email support",
    ],
  },
  {
    id: "PROFESSIONAL",
    name: "Professional",
    price: 150000,
    description: "For universities and large associations",
    maxVoters: 10000,
    maxElections: 25,
    features: [
      "Up to 10,000 voters",
      "25 active elections",
      "All verification channels",
      "Advanced analytics",
      "Observers & audit access",
      "Priority support",
    ],
  },
  {
    id: "ENTERPRISE",
    name: "Enterprise",
    price: -1,
    description: "For large institutions & government",
    maxVoters: -1,
    maxElections: -1,
    features: [
      "Unlimited voters",
      "Unlimited elections",
      "Custom domains",
      "Dedicated infrastructure",
      "SLA & onboarding",
      "Dedicated account manager",
    ],
  },
] as const;

export const PRICING_CONFIG = {
  standardRate: 400,
  bulkThreshold: 2000,
  bulkRate: 300,
  currency: "NGN",
} as const;
