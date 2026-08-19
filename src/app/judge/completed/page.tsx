import { CheckCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RATING_CRITERIA } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { formatIST } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Completed reviews" };

export default async function CompletedReviewsPage() {
  const user = await requireRole("JUDGE", "ADMIN");
  if (!user.judgeId) redirect("/judge");

  const ratings = await prisma.rating.findMany({
    where: { judgeId: user.judgeId, isSubmitted: true },
    orderBy: { submittedAt: "desc" },
    include: {
      submission: {
        select: {
          id: true,
          contestant: { select: { contestantId: true, fullName: true } },
        },
      },
    },
  });

  return (
    <div className="space-y-7">
      <div>
        <p className="label-eyebrow">Judge portal</p>
        <h1 className="heading-hero mt-2 text-2xl sm:text-3xl">Completed reviews</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Your submitted scorecards, locked. Ask an admin to unlock one if you need to
          correct it.
        </p>
      </div>

      {ratings.length === 0 ? (
        <EmptyState
          icon={CheckCheck}
          title="No submitted reviews yet"
          description="Scorecards you finalise appear here."
          action={
            <Button asChild variant="secondary">
              <Link href="/judge">Go to my queue</Link>
            </Button>
          }
        />
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Contestant</TableHead>
                {RATING_CRITERIA.map((criterion) => (
                  <TableHead
                    key={criterion.key}
                    className="hidden text-right lg:table-cell"
                  >
                    {criterion.label.split(" ")[0]}
                  </TableHead>
                ))}
                <TableHead className="text-right">Overall</TableHead>
                <TableHead className="hidden sm:table-cell">Submitted</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {ratings.map((rating) => (
                <TableRow key={rating.id}>
                  <TableCell>
                    <p className="font-mono text-xs tracking-wider text-sky-300">
                      {rating.submission.contestant.contestantId}
                    </p>
                    <p className="mt-0.5 font-medium">
                      {rating.submission.contestant.fullName}
                    </p>
                  </TableCell>
                  {RATING_CRITERIA.map((criterion) => (
                    <TableCell
                      key={criterion.key}
                      className="hidden text-right tabular-nums text-muted-foreground lg:table-cell"
                    >
                      {rating[criterion.key].toFixed(1)}
                    </TableCell>
                  ))}
                  <TableCell className="text-right font-display font-bold tabular-nums">
                    {rating.overallScore.toFixed(1)}
                  </TableCell>
                  <TableCell className="hidden text-xs text-muted-foreground sm:table-cell">
                    {formatIST(rating.submittedAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button asChild size="sm" variant="ghost">
                      <Link href={`/judge/review/${rating.submission.id}`}>View</Link>
                    </Button>
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
