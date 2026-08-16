import { db } from "../src/lib/db";
import bcrypt from "bcryptjs";
import { ElectionService } from "../src/services/election.service";
import { OrganizationService } from "../src/services/organization.service";
import { PositionService } from "../src/services/position.service";
import { CandidateService } from "../src/services/candidate.service";
import { VoterService } from "../src/services/voter.service";
import { ResultService } from "../src/services/result.service";
import { AuditService } from "../src/services/audit.service";
import { SecurityService } from "../src/services/security.service";
import { generateUniqueIdentifier } from "../src/lib/utils";

async function main() {
  console.log("🌱 Seeding Votewise...");

  // ── Platform admin ──────────────────────────────────────────────
  const adminPassword = await bcrypt.hash("Ntaokomba91615", 12);
  let admin = await db.user.findFirst({
    where: { email: "admin@votewise.com.ng", organizationId: null },
  });
  if (!admin) {
    admin = await db.user.create({
      data: {
        email: "admin@votewise.com.ng",
        name: "Votewise Platform Admin",
        passwordHash: adminPassword,
        role: "PLATFORM_ADMIN",
        emailVerified: new Date(),
      },
    });
  }

  // ── Demo organization + owner ──────────────────────────────────
  const demoPassword = await bcrypt.hash("Demo@1234", 12);
  let demoUser = await db.user.findFirst({
    where: { email: "demo@votewise.com.ng", organizationId: null },
  });

  if (!demoUser) {
    demoUser = await db.user.create({
      data: {
        email: "demo@votewise.com.ng",
        name: "Adaeze Okafor",
        passwordHash: demoPassword,
        role: "ORG_OWNER",
        emailVerified: new Date(),
      },
    });
  }

  let org = await db.organization.findUnique({ where: { slug: "unizik" } });
  if (!org) {
    org = await OrganizationService.create({
      name: "Nnamdi Azikiwe University",
      ownerId: demoUser.id,
      description:
        "Student Union Government elections — secure, transparent and verifiable.",
    });
    await db.user.update({
      where: { id: demoUser.id },
      data: { organizationId: org.id },
    });
    await db.organization.update({
      where: { id: org.id },
      data: { subscriptionTier: "PROFESSIONAL" },
    });
  }

  // ── Election 1: LIVE Student Union elections ───────────────────
  let election = await db.election.findFirst({
    where: { organizationId: org.id, name: "Student Union Government Elections 2025" },
  });
  if (!election) {
    election = await ElectionService.create(org.id, {
      name: "Student Union Government Elections 2025",
      description:
        "Annual general elections for the Student Union Government executive council.",
      type: "GENERAL",
      startTime: new Date(Date.now() - 30 * 60 * 1000),
      endTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
      timezone: "Africa/Lagos",
    });
    await ElectionService.transition(election.id, "CONFIGURATION");

    const president = await PositionService.create(election.id, {
      title: "President",
      description: "Chief executive of the Student Union Government.",
      order: 0,
    });
    const vp = await PositionService.create(election.id, {
      title: "Vice President",
      description: "Deputy chief executive.",
      order: 1,
    });
    const sec = await PositionService.create(election.id, {
      title: "Secretary General",
      description: "Records and correspondence of the union.",
      order: 2,
    });

    const candidates = [
      { pos: president, name: "Chidi Eze", manifesto: "Transparency. Accountability. Action." },
      { pos: president, name: "Fatima Bello", manifesto: "A union that works for every student." },
      { pos: president, name: "Tunde Adeyemi", manifesto: "Reform. Renew. Rebuild." },
      { pos: vp, name: "Grace Okon", manifesto: "Your voice, amplified." },
      { pos: vp, name: "Ibrahim Musa", manifesto: "Unity in diversity." },
      { pos: sec, name: "Blessing Nwosu", manifesto: "Efficient, digital-first governance." },
      { pos: sec, name: "Samuel Eze", manifesto: "Clear records, clear trust." },
    ];
    for (const c of candidates) {
      await CandidateService.create(election.id, {
        name: c.name,
        manifesto: c.manifesto,
        bio: `${c.name} is a dedicated candidate committed to service.`,
        positionId: c.pos.id,
      });
    }

    // Voters
    const voterRows = Array.from({ length: 12 }).map((_, i) => ({
      name: `Voter ${i + 1}`,
      matricNumber: `UNIZIK/2020/${1000 + i}`,
      department: i % 2 ? "Computer Science" : "Electrical Engineering",
      faculty: i % 2 ? "Engineering" : "Physical Sciences",
      level: "300",
      phone: `+234801234${(1000 + i).toString().slice(-4)}`,
      email: `voter${i + 1}@unizik.edu.ng`,
    }));
    await VoterService.import(election.id, org.id, voterRows);

    // Move through lifecycle to LIVE
    await ElectionService.transition(election.id, "VOTER_IMPORT");
    await ElectionService.transition(election.id, "CANDIDATE_SETUP");
    await ElectionService.transition(election.id, "VERIFICATION");
    await ElectionService.transition(election.id, "READY");
    await ElectionService.transition(election.id, "SCHEDULED");
    await ElectionService.transition(election.id, "LIVE");
  }

  // ── Election 2: Draft Faculty election ─────────────────────────
  let election2 = await db.election.findFirst({
    where: { organizationId: org.id, name: "Faculty of Engineering Congress 2025" },
  });
  if (!election2) {
    election2 = await ElectionService.create(org.id, {
      name: "Faculty of Engineering Congress 2025",
      description: "Faculty congress representatives election.",
      type: "FACULTY",
      startTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      endTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 6 * 60 * 60 * 1000),
    });
    await ElectionService.transition(election2.id, "CONFIGURATION");
    await PositionService.create(election2.id, {
      title: "Congress Representative",
      order: 0,
    });
  }

  // ── Election 3: Published (archived results) ───────────────────
  let election3 = await db.election.findFirst({
    where: { organizationId: org.id, name: "Departmental Class Rep Election 2024" },
  });
  if (!election3) {
    election3 = await ElectionService.create(org.id, {
      name: "Departmental Class Rep Election 2024",
      description: "Concluded class representative election.",
      type: "DEPARTMENT",
    });
    await ElectionService.transition(election3.id, "CONFIGURATION");
    const pos = await PositionService.create(election3.id, {
      title: "Class Representative",
      order: 0,
    });
    const c1 = await CandidateService.create(election3.id, {
      name: "Joy Adebayo",
      positionId: pos.id,
    });
    const c2 = await CandidateService.create(election3.id, {
      name: "Mike Obi",
      positionId: pos.id,
    });
    const voters3 = Array.from({ length: 8 }).map((_, i) => ({
      name: `Alum Voter ${i + 1}`,
      email: `alum${i + 1}@unizik.edu.ng`,
      matricNumber: `UNIZIK/2019/${2000 + i}`,
    }));
    await VoterService.import(election3.id, org.id, voters3);
    await ElectionService.transition(election3.id, "VOTER_IMPORT");
    await ElectionService.transition(election3.id, "CANDIDATE_SETUP");
    await ElectionService.transition(election3.id, "VERIFICATION");
    await ElectionService.transition(election3.id, "READY");
    await ElectionService.transition(election3.id, "SCHEDULED");
    await ElectionService.transition(election3.id, "LIVE");

    // Cast some votes anonymously
    for (let i = 0; i < 6; i++) {
      const cand = i % 2 === 0 ? c1 : c2;
      await db.vote.create({
        data: {
          anonymousToken: generateUniqueIdentifier("TOK"),
          electionId: election3.id,
          positionId: pos.id,
          candidateId: cand.id,
          ballotHash: generateUniqueIdentifier("BAL"),
          status: "CAST",
        },
      });
    }
    await ElectionService.transition(election3.id, "CLOSED");
    await ElectionService.transition(election3.id, "RESULTS_REVIEW");
    await ResultService.persistResults(election3.id);
    await ElectionService.publishResults(election3.id);
  }

  // ── Sample audit logs + security events + support ticket ───────
  await AuditService.log({
    actorId: demoUser.id,
    organizationId: org.id,
    action: "ELECTION_CREATE",
    resource: "election",
    resourceId: election.id,
    result: "SUCCESS",
    metadata: { name: election.name },
  });
  await AuditService.log({
    actorId: demoUser.id,
    organizationId: org.id,
    action: "VOTER_IMPORT",
    resource: "voter",
    resourceId: election.id,
    result: "SUCCESS",
    metadata: { count: 12 },
  });
  await AuditService.log({
    actorId: admin.id,
    organizationId: null,
    action: "LOGIN",
    resource: "auth",
    result: "SUCCESS",
  });

  await SecurityService.record({
    type: "FAILED_LOGIN",
    severity: "LOW",
    organizationId: org.id,
    details: { email: "unknown@x.com" },
    ipAddress: "41.58.0.10",
  });
  await SecurityService.record({
    type: "SUSPICIOUS_OTP_ACTIVITY",
    severity: "MEDIUM",
    organizationId: org.id,
    details: { attempts: 4 },
    ipAddress: "102.89.0.5",
  });

  await db.supportTicket.create({
    data: {
      subject: "Voter didn't receive OTP",
      description: "One of our voters reported not receiving the SMS OTP. Email worked though.",
      priority: "HIGH",
      organizationId: org.id,
      createdById: demoUser.id,
      status: "OPEN",
    },
  });

  console.log("✅ Seed complete.");
  console.log("   Platform admin: admin@votewise.com.ng / Ntaokomba91615");
  console.log("   Org owner:       demo@votewise.com.ng / Demo@1234");
  console.log("   Live election:   Student Union Government Elections 2025");
  console.log("   Voter sample:    voter1@unizik.edu.ng (lookup: UNIZIK/2020/1000)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
