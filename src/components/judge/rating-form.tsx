"use client";

import { AlertTriangle, Info, Lock, Save, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { useActionState } from "react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { HIRING_RECOMMENDATION_META, RATING_CRITERIA } from "@/lib/constants";
import { round } from "@/lib/utils";
import { saveRating } from "@/server/actions/judging";
import { idleState } from "@/server/actions/types";

export type RatingDraft = {
  creativity: number;
  storytelling: number;
  editingSkill: number;
  motionGraphics: number;
  soundDesign: number;
  technicalQuality: number;
  overallScore: number;
  comment: string;
  strengths: string;
  weaknesses: string;
  recommendation: keyof typeof HIRING_RECOMMENDATION_META;
};

const EMPTY_DRAFT: RatingDraft = {
  creativity: 5,
  storytelling: 5,
  editingSkill: 5,
  motionGraphics: 5,
  soundDesign: 5,
  technicalQuality: 5,
  overallScore: 5,
  comment: "",
  strengths: "",
  weaknesses: "",
  recommendation: "KEEP_WARM",
};

/**
 * Scorecard. Sliders move in 0.1 steps across 0.0–10.0 and the weighted
 * criteria mean is shown live next to the judge's own overall score, so drift
 * between the two is visible before they commit.
 */
export function RatingForm({
  submissionId,
  initial,
  locked,
  readOnly,
}: {
  submissionId: string;
  initial?: Partial<RatingDraft> | null;
  locked: boolean;
  readOnly: boolean;
}) {
  const router = useRouter();
  const [state, formAction] = useActionState(saveRating, idleState as never);
  const [draft, setDraft] = React.useState<RatingDraft>({
    ...EMPTY_DRAFT,
    ...(initial ?? {}),
  });

  React.useEffect(() => {
    if (state.status === "success") {
      toast.success(state.message ?? "Saved.");
      router.refresh();
    }
    if (state.status === "error") toast.error(state.message ?? "Could not save.");
  }, [state, router]);

  const weighted = round(
    RATING_CRITERIA.reduce(
      (sum, criterion) => sum + draft[criterion.key] * criterion.weight,
      0,
    ),
    2,
  );

  const drift = Math.abs(weighted - draft.overallScore);
  const disabled = readOnly || locked;

  function set<K extends keyof RatingDraft>(key: K, value: RatingDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="submissionId" value={submissionId} />
      {RATING_CRITERIA.map((criterion) => (
        <input
          key={criterion.key}
          type="hidden"
          name={criterion.key}
          value={draft[criterion.key]}
        />
      ))}
      <input type="hidden" name="overallScore" value={draft.overallScore} />

      {readOnly ? (
        <Alert variant="success">
          <Lock />
          <div>
            <AlertTitle>Scorecard submitted</AlertTitle>
            <AlertDescription>
              Your scores are final. If something needs correcting, ask an admin to
              unlock this scorecard.
            </AlertDescription>
          </div>
        </Alert>
      ) : null}

      {locked && !readOnly ? (
        <Alert variant="warning">
          <Lock />
          <div>
            <AlertTitle>Judging is locked</AlertTitle>
            <AlertDescription>
              The organisers have frozen scoring. No further changes can be saved.
            </AlertDescription>
          </div>
        </Alert>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Criteria · 0.0 – 10.0</CardTitle>
        </CardHeader>
        <CardContent className="space-y-7">
          {RATING_CRITERIA.map((criterion) => (
            <div key={criterion.key}>
              <div className="flex items-baseline justify-between gap-4">
                <Label htmlFor={`slider-${criterion.key}`}>
                  {criterion.label}
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    {Math.round(criterion.weight * 100)}%
                  </span>
                </Label>
                <output className="font-display text-lg font-bold tabular-nums text-sky-200">
                  {draft[criterion.key].toFixed(1)}
                </output>
              </div>
              <Slider
                id={`slider-${criterion.key}`}
                min={0}
                max={10}
                step={0.1}
                value={[draft[criterion.key]]}
                onValueChange={([value]) => set(criterion.key, value)}
                disabled={disabled}
                className="mt-3"
                aria-label={criterion.label}
              />
              <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                {criterion.help}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card
        className={drift > 1.5 ? "border-sky-500/30 bg-sky-500/[0.06]" : undefined}
      >
        <CardHeader>
          <CardTitle>Overall score</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div>
            <div className="flex items-baseline justify-between gap-4">
              <Label htmlFor="slider-overall">
                Your holistic call — this is what the ranking uses
              </Label>
              <output className="font-display text-2xl font-bold tabular-nums">
                {draft.overallScore.toFixed(1)}
              </output>
            </div>
            <Slider
              id="slider-overall"
              min={0}
              max={10}
              step={0.1}
              value={[draft.overallScore]}
              onValueChange={([value]) => set("overallScore", value)}
              disabled={disabled}
              className="mt-3"
              aria-label="Overall score"
            />
          </div>

          <div className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3.5">
            <Info className="mt-0.5 size-4 shrink-0 text-primary" />
            <p className="text-xs leading-relaxed text-muted-foreground">
              Weighted average of your six criteria:{" "}
              <span className="font-semibold tabular-nums text-foreground">
                {weighted.toFixed(2)}
              </span>
              .{" "}
              {drift > 1.5
                ? "That is more than 1.5 points from your overall score — worth a second look before you finalise."
                : "Your overall score is consistent with your criteria."}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Written feedback</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="comment">Comment *</Label>
            <Textarea
              id="comment"
              name="comment"
              value={draft.comment}
              onChange={(event) => set("comment", event.target.value)}
              placeholder="What worked, what didn't, and what you'd fix first. This goes into the contestant's scorecard and the hiring report."
              className="min-h-[140px]"
              disabled={disabled}
              required
            />
            <p className="text-xs text-muted-foreground">
              {draft.comment.trim().length} characters · minimum 20
            </p>
            {state.fieldErrors?.comment ? (
              <p className="text-xs font-medium text-rose-300">
                {state.fieldErrors.comment[0]}
              </p>
            ) : null}
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="strengths">Strengths</Label>
              <Textarea
                id="strengths"
                name="strengths"
                value={draft.strengths}
                onChange={(event) => set("strengths", event.target.value)}
                placeholder="Optional — one or two lines."
                disabled={disabled}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="weaknesses">Weaknesses</Label>
              <Textarea
                id="weaknesses"
                name="weaknesses"
                value={draft.weaknesses}
                onChange={(event) => set("weaknesses", event.target.value)}
                placeholder="Optional — be specific and actionable."
                disabled={disabled}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="recommendation">Hiring recommendation *</Label>
            <Select
              name="recommendation"
              value={draft.recommendation}
              onValueChange={(value) =>
                set("recommendation", value as RatingDraft["recommendation"])
              }
              disabled={disabled}
            >
              <SelectTrigger id="recommendation">
                <SelectValue placeholder="Select a recommendation" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(HIRING_RECOMMENDATION_META).map(([value, meta]) => (
                  <SelectItem key={value} value={value}>
                    {meta.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {!disabled ? (
        <>
          <Alert variant="warning">
            <AlertTriangle />
            <div>
              <AlertTitle>Submitting locks your scores</AlertTitle>
              <AlertDescription>
                Save as a draft as often as you like. Once you submit, only an admin can
                reopen the scorecard.
              </AlertDescription>
            </div>
          </Alert>

          {/* `finalise` rides on the submitter's name/value rather than state:
              a click handler's setState is not guaranteed to have flushed by the
              time the form serialises, which would silently save a draft as final
              (or the reverse). */}
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              type="submit"
              name="finalise"
              value="false"
              variant="secondary"
              className="sm:w-auto"
            >
              <Save />
              Save draft
            </Button>
            <Button
              type="submit"
              name="finalise"
              value="true"
              disabled={draft.comment.trim().length < 20}
              className="sm:w-auto"
            >
              <Send />
              Submit review
            </Button>
          </div>
        </>
      ) : null}
    </form>
  );
}
