import { ok, handleError } from "@/lib/api-response";
import { requireOrgAdmin } from "@/lib/session";
import { db } from "@/lib/db";
import { AuditService } from "@/services/audit.service";

// Pre-built election templates for common organizational use cases.
// Each template defines positions + candidates that get cloned into a new DRAFT election.
const TEMPLATES = [
  {
    id: "student-union",
    name: "Student Union Government",
    description: "Standard student union executive council election with 5 positions.",
    type: "GENERAL",
    positions: [
      {
        title: "President",
        description: "Chief executive of the Student Union Government.",
        maxChoices: 1,
        candidates: [
          { name: "Candidate A", manifesto: "Leadership with integrity." },
          { name: "Candidate B", manifesto: "A voice for every student." },
        ],
      },
      {
        title: "Vice President",
        description: "Deputy chief executive.",
        maxChoices: 1,
        candidates: [
          { name: "Candidate A", manifesto: "Unity and progress." },
          { name: "Candidate B", manifesto: "Your voice, amplified." },
        ],
      },
      {
        title: "Secretary General",
        description: "Records and correspondence of the union.",
        maxChoices: 1,
        candidates: [
          { name: "Candidate A", manifesto: "Digital-first governance." },
          { name: "Candidate B", manifesto: "Transparent records." },
        ],
      },
      {
        title: "Treasurer",
        description: "Manages union finances and budgets.",
        maxChoices: 1,
        candidates: [
          { name: "Candidate A", manifesto: "Accountability in every naira." },
          { name: "Candidate B", manifesto: "Fiscal responsibility." },
        ],
      },
      {
        title: "Public Relations Officer",
        description: "Communicates union activities to the student body.",
        maxChoices: 1,
        candidates: [
          { name: "Candidate A", manifesto: "Connecting students and leadership." },
          { name: "Candidate B", manifesto: "Amplifying student voices." },
        ],
      },
    ],
  },
  {
    id: "faculty-reps",
    name: "Faculty Representatives",
    description: "Department-level representative election — 1 position per department.",
    type: "FACULTY",
    positions: [
      {
        title: "Department Representative",
        description: "Represents the department in faculty matters.",
        maxChoices: 1,
        candidates: [
          { name: "Candidate A", manifesto: "Department-first advocacy." },
          { name: "Candidate B", manifesto: "Progress through collaboration." },
        ],
      },
    ],
  },
  {
    id: "class-reps",
    name: "Class Representatives",
    description: "Quick class-level representative election with a single position.",
    type: "DEPARTMENT",
    positions: [
      {
        title: "Class Representative",
        description: "Represents the class in departmental matters.",
        maxChoices: 1,
        candidates: [
          { name: "Candidate A", manifesto: "Serving my classmates." },
          { name: "Candidate B", manifesto: "Action over words." },
        ],
      },
    ],
  },
  {
    id: "board-directors",
    name: "Board of Directors",
    description: "Corporate board election with multiple independent director positions.",
    type: "EXECUTIVE",
    positions: [
      {
        title: "Board Chairperson",
        description: "Chairs board meetings and sets the agenda.",
        maxChoices: 1,
        candidates: [
          { name: "Candidate A", manifesto: "Stewardship and vision." },
          { name: "Candidate B", manifesto: "Governance excellence." },
        ],
      },
      {
        title: "Board Secretary",
        description: "Maintains board records and minutes.",
        maxChoices: 1,
        candidates: [
          { name: "Candidate A", manifesto: "Meticulous governance." },
        ],
      },
      {
        title: "Independent Director",
        description: "Independent oversight director.",
        maxChoices: 1,
        candidates: [
          { name: "Candidate A", manifesto: "Independent judgment." },
          { name: "Candidate B", manifesto: "Shareholder protection." },
        ],
      },
    ],
  },
  {
    id: "association-execs",
    name: "Association Executives",
    description: "Professional association executive committee — 4 positions.",
    type: "GENERAL",
    positions: [
      {
        title: "President",
        description: "Leads the association.",
        maxChoices: 1,
        candidates: [
          { name: "Candidate A", manifesto: "Forward together." },
          { name: "Candidate B", manifesto: "Service above self." },
        ],
      },
      {
        title: "Vice President",
        description: "Supports the president.",
        maxChoices: 1,
        candidates: [{ name: "Candidate A", manifesto: "Collaborative leadership." }],
      },
      {
        title: "Secretary",
        description: "Manages association records.",
        maxChoices: 1,
        candidates: [{ name: "Candidate A", manifesto: "Organized and reliable." }],
      },
      {
        title: "Financial Secretary",
        description: "Oversees association finances.",
        maxChoices: 1,
        candidates: [{ name: "Candidate A", manifesto: "Prudent financial management." }],
      },
    ],
  },
  {
    id: "confidence-vote",
    name: "Confidence Vote",
    description: "Single-position confidence vote on a leader or proposal.",
    type: "CONFIDENCE",
    positions: [
      {
        title: "Confidence in Leadership",
        description: "Vote of confidence in the current leadership.",
        maxChoices: 1,
        candidates: [
          { name: "Yes, I have confidence", manifesto: "Endorse the current leadership." },
          { name: "No, I do not have confidence", manifesto: "Signal need for change." },
        ],
      },
    ],
  },
] as const;

export async function GET() {
  try {
    await requireOrgAdmin();
    return ok({
      templates: TEMPLATES.map((t) => ({
        id: t.id,
        name: t.name,
        description: t.description,
        type: t.type,
        positionCount: t.positions.length,
        candidateCount: t.positions.reduce(
          (sum, p) => sum + p.candidates.length,
          0
        ),
      })),
    });
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireOrgAdmin();
    const body = await request.json();
    const { templateId, electionName } = body as {
      templateId: string;
      electionName?: string;
    };

    const template = TEMPLATES.find((t) => t.id === templateId);
    if (!template) {
      return ok(
        { error: "Template not found" },
        404
      );
    }

    const name = electionName?.trim() || template.name;

    const election = await db.$transaction(async (tx) => {
      const el = await tx.election.create({
        data: {
          name,
          description: template.description,
          type: template.type as never,
          timezone: "Africa/Lagos",
          organizationId: user.organizationId!,
          status: "DRAFT",
        },
      });

      for (let i = 0; i < template.positions.length; i++) {
        const pos = template.positions[i];
        const newPos = await tx.position.create({
          data: {
            title: pos.title,
            description: pos.description,
            maxChoices: pos.maxChoices,
            order: i,
            electionId: el.id,
          },
        });
        for (const cand of pos.candidates) {
          await tx.candidate.create({
            data: {
              name: cand.name,
              manifesto: cand.manifesto,
              positionId: newPos.id,
              electionId: el.id,
            },
          });
        }
      }

      // Move to CONFIGURATION (positions exist)
      await tx.election.update({
        where: { id: el.id },
        data: { status: "CONFIGURATION" },
      });

      return el;
    });

    await AuditService.log({
      actorId: user.id,
      organizationId: user.organizationId,
      action: "ELECTION_CREATE",
      resource: "election",
      resourceId: election.id,
      result: "SUCCESS",
      metadata: { templateId, name: election.name },
    });

    return ok({ election }, 201);
  } catch (e) {
    return handleError(e);
  }
}

export { TEMPLATES };
