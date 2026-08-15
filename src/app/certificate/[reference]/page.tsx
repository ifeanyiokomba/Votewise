import { db } from "@/lib/db";
import { formatDate } from "@/lib/utils";
import { PrintButton } from "@/components/shared/print-button";
import { QrCode } from "@/components/shared/qr-code";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Award, Vote, CheckCircle2 } from "lucide-react";

type Params = { params: Promise<{ reference: string }> };

export const dynamic = "force-dynamic";

export default async function CertificatePage({ params }: Params) {
  const { reference } = await params;

  // Find the notification that stored the receipt reference
  const notification = await db.notification.findFirst({
    where: {
      metadata: { contains: reference },
      subject: { contains: "Vote received" },
    },
    orderBy: { createdAt: "desc" },
    include: {
      election: {
        select: {
          id: true,
          name: true,
          description: true,
          endTime: true,
          organization: {
            select: { name: true, slug: true },
          },
        },
      },
    },
  });

  if (!notification || !notification.election) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
        <div className="max-w-md text-center">
          <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-destructive/10 text-destructive">
            <ShieldCheck className="h-8 w-8" />
          </div>
          <h1 className="text-xl font-bold">Certificate not found</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            We could not verify the reference <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{reference}</code>.
            Please check your receipt and try again.
          </p>
          <Button asChild variant="outline" className="mt-4">
            <Link href="/">Back to home</Link>
          </Button>
        </div>
      </div>
    );
  }

  const election = notification.election;
  const issuedAt = notification.sentAt ?? notification.createdAt;

  return (
    <div className="min-h-screen bg-muted/30 p-4 py-8 lg:p-8">
      {/* Controls */}
      <div className="mx-auto mb-6 flex max-w-4xl items-center justify-between print:hidden">
        <Link href={`/vote/${election.id}/receipt?reference=${reference}`}>
          <Button variant="outline" size="sm">
            ← Back to receipt
          </Button>
        </Link>
        <PrintButton />
      </div>

      {/* Certificate */}
      <div className="mx-auto max-w-4xl">
        <div className="relative overflow-hidden rounded-2xl border-4 border-emerald-600/20 bg-white p-8 shadow-xl sm:p-12 lg:p-16">
          {/* Decorative corners */}
          <div className="absolute left-0 top-0 h-24 w-24 border-l-4 border-t-4 border-emerald-600/30" />
          <div className="absolute right-0 top-0 h-24 w-24 border-r-4 border-t-4 border-emerald-600/30" />
          <div className="absolute bottom-0 left-0 h-24 w-24 border-b-4 border-l-4 border-emerald-600/30" />
          <div className="absolute bottom-0 right-0 h-24 w-24 border-b-4 border-r-4 border-emerald-600/30" />

          {/* Watermark */}
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-[0.04]">
            <Vote className="h-64 w-64" />
          </div>

          <div className="relative text-center">
            {/* Header */}
            <div className="mb-2 flex items-center justify-center gap-2">
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
              <span className="text-lg font-bold tracking-tight text-zinc-900">Votewise</span>
            </div>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-emerald-600">
              Certificate of Participation
            </p>

            {/* Divider */}
            <div className="mx-auto my-6 flex items-center gap-2">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent to-emerald-600/30" />
              <Award className="h-5 w-5 text-emerald-600" />
              <div className="h-px flex-1 bg-gradient-to-l from-transparent to-emerald-600/30" />
            </div>

            {/* Body */}
            <p className="text-sm text-zinc-600">This certifies that</p>
            <p className="mt-2 text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
              {notification.recipient}
            </p>
            <p className="mt-3 text-sm text-zinc-600">
              successfully participated in the election
            </p>
            <p className="mt-2 text-xl font-semibold text-emerald-700">
              {election.name}
            </p>
            <p className="mt-1 text-sm text-zinc-500">
              organized by {election.organization.name}
            </p>

            {/* Verification reference + QR code */}
            <div className="mx-auto mt-8 flex max-w-md flex-col items-center gap-4 rounded-lg border border-emerald-600/20 bg-emerald-50/50 p-4 sm:flex-row">
              <div className="flex-1 text-left">
                <p className="text-xs font-medium uppercase tracking-wide text-emerald-600">
                  Verification Reference
                </p>
                <p className="mt-1 break-all font-mono text-sm font-bold text-zinc-900">
                  {reference}
                </p>
                <p className="mt-2 flex items-center gap-1 text-[11px] text-zinc-500">
                  <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                  Ballot received and recorded
                </p>
              </div>
              <div className="shrink-0 text-center">
                <QrCode
                  value={`${process.env.NEXT_PUBLIC_APP_URL ?? ""}/verify-ballot?reference=${encodeURIComponent(reference)}`}
                  size={100}
                />
                <p className="mt-1 text-[9px] text-zinc-500">
                  Scan to verify
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-8 grid grid-cols-2 gap-4 border-t border-zinc-200 pt-6 text-left">
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">
                  Date Issued
                </p>
                <p className="mt-0.5 text-sm font-semibold text-zinc-900">
                  {formatDate(issuedAt)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">
                  Election ID
                </p>
                <p className="mt-0.5 font-mono text-xs text-zinc-600">
                  {election.id}
                </p>
              </div>
            </div>

            {/* Privacy note */}
            <div className="mt-6 flex items-center justify-center gap-2 rounded-lg bg-zinc-50 p-3 text-[11px] text-zinc-500">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
              <span>
                This certificate confirms participation only. Ballot secrecy is preserved —
                individual vote choices are never linked to voter identity.
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3 print:hidden">
          <Button asChild variant="outline" size="sm">
            <Link href={`/results/${election.id}`}>
              View election results
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href={`/verify-ballot?reference=${reference}`}>
              Verify ballot
            </Link>
          </Button>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body { background: white; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          @page { size: A4 landscape; margin: 1cm; }
        }
      `}} />
    </div>
  );
}
