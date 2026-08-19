import { Download, ExternalLink, Mail, Search, Star, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { ActionButton } from "@/components/admin/action-button";
import { ReasonDialogButton } from "@/components/admin/reason-dialog-button";
import { StatCard } from "@/components/shared/stat-card";
import {
  ContestantStatusBadge,
  SubmissionStatusBadge,
} from "@/components/shared/status-badges";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getActiveHackathon } from "@/lib/hackathon";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { formatISTDate, formatScore } from "@/lib/utils";
import {
  disqualifyContestant,
  reinstateContestant,
  resendWelcomeEmail,
  toggleShortlist,
} from "@/server/actions/admin/contestants";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Contestants" };

export default async function AdminContestantsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  await requireRole("ADMIN");
  const params = await searchParams;
  const hackathon = await getActiveHackathon();
  if (!hackathon) return null;

  const query = (params.q ?? "").trim();

  const contestants = await prisma.contestant.findMany({
    where: {
      hackathonId: hackathon.id,
      ...(query
        ? {
            OR: [
              { contestantId: { contains: query, mode: "insensitive" } },
              { fullName: { contains: query, mode: "insensitive" } },
              { email: { contains: query, mode: "insensitive" } },
              { city: { contains: query, mode: "insensitive" } },
              { phone: { contains: query } },
            ],
          }
        : {}),
    },
    orderBy: { contestantId: "asc" },
    include: { submission: { select: { status: true } } },
    take: 500,
  });

  const [total, submittedCount, shortlisted, disqualified] = await Promise.all([
    prisma.contestant.count({ where: { hackathonId: hackathon.id } }),
    prisma.contestant.count({
      where: { hackathonId: hackathon.id, status: "SUBMITTED" },
    }),
    prisma.contestant.count({
      where: { hackathonId: hackathon.id, shortlisted: true },
    }),
    prisma.contestant.count({
      where: { hackathonId: hackathon.id, status: "DISQUALIFIED" },
    }),
  ]);

  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="label-eyebrow">Contestants</p>
          <h1 className="heading-hero mt-2 text-2xl sm:text-3xl">Registrations</h1>
        </div>
        <Button asChild variant="secondary">
          <a href="/api/reports/hiring?format=registrations-csv">
            <Download />
            Export CSV
          </a>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total" value={total} icon={Users} tone="gold" />
        <StatCard label="Submitted" value={submittedCount} tone="emerald" />
        <StatCard label="Shortlisted" value={shortlisted} icon={Star} tone="gold" />
        <StatCard label="Disqualified" value={disqualified} tone="rose" />
      </div>

      <form className="flex gap-3" action="/admin/contestants">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            name="q"
            defaultValue={query}
            placeholder="Search by ID, name, email, city or phone"
            className="pl-10"
          />
        </div>
        <Button type="submit" variant="secondary">
          Search
        </Button>
        {query ? (
          <Button asChild variant="ghost">
            <Link href="/admin/contestants">Clear</Link>
          </Button>
        ) : null}
      </form>

      {contestants.length === 0 ? (
        <EmptyState
          icon={Users}
          title={query ? "No matches" : "No registrations yet"}
          description={
            query
              ? "Try a different search term."
              : "Registrations appear here the moment they come in."
          }
        />
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="hidden lg:table-cell">Contact</TableHead>
                <TableHead className="hidden md:table-cell">Exp.</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden sm:table-cell">Submission</TableHead>
                <TableHead className="hidden xl:table-cell">Registered</TableHead>
                <TableHead className="text-right">Score</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contestants.map((contestant) => (
                <TableRow key={contestant.id}>
                  <TableCell className="font-mono text-xs tracking-wider text-sky-300">
                    {contestant.contestantId}
                  </TableCell>
                  <TableCell>
                    <p className="font-medium">{contestant.fullName}</p>
                    <p className="text-xs text-muted-foreground">
                      {contestant.city} · {contestant.jobRole}
                    </p>
                    <a
                      href={contestant.portfolioUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      Portfolio <ExternalLink className="size-3" />
                    </a>
                  </TableCell>
                  <TableCell className="hidden text-xs text-muted-foreground lg:table-cell">
                    <p>{contestant.email}</p>
                    <p>{contestant.phone}</p>
                  </TableCell>
                  <TableCell className="hidden tabular-nums text-muted-foreground md:table-cell">
                    {contestant.experienceYears}y
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col items-start gap-1">
                      <ContestantStatusBadge status={contestant.status} />
                      {contestant.shortlisted ? (
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-sky-300">
                          Shortlisted
                        </span>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <SubmissionStatusBadge
                      status={contestant.submission?.status ?? "NOT_SUBMITTED"}
                    />
                  </TableCell>
                  <TableCell className="hidden text-xs text-muted-foreground xl:table-cell">
                    {formatISTDate(contestant.registeredAt)}
                  </TableCell>
                  <TableCell className="text-right font-display font-semibold tabular-nums">
                    {formatScore(contestant.finalScore)}
                    {contestant.rank ? (
                      <span className="ml-1 text-xs font-normal text-muted-foreground">
                        #{contestant.rank}
                      </span>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap items-center justify-end gap-1.5">
                      <ActionButton
                        action={resendWelcomeEmail}
                        fields={{ contestantRowId: contestant.id }}
                        size="sm"
                        variant="ghost"
                        aria-label="Resend welcome email"
                      >
                        <Mail />
                      </ActionButton>

                      <ActionButton
                        action={toggleShortlist}
                        fields={{
                          contestantRowId: contestant.id,
                          shortlist: !contestant.shortlisted,
                        }}
                        size="sm"
                        variant="ghost"
                        aria-label="Toggle shortlist"
                      >
                        <Star
                          className={
                            contestant.shortlisted ? "text-sky-300" : undefined
                          }
                        />
                      </ActionButton>

                      {contestant.status === "DISQUALIFIED" ? (
                        <ActionButton
                          action={reinstateContestant}
                          fields={{ contestantRowId: contestant.id }}
                          size="sm"
                          variant="secondary"
                          confirm={{
                            title: `Reinstate ${contestant.contestantId}?`,
                            description:
                              "They return to the leaderboard and their submission counts again.",
                          }}
                        >
                          Reinstate
                        </ActionButton>
                      ) : (
                        <ReasonDialogButton
                          action={disqualifyContestant}
                          fields={{ contestantRowId: contestant.id }}
                          title={`Disqualify ${contestant.contestantId}?`}
                          description="They are removed from the leaderboard and pending emails are cancelled. The reason is shown on their dashboard."
                          label="Disqualify"
                          confirmLabel="Disqualify"
                          size="sm"
                          variant="ghost"
                          className="text-rose-300 hover:bg-rose-500/10"
                        />
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
