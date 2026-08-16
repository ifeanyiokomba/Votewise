// Shared dashboard types — match API response shapes (see worklog.md).

export interface UserDTO {
  id: string;
  email: string;
  name: string;
  role: string;
  organizationId: string | null;
  isActive: boolean;
  emailVerified: string | null;
  lastLoginAt: string | null;
}

export interface OrganizationDTO {
  id: string;
  name: string;
  slug: string;
  subscriptionTier: string;
  logo: string | null;
}

export interface MeResponse {
  user: UserDTO | null;
  organization: OrganizationDTO | null;
}

export interface ElectionCount {
  voters: number;
  positions: number;
  candidates: number;
  votes?: number;
}

export interface ElectionDTO {
  id: string;
  name: string;
  description: string | null;
  status: string;
  type: string;
  startTime: string | null;
  endTime: string | null;
  timezone: string;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
  _count?: ElectionCount;
}

export interface PositionDTO {
  id: string;
  title: string;
  description: string | null;
  maxChoices: number;
  order: number;
  electionId: string;
  createdAt: string;
  updatedAt: string;
  _count?: { candidates: number; votes: number };
}

export interface CandidateDTO {
  id: string;
  name: string;
  photo: string | null;
  bio: string | null;
  manifesto: string | null;
  positionId: string;
  electionId: string;
  createdAt: string;
  updatedAt: string;
  position?: { id: string; title: string };
  _count?: { votes: number };
}

export interface VoterDTO {
  id: string;
  name: string;
  matricNumber: string | null;
  department: string | null;
  faculty: string | null;
  level: string | null;
  phone: string | null;
  email: string | null;
  uniqueIdentifier: string;
  isEligible: boolean;
  electionId: string;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
}

export interface ElectionStats {
  id: string;
  status: string;
  startTime: string | null;
  endTime: string | null;
  voters: number;
  verified: number;
  completedVotes: number;
  activeSessions: number;
  candidates: number;
  positions: number;
  turnout: number;
  verificationRate: number;
}

export interface TimelinePoint {
  hour: string;
  count: number;
}

export interface CandidateResult {
  id: string;
  name: string;
  photo: string | null;
  voteCount: number;
  percentage: number;
  rank: number;
}

export interface PositionResultDTO {
  position: { id: string; title: string; description: string | null };
  totalVotes: number;
  candidates: CandidateResult[];
  winnerId: string | null;
  isTie: boolean;
}

export interface ElectionResultsDTO {
  electionId: string;
  electionName: string;
  totalVotes: number;
  totalVoters: number;
  turnout: number;
  positions: PositionResultDTO[];
}

export interface AuditLogDTO {
  id: string;
  actorId: string | null;
  organizationId: string | null;
  action: string;
  resource: string;
  resourceId: string | null;
  result: string | null;
  metadata: string | null;
  timestamp: string;
  actor?: { id: string; name: string; email: string } | null;
}

export interface CommercialActivationDTO {
  id: string;
  electionId: string;
  organizationId: string;
  status: string;
  voterCount: number;
  applicableRate: number;
  calculatedAmount: number;
  currency: string;
  pricingRule: string;
  pricingSnapshot: string | null;
  activatedAt: string | null;
  createdAt: string;
  updatedAt: string;
  payments?: { id: string; reference: string; amount: number; status: string; paidAt: string | null }[];
  negotiation?: unknown | null;
}

export interface AdminStatsResponse {
  stats: { total: number; unresolved: number; critical: number };
  orgStats: {
    elections: number;
    activeElections: number;
    voters: number;
    candidates: number;
    totalVotes: number;
    pendingTickets: number;
  };
  recentEvents: Array<{
    id: string;
    type: string;
    severity: string;
    resolved: boolean;
    createdAt: string;
    details: string | null;
    ipAddress: string | null;
  }>;
  recentAudit: AuditLogDTO[];
  elections: Array<{ id: string; name: string; status: string }>;
}

export interface NotificationDTO {
  id: string;
  type: string;
  recipient: string;
  subject: string | null;
  body: string;
  status: string;
  sentAt: string | null;
  deliveredAt: string | null;
  createdAt: string;
}
