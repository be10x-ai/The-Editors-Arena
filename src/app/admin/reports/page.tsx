import { Download, FileText, Trophy } from "lucide-react";
import type { Metadata } from "next";

import { StatCard } from "@/components/shared/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { HIRING_RECOMMENDATION_META } from "@/lib/constants";
import { getActiveHackathon } from "@/lib/hackathon";
import { requireRole } from "@/lib/rbac";
import { buildHiringReport } from "@/lib/reports/hiring-report";
import { formatScore } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Reports" };

export default async function AdminReportsPage() {
  await requireRole("ADMIN");
  const hackathon = await getActiveHackathon();
  if (!hackathon) return null;

  const report = await buildHiringReport(hackathon.id);

  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="label-eyebrow">Post-event</p>
          <h1 className="heading-hero mt-2 text-2xl sm:text-3xl">Reports</h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Built from finalised scorecards only — drafts are never included.
            Recommendation is the consensus across judges, breaking ties conservatively.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="secondary" size="sm">
            <a href="/api/reports/hiring?format=csv">
              <Download />
              Results CSV
            </a>
          </Button>
          <Button asChild variant="secondary" size="sm">
            <a href="/api/reports/hiring?format=registrations-csv">
              <Download />
              Registrations CSV
            </a>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Registered" value={report.totalRegistered} tone="gold" />
        <StatCard
          label="Valid submissions"
          value={report.totalSubmitted}
          tone="steel"
        />
        <StatCard
          label="Judged"
          value={report.totalJudged}
          icon={Trophy}
          tone="emerald"
        />
      </div>

      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle>Preview</CardTitle>
          <CardDescription>Exactly what the exports contain, ranked.</CardDescription>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          {report.rows.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon={FileText}
                title="Nothing to report yet"
                description="Once submissions are judged, the hiring report fills in automatically."
              />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rank</TableHead>
                  <TableHead>Candidate</TableHead>
                  <TableHead className="hidden md:table-cell">Experience</TableHead>
                  <TableHead className="text-right">Score</TableHead>
                  <TableHead className="hidden text-right sm:table-cell">
                    Judges
                  </TableHead>
                  <TableHead className="hidden text-right lg:table-cell">
                    Spread
                  </TableHead>
                  <TableHead>Recommendation</TableHead>
                  <TableHead className="hidden xl:table-cell">Top strengths</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.rows.map((row) => (
                  <TableRow key={row.contestantId}>
                    <TableCell className="font-display font-bold tabular-nums">
                      {row.rank ? `#${row.rank}` : "—"}
                    </TableCell>
                    <TableCell>
                      <p className="font-mono text-xs tracking-wider text-sky-300">
                        {row.contestantId}
                      </p>
                      <p className="mt-0.5 font-medium">{row.name}</p>
                      <p className="text-xs text-muted-foreground">{row.city}</p>
                    </TableCell>
                    <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
                      {row.experienceYears}y · {row.jobRole}
                    </TableCell>
                    <TableCell className="text-right font-display font-bold tabular-nums">
                      {formatScore(row.finalScore)}
                    </TableCell>
                    <TableCell className="hidden text-right tabular-nums text-muted-foreground sm:table-cell">
                      {row.judgeCount}
                    </TableCell>
                    <TableCell className="hidden text-right tabular-nums lg:table-cell">
                      <span
                        className={
                          (row.spread ?? 0) > 2
                            ? "text-sky-300"
                            : "text-muted-foreground"
                        }
                      >
                        {row.spread?.toFixed(2) ?? "—"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${HIRING_RECOMMENDATION_META[row.recommendation].tone}`}
                      >
                        {HIRING_RECOMMENDATION_META[row.recommendation].label}
                      </span>
                    </TableCell>
                    <TableCell className="hidden xl:table-cell">
                      <div className="flex flex-wrap gap-1.5">
                        {row.strengths.slice(0, 2).map((strength) => (
                          <Badge key={strength} variant="secondary">
                            {strength}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
