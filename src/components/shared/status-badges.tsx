import type {
  ContestantStatus,
  EventStatus,
  ReminderStatus,
  SubmissionStatus,
} from "@prisma/client";

import { Badge } from "@/components/ui/badge";
import { EVENT_STATUS_META } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function EventStatusBadge({
  status,
  className,
}: {
  status: EventStatus;
  className?: string;
}) {
  const meta = EVENT_STATUS_META[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold",
        meta.tone,
        className,
      )}
    >
      <span className="relative flex size-1.5">
        <span className="absolute inline-flex size-full animate-pulse-ring rounded-full bg-current" />
        <span className="relative inline-flex size-1.5 rounded-full bg-current" />
      </span>
      {meta.label}
    </span>
  );
}

const CONTESTANT_TONE: Record<
  ContestantStatus,
  Parameters<typeof Badge>[0]["variant"]
> = {
  REGISTERED: "secondary",
  CONFIRMED: "info",
  ACTIVE: "default",
  SUBMITTED: "success",
  SHORTLISTED: "gold",
  DISQUALIFIED: "danger",
  WITHDRAWN: "outline",
};

export function ContestantStatusBadge({ status }: { status: ContestantStatus }) {
  return (
    <Badge variant={CONTESTANT_TONE[status]}>
      {status.charAt(0) + status.slice(1).toLowerCase().replace(/_/g, " ")}
    </Badge>
  );
}

const SUBMISSION_LABEL: Record<
  SubmissionStatus,
  { label: string; variant: Parameters<typeof Badge>[0]["variant"] }
> = {
  NOT_SUBMITTED: { label: "Not submitted", variant: "outline" },
  UPLOADING: { label: "Uploading", variant: "warning" },
  SUBMITTED: { label: "Submitted", variant: "success" },
  LATE: { label: "Late", variant: "warning" },
  REJECTED: { label: "Rejected", variant: "danger" },
};

export function SubmissionStatusBadge({ status }: { status: SubmissionStatus }) {
  const meta = SUBMISSION_LABEL[status];
  return <Badge variant={meta.variant}>{meta.label}</Badge>;
}

const REMINDER_LABEL: Record<ReminderStatus, Parameters<typeof Badge>[0]["variant"]> = {
  SCHEDULED: "info",
  SENDING: "warning",
  SENT: "success",
  FAILED: "danger",
  CANCELLED: "outline",
  SKIPPED: "secondary",
};

export function ReminderStatusBadge({ status }: { status: ReminderStatus }) {
  return (
    <Badge variant={REMINDER_LABEL[status]}>
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </Badge>
  );
}

export function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <Badge variant="gold">🏆 Winner</Badge>;
  if (rank <= 4) return <Badge variant="info">🥈 Runner-up</Badge>;
  return <Badge variant="outline">#{rank}</Badge>;
}
