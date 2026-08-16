import { db } from "@/lib/db";
import { ResultService } from "@/services/result.service";
import { formatNumber, formatPercent, formatDate } from "@/lib/utils";
import { Logo } from "@/components/shared/logo";
import { PrintButton } from "@/components/shared/print-button";
import { Trophy, ShieldCheck, Vote, Users, BarChart3, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

type Params = { params: Promise<{ id: string }> };

export const dynamic = "force-dynamic";

export default async function ReportPage({ params }: Params) {
  const { id } = await params;

  const election = await db.election.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      description: true,
      status: true,
      startTime: true,
      endTime: true,
      timezone: true,
      type: true,
      createdAt: true,
      organization: {
        select: { name: true, slug: true },
      },
    },
  });

  if (!election) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Election not found</p>
      </div>
    );
  }

  const results = await ResultService.computeElectionResults(id);
  const generatedAt = new Date();

  return (
    <div className="min-h-screen bg-white p-8 text-zinc-900 print:p-0 lg:p-12">
      {/* Print controls — hidden when printing */}
      <div className="mb-8 flex items-center justify-between print:hidden">
        <Link href={`/dashboard/elections/${id}/results`}>
          <Button variant="outline" size="sm">
            ← Back to results
          </Button>
        </Link>
        <PrintButton />
      </div>

      {/* Report header */}
      <div className="mb-10 border-b-2 border-zinc-900 pb-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-emerald-600 text-white">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M12 2.5 20 6v5.5c0 4.6-3.2 8.8-8 10-4.8-1.2-8-5.4-8-10V6l8-3.5Z"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinejoin="round"
                    fill="currentColor"
                    fillOpacity="0.18"
                  />
                  <path
                    d="m9 12 2 2 4-4.5"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <span className="text-xl font-bold tracking-tight">Votewise</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight">{election.name}</h1>
            <p className="mt-1 text-sm text-zinc-600">
              Official Election Results Report
            </p>
          </div>
          <div className="text-right text-sm text-zinc-600">
            <p className="font-semibold text-zinc-900">{election.organization.name}</p>
            <p>Report generated: {formatDate(generatedAt)}</p>
            <p className="mt-1">
              Status: <span className="font-semibold uppercase">{election.status}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Election details */}
      <div className="mb-8 grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
        <div className="rounded-lg border border-zinc-200 p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Election Type</p>
          <p className="mt-1 font-semibold">{election.type.replace(/_/g, " ").toLowerCase()}</p>
        </div>
        <div className="rounded-lg border border-zinc-200 p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Start Time</p>
          <p className="mt-1 font-semibold">{election.startTime ? formatDate(election.startTime) : "—"}</p>
        </div>
        <div className="rounded-lg border border-zinc-200 p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">End Time</p>
          <p className="mt-1 font-semibold">{election.endTime ? formatDate(election.endTime) : "—"}</p>
        </div>
        <div className="rounded-lg border border-zinc-200 p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Timezone</p>
          <p className="mt-1 font-semibold">{election.timezone}</p>
        </div>
      </div>

      {/* Summary stats */}
      <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="flex items-center gap-3 rounded-lg bg-emerald-50 p-4">
          <Users className="h-5 w-5 text-emerald-600" />
          <div>
            <p className="text-2xl font-bold tabular-nums">{formatNumber(results.totalVoters)}</p>
            <p className="text-xs text-zinc-600">Eligible Voters</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-lg bg-emerald-50 p-4">
          <Vote className="h-5 w-5 text-emerald-600" />
          <div>
            <p className="text-2xl font-bold tabular-nums">{formatNumber(results.totalVotes)}</p>
            <p className="text-xs text-zinc-600">Votes Cast</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-lg bg-emerald-50 p-4">
          <BarChart3 className="h-5 w-5 text-emerald-600" />
          <div>
            <p className="text-2xl font-bold tabular-nums">{formatPercent(results.turnout)}</p>
            <p className="text-xs text-zinc-600">Turnout</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-lg bg-emerald-50 p-4">
          <Trophy className="h-5 w-5 text-emerald-600" />
          <div>
            <p className="text-2xl font-bold tabular-nums">{results.positions.length}</p>
            <p className="text-xs text-zinc-600">Positions</p>
          </div>
        </div>
      </div>

      {/* Results per position */}
      <div className="space-y-8">
        {results.positions.map((pos, idx) => (
          <div key={pos.position.id} className="break-inside-avoid">
            <div className="mb-4 flex items-center justify-between border-b border-zinc-300 pb-2">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Position {idx + 1}
                </p>
                <h2 className="text-lg font-bold">{pos.position.title}</h2>
                {pos.position.description && (
                  <p className="text-xs text-zinc-600">{pos.position.description}</p>
                )}
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold">{formatNumber(pos.totalVotes)} votes</p>
                {pos.isTie ? (
                  <p className="text-xs font-medium text-amber-600">⚠ Tied result</p>
                ) : pos.winnerId ? (
                  <p className="flex items-center gap-1 text-xs font-medium text-emerald-600">
                    <CheckCircle2 className="h-3 w-3" />
                    Winner declared
                  </p>
                ) : null}
              </div>
            </div>

            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-left text-xs uppercase tracking-wide text-zinc-500">
                  <th className="pb-2 pr-4 font-medium">Rank</th>
                  <th className="pb-2 pr-4 font-medium">Candidate</th>
                  <th className="pb-2 pr-4 text-right font-medium">Votes</th>
                  <th className="pb-2 pr-4 text-right font-medium">Share</th>
                  <th className="pb-2 font-medium" style={{ width: "30%" }}>
                    Result
                  </th>
                </tr>
              </thead>
              <tbody>
                {pos.candidates.map((cand) => {
                  const isWinner = pos.winnerId === cand.id;
                  return (
                    <tr
                      key={cand.id}
                      className={`border-b border-zinc-100 ${isWinner ? "bg-emerald-50" : ""}`}
                    >
                      <td className="py-2 pr-4">
                        <span
                          className={`grid h-6 w-6 place-items-center rounded-full text-xs font-bold ${
                            isWinner
                              ? "bg-emerald-600 text-white"
                              : "bg-zinc-100 text-zinc-700"
                          }`}
                        >
                          {cand.rank}
                        </span>
                      </td>
                      <td className="py-2 pr-4">
                        <span className={`font-medium ${isWinner ? "text-emerald-700" : ""}`}>
                          {cand.name}
                        </span>
                        {isWinner && (
                          <Trophy className="ml-1 inline h-3 w-3 text-emerald-600" />
                        )}
                      </td>
                      <td className="py-2 pr-4 text-right font-semibold tabular-nums">
                        {formatNumber(cand.voteCount)}
                      </td>
                      <td className="py-2 pr-4 text-right tabular-nums text-zinc-600">
                        {formatPercent(cand.percentage)}
                      </td>
                      <td className="py-2">
                        <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-100">
                          <div
                            className={`h-full rounded-full ${isWinner ? "bg-emerald-500" : "bg-zinc-400"}`}
                            style={{ width: `${cand.percentage}%` }}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="mt-12 border-t-2 border-zinc-900 pt-4 text-xs text-zinc-500">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-zinc-700">Votewise — Secure Election Infrastructure</p>
            <p>
              This report was generated automatically from the Votewise platform. Results are
              computed server-side from tamper-evident ballot records.
            </p>
          </div>
          <div className="text-right">
            <p>Report ID: {election.id}</p>
            <p>Generated: {formatDate(generatedAt)}</p>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2 border-t border-zinc-200 pt-3">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
          <span>Tamper-evident · Independently auditable · Ballot secrecy preserved</span>
        </div>
      </div>

      {/* Print-specific styles */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          @page { margin: 1.5cm; }
        }
      `}} />
    </div>
  );
}
