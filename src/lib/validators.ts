import { z } from "zod";

export const registerSchema = z
  .object({
    name: z.string().min(2, "Name is required").max(80),
    email: z.string().email("Enter a valid email"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Include at least one uppercase letter")
      .regex(/[0-9]/, "Include at least one number"),
    organizationName: z.string().min(2, "Organization name is required").max(120),
    preferredSubdomain: z
      .string()
      .min(2, "Subdomain must be at least 2 characters")
      .max(30, "Subdomain must be at most 30 characters")
      .regex(/^[a-z0-9-]+$/, "Use lowercase letters, numbers, and hyphens only")
      .optional()
      .or(z.literal("")),
    institutionType: z.enum([
      "UNIVERSITY",
      "STUDENT_UNION",
      "PROFESSIONAL_ASSOCIATION",
      "CHURCH",
      "COOPERATIVE",
      "NGO",
      "CORPORATE",
      "CLUB_SOCIETY",
      "GOVERNMENT",
      "OTHER",
    ]).default("UNIVERSITY"),
  });

export const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email("Enter a valid email"),
});

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Include at least one uppercase letter")
      .regex(/[0-9]/, "Include at least one number"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const electionSchema = z.object({
  name: z.string().min(3, "Election name is required").max(120),
  description: z.string().max(2000).optional().nullable(),
  type: z
    .enum([
      "GENERAL",
      "FACULTY",
      "DEPARTMENT",
      "EXECUTIVE",
      "CONFIDENCE",
      "BALLOT_MEASURE",
    ])
    .default("GENERAL"),
  startTime: z.string().optional().nullable(),
  endTime: z.string().optional().nullable(),
  timezone: z.string().default("Africa/Lagos"),
});

export const positionSchema = z.object({
  title: z.string().min(2, "Title is required").max(120),
  description: z.string().max(2000).optional().nullable(),
  maxChoices: z.number().int().min(1).max(5).default(1),
  order: z.number().int().default(0),
});

export const candidateSchema = z.object({
  name: z.string().min(2, "Candidate name is required").max(120),
  photo: z.string().url().optional().or(z.literal("")).nullable(),
  bio: z.string().max(2000).optional().nullable(),
  manifesto: z.string().max(5000).optional().nullable(),
  positionId: z.string().min(1),
});

export const voterVerifySchema = z.object({
  electionId: z.string().min(1),
  voterId: z.string().min(1),
  channel: z.enum(["EMAIL", "SMS", "WHATSAPP"]).optional(),
  code: z.string().optional(),
});

export const castVoteSchema = z.object({
  electionId: z.string().min(1),
  sessionId: z.string().min(1),
  votes: z
    .array(
      z.object({
        positionId: z.string().min(1),
        candidateId: z.string().min(1),
      })
    )
    .min(1, "Select at least one candidate"),
});

export const supportTicketSchema = z.object({
  subject: z.string().min(3).max(160),
  description: z.string().min(5).max(5000),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
});

export const supportMessageSchema = z.object({
  body: z.string().min(1).max(5000),
  isInternal: z.boolean().default(false),
});

export const negotiationRequestSchema = z.object({
  contactName: z.string().min(2).max(120),
  contactEmail: z.string().email(),
  contactPhone: z.string().max(40).optional().nullable(),
  message: z.string().max(5000).optional().nullable(),
  proposedAmount: z.number().int().min(0).optional().nullable(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ElectionInput = z.infer<typeof electionSchema>;
export type PositionInput = z.infer<typeof positionSchema>;
export type CandidateInput = z.infer<typeof candidateSchema>;
export type CastVoteInput = z.infer<typeof castVoteSchema>;
