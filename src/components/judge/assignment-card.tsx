import { CheckCircle2, Clock, ExternalLink, PlayCircle } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatIST } from "@/lib/utils";

export type AssignmentCardData = {
  submissionId: string;
  contestantId: string;
  name: string;
  experienceYears: number;
  /** Historical: no longer collected at registration. */
  jobRole: string | null;
  city: string;
  portfolioUrl: string;
  uploadedAt: Date | null;
  isLate: boolean;
  hasDraft: boolean;
  isSubmitted: boolean;
  overallScore: number | null;
};

export function AssignmentCard({ data }: { data: AssignmentCardData }) {
  return (
    <Card className="glass-hover">
      <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs font-semibold tracking-wider text-sky-300">
              {data.contestantId}
            </span>
            {data.isSubmitted ? (
              <Badge variant="success">
                <CheckCircle2 />
                Scored {data.overallScore?.toFixed(1)}
              </Badge>
            ) : data.hasDraft ? (
              <Badge variant="warning">Draft saved</Badge>
            ) : (
              <Badge variant="outline">Not started</Badge>
            )}
            {data.isLate ? <Badge variant="warning">Late</Badge> : null}
          </div>

          <p className="truncate font-display text-base font-semibold">{data.name}</p>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span>
              {data.experienceYears} yr{data.experienceYears === 1 ? "" : "s"}{" "}
              experience
            </span>
            <span>{data.jobRole ?? "—"}</span>
            <span>{data.city}</span>
            <span className="inline-flex items-center gap-1">
              <Clock className="size-3" />
              {formatIST(data.uploadedAt)}
            </span>
          </div>

          <a
            href={data.portfolioUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-primary underline-offset-4 hover:underline"
          >
            Portfolio
            <ExternalLink className="size-3" />
          </a>
        </div>

        <Button asChild variant={data.isSubmitted ? "secondary" : "default"}>
          <Link href={`/judge/review/${data.submissionId}`}>
            <PlayCircle />
            {data.isSubmitted ? "View review" : "Review submission"}
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
