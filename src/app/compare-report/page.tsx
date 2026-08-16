import { db } from "@/lib/db";
import { ResultService } from "@/services/result.service";
import { formatNumber, formatPercent, formatDate } from "@/lib/utils";
import { PrintButton } from "@/components/shared/print-button";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { requireOrgMember } from "@/lib/session";
import { BarChart3, Users, Vote, TrendingUp, Trophy } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function CompareReportPage() {
  const user = await requireOrgMember();

  const elections = await db.election.findMany({
    where: { organizationId: user.organizationId },
    select: {
      id: true,
      name: true,
      status: true,
      type: true,
      startTime: true,
      endTime: true,
      createdAt: true,
      _count: { select: { voters: true, votes: true, positions: true, candidates: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  const comparison = elections.map((e) => {
    const voters = e._count.voters;
    const votes = e._count.votes;
    const turnout = voters > 0 ? (votes / voters) * 100 : 0;
    return {
      id: e.id,
      name: e.name,
      status: e.status,
      type: e.type,
      startTime: e.startTime,
      endTime: e.endTime,
      createdAt: e.createdAt,
      voters,
      votes,
      positions: e._count.positions,
      candidates: e._count.candidates,
      turnout: Math.round(turnout * 10) / 10,
    };
  });

  const totalVoters = comparison.reduce((s, e) => s + e.voters, 0);
  const totalVotes = comparison.reduce((s, e) => s + e.votes, 0);
  const withVoters = comparison.filter((e) => e.voters > 0);
  const avgTurnout =
    withVoters.length > 0
      ? Math.round((withVoters.reduce((s, e) => s + e.turnout, 0) / withVoters.length) * 10) / 10
      : 0;

  const generatedAt = new Date();
  const org = await db.organization.findUnique({
    where: { id: user.organizationId },
    select: { name: true },
  });

  return (
    <div className="min-h-screen bg-white p-4 text-zinc-900 print:p-0 sm:p-8 lg:p-12">
      {/* Controls */}
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href="/dashboard/compare">
          <Button variant="outline" size="sm">
            ← Back to comparison
          </Button>
        </Link>
        <PrintButton />
      </div>

      {/* Report header */}
      <div className="mb-10 border-b-2 border-zinc-900 pb-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-emerald-600 text-white">
                <BarChart3 className="h-5 w-5" />
              </div>
              <span className="text-xl font-bold tracking-tight">Votewise</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Election Comparison Report</h1>
            <p className="mt-1 text-sm text-zinc-600">
              Cross-election turnout and engagement analysis
            </p>
          </div>
          <div className="text-right text-sm text-zinc-600">
            <p className="font-semibold text-zinc-900">{org?.name}</p>
            <p>Generated: {formatDate(generatedAt)}</p>
          </div>
        </div>
      </div>

      {/* Summary stats */}
      <div className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4">
        <div className="flex items-center gap-3 rounded-lg border border-zinc-200 p-4">
          <BarChart3 className="h-5 w-5 text-emerald-600" />
          <div>
            <p className="text-2xl font-bold tabular-nums">{comparison.length}</p>
            <p className="text-xs text-zinc-600">Total Elections</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-lg border border-zinc-200 p-4">
          <Users className="h-5 w-5 text-emerald-600" />
          <div>
            <p className="text-2xl font-bold tabular-nums">{formatNumber(totalVoters)}</p>
            <p className="text-xs text-zinc-600">Total Voters</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-lg border border-zinc-200 p-4">
          <Vote className="h-5 w-5 text-emerald-600" />
          <div>
            <p className="text-2xl font-bold tabular-nums">{formatNumber(totalVotes)}</p>
            <p className="text-xs text-zinc-600">Total Votes</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-lg border border-zinc-200 p-4">
          <TrendingUp className="h-5 w-5 text-emerald-600" />
          <div>
            <p className="text-2xl font-bold tabular-nums">{formatPercent(avgTurnout)}</p>
            <p className="text-xs text-zinc-600">Average Turnout</p>
          </div>
        </div>
      </div>

      {/* Turnout bar chart */}
      {withVoters.length > 0 && (
        <div className="mb-8">
          <h2 className="mb-4 text-lg font-bold">Turnout Comparison</h2>
          <div className="space-y-3">
            {withVoters
              .sort((a, b) => b.turnout - a.turnout)
              .map((e, idx) => (
                <div key={e.id} className="flex items-center gap-3">
                  <div className="flex w-6 shrink-0 items-center justify-center">
                    {idx < 3 && (
                      <Trophy
                        className={`h-4 w-4 ${idx === 0 ? "text-amber-500" : idx === 1 ? "text-zinc-400" : "text-orange-500"}`}
                      />
                    )}
                  </div>
                  <div className="w-24 shrink-0 truncate text-sm font-medium sm:w-48">{e.name}</div>
                  <div className="h-6 min-w-[60px] flex-1 overflow-hidden rounded-full bg-zinc-100">
                    <div
                      className="flex h-full items-center justify-end rounded-full bg-emerald-500 px-2 text-[10px] font-bold text-white"
                      style={{ width: `${Math.max(e.turnout, 5)}%` }}
                    >
                      {formatPercent(e.turnout)}
                    </div>
                  </div>
                  <div className="w-20 shrink-0 text-right text-xs text-zinc-600 sm:w-32">
                    {formatNumber(e.votes)}/{formatNumber(e.voters)}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Detailed comparison table */}
      <div className="break-inside-avoid">
        <h2 className="mb-4 text-lg font-bold">Detailed Comparison</h2>
        <div className="overflow-x-auto">
        <table className="w-full min-w-[700px] text-sm">
          <thead>
            <tr className="border-b-2 border-zinc-300 text-left text-xs uppercase tracking-wide text-zinc-500">
              <th className="pb-2 pr-4 font-medium">Election</th>
              <th className="pb-2 pr-4 font-medium">Status</th>
              <th className="pb-2 pr-4 text-right font-medium">Voters</th>
              <th className="pb-2 pr-4 text-right font-medium">Votes</th>
              <th className="pb-2 pr-4 text-right font-medium">Positions</th>
              <th className="pb-2 pr-4 text-right font-medium">Candidates</th>
              <th className="pb-2 pr-4 text-right font-medium">Turnout</th>
              <th className="pb-2 font-medium">Date</th>
            </tr>
          </thead>
          <tbody>
            {comparison.map((e) => (
              <tr key={e.id} className="border-b border-zinc-100">
                <td className="py-2 pr-4">
                  <p className="font-medium">{e.name}</p>
                  <p className="text-[10px] text-zinc-500">{e.type.replace(/_/g, " ").toLowerCase()}</p>
                </td>
                <td className="py-2 pr-4">
                  <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-medium uppercase ${
                    e.status === "LIVE"
                      ? "bg-emerald-100 text-emerald-700"
                      : e.status === "PUBLISHED"
                        ? "bg-emerald-50 text-emerald-600"
                        : "bg-zinc-100 text-zinc-600"
                  }`}>
                    {e.status.replace(/_/g, " ").toLowerCase()}
                  </span>
                </td>
                <td className="py-2 pr-4 text-right tabular-nums">{formatNumber(e.voters)}</td>
                <td className="py-2 pr-4 text-right tabular-nums">{formatNumber(e.votes)}</td>
                <td className="py-2 pr-4 text-right tabular-nums">{e.positions}</td>
                <td className="py-2 pr-4 text-right tabular-nums">{e.candidates}</td>
                <td className="py-2 pr-4 text-right font-semibold tabular-nums">
                  {formatPercent(e.turnout)}
                </td>
                <td className="py-2 text-xs text-zinc-600">
                  {e.startTime ? formatDate(e.startTime) : "Not scheduled"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
        <p className="mt-2 text-xs text-zinc-500 sm:hidden">Swipe to compare →</p>
      </div>

      {/* Footer */}
      <div className="mt-12 border-t-2 border-zinc-900 pt-4 text-xs text-zinc-500">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-semibold text-zinc-700">Votewise — Secure Election Infrastructure</p>
            <p>
              This report was generated automatically from the Votewise platform.
            </p>
          </div>
          <div className="text-right">
            <p>Generated: {formatDate(generatedAt)}</p>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          @page { margin: 1.5cm; }
        }
      `}} />
    </div>
  );
}
