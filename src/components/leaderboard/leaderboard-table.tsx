import { Crown, Medal, Trophy } from "lucide-react";

import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { LeaderboardRow } from "@/lib/scoring";
import { cn, formatScore } from "@/lib/utils";

/** Top-three podium plus the full ranked table. */
export function LeaderboardTable({
  rows,
  highlightContestantId,
}: {
  rows: LeaderboardRow[];
  highlightContestantId?: string | null;
}) {
  const podium = rows.filter((row) => row.rank <= 4);

  return (
    <div className="space-y-8">
      {podium.length > 0 ? (
        <div className="grid gap-4 lg:grid-cols-4">
          {podium.map((row) => {
            const isWinner = row.rank === 1;
            const Icon = isWinner ? Crown : row.rank === 2 ? Trophy : Medal;

            return (
              <Card
                key={row.contestantRowId}
                className={cn(
                  "relative overflow-hidden p-5",
                  isWinner
                    ? "border-sky-400/30 bg-gradient-to-br from-sky-500/[0.1] via-white/[0.02] to-transparent lg:col-span-4 lg:flex lg:items-center lg:justify-between lg:gap-8 lg:p-7"
                    : "glass-hover",
                )}
              >
                <div className="flex items-center gap-4">
                  <span
                    className={cn(
                      "grid size-12 shrink-0 place-items-center rounded-xl",
                      isWinner
                        ? "bg-gradient-to-br from-sky-400 to-blue-600 text-black"
                        : "bg-white/[0.06] text-sky-200",
                    )}
                  >
                    <Icon className="size-6" />
                  </span>
                  <div className="min-w-0">
                    <p className={cn("label-eyebrow", isWinner && "text-sky-300/80")}>
                      {isWinner ? "Champion" : `Rank ${row.rank}`}
                    </p>
                    <p
                      className={cn(
                        "mt-1 truncate font-display font-bold tracking-tight",
                        isWinner ? "text-2xl sm:text-3xl" : "text-lg",
                      )}
                    >
                      {row.name}
                    </p>
                    <p className="mt-0.5 font-mono text-xs tracking-wider text-muted-foreground">
                      {row.contestantId} · {row.city}
                    </p>
                  </div>
                </div>

                <div className={cn("mt-4 lg:mt-0", isWinner && "lg:text-right")}>
                  <p className="label-eyebrow">Final score</p>
                  <p
                    className={cn(
                      "font-display font-bold tabular-nums tracking-tight",
                      isWinner ? "text-4xl text-sky-200" : "text-2xl",
                    )}
                  >
                    {formatScore(row.averageScore)}
                    <span className="text-base font-medium text-muted-foreground">
                      {" "}
                      / 10
                    </span>
                  </p>
                </div>
              </Card>
            );
          })}
        </div>
      ) : null}

      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">Rank</TableHead>
              <TableHead>Contestant ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead className="hidden sm:table-cell">City</TableHead>
              <TableHead className="hidden md:table-cell">Experience</TableHead>
              <TableHead className="hidden md:table-cell">Judges</TableHead>
              <TableHead className="text-right">Average score</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => {
              const isYou = highlightContestantId === row.contestantId;
              return (
                <TableRow
                  key={row.contestantRowId}
                  className={cn(isYou && "bg-sky-500/10 hover:bg-sky-500/15")}
                >
                  <TableCell className="font-display font-bold tabular-nums">
                    {row.rank === 1 ? "🏆" : `#${row.rank}`}
                  </TableCell>
                  <TableCell className="font-mono text-xs tracking-wider text-muted-foreground">
                    {row.contestantId}
                  </TableCell>
                  <TableCell className="font-medium">
                    {row.name}
                    {isYou ? (
                      <span className="ml-2 rounded-full bg-sky-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-sky-200">
                        You
                      </span>
                    ) : null}
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground sm:table-cell">
                    {row.city}
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground md:table-cell">
                    {row.experienceYears} yr{row.experienceYears === 1 ? "" : "s"}
                  </TableCell>
                  <TableCell className="hidden tabular-nums text-muted-foreground md:table-cell">
                    {row.ratingsCount}
                  </TableCell>
                  <TableCell className="text-right font-display font-bold tabular-nums">
                    {formatScore(row.averageScore)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
