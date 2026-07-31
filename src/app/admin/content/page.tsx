import { CalendarPlus, HelpCircle, Plus, Trash2, Trophy } from "lucide-react";
import type { Metadata } from "next";

import { ActionButton } from "@/components/admin/action-button";
import { ActionForm, FieldError } from "@/components/admin/action-form";
import { SubmitButton } from "@/components/shared/submit-button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { getActiveHackathon } from "@/lib/hackathon";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { formatIST, toISTInputValue } from "@/lib/utils";
import {
  deleteFaq,
  deletePrize,
  deleteTimelineEvent,
  upsertFaq,
  upsertPrize,
  upsertTimelineEvent,
} from "@/server/actions/admin/content";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Site content" };

const ICON_OPTIONS = ["trophy", "crown", "medal", "award", "gift"];

export default async function AdminContentPage() {
  await requireRole("ADMIN");
  const hackathon = await getActiveHackathon();
  if (!hackathon) return null;

  const [faqs, prizes, timeline] = await Promise.all([
    prisma.faq.findMany({
      where: { hackathonId: hackathon.id },
      orderBy: { order: "asc" },
    }),
    prisma.prize.findMany({
      where: { hackathonId: hackathon.id },
      orderBy: { order: "asc" },
    }),
    prisma.timelineEvent.findMany({
      where: { hackathonId: hackathon.id },
      orderBy: { order: "asc" },
    }),
  ]);

  return (
    <div className="space-y-7">
      <div>
        <p className="label-eyebrow">Landing page</p>
        <h1 className="heading-hero mt-2 text-2xl sm:text-3xl">Site content</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          FAQs, prizes and the public timeline. Changes appear on the landing page
          immediately.
        </p>
      </div>

      <Tabs defaultValue="faqs">
        <TabsList>
          <TabsTrigger value="faqs">FAQs ({faqs.length})</TabsTrigger>
          <TabsTrigger value="prizes">Prizes ({prizes.length})</TabsTrigger>
          <TabsTrigger value="timeline">Timeline ({timeline.length})</TabsTrigger>
        </TabsList>

        {/* ------------------------------ FAQs ------------------------------ */}
        <TabsContent value="faqs" className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>Add an FAQ</CardTitle>
            </CardHeader>
            <CardContent>
              <ActionForm action={upsertFaq} className="space-y-4" resetOnSuccess>
                <>
                  <div className="space-y-2">
                    <Label htmlFor="question">Question</Label>
                    <Input id="question" name="question" required />
                    <FieldError name="question" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="answer">Answer</Label>
                    <Textarea id="answer" name="answer" required />
                    <p className="text-xs text-muted-foreground">
                      Blank lines become separate paragraphs on the landing page.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-end gap-4">
                    <div className="w-24 space-y-2">
                      <Label htmlFor="order">Order</Label>
                      <Input
                        id="order"
                        name="order"
                        type="number"
                        min={0}
                        defaultValue={faqs.length + 1}
                      />
                    </div>
                    <SubmitButton pendingLabel="Adding…">
                      <Plus />
                      Add FAQ
                    </SubmitButton>
                  </div>
                </>
              </ActionForm>
            </CardContent>
          </Card>

          {faqs.map((faq) => (
            <Card key={faq.id}>
              <CardContent className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">#{faq.order}</Badge>
                      {!faq.isPublished ? (
                        <Badge variant="outline">Hidden</Badge>
                      ) : null}
                    </div>
                    <p className="mt-2 font-display text-base font-semibold">
                      {faq.question}
                    </p>
                    <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">
                      {faq.answer}
                    </p>
                  </div>
                  <ActionButton
                    action={deleteFaq}
                    fields={{ id: faq.id }}
                    size="sm"
                    variant="ghost"
                    className="text-rose-300 hover:bg-rose-500/10"
                    confirm={{
                      title: "Delete this FAQ?",
                      description: "It disappears from the landing page immediately.",
                      confirmLabel: "Delete",
                    }}
                    aria-label="Delete FAQ"
                  >
                    <Trash2 />
                  </ActionButton>
                </div>

                <details className="mt-4">
                  <summary className="cursor-pointer text-sm font-medium text-amber-300">
                    Edit
                  </summary>
                  <ActionForm action={upsertFaq} className="mt-4 space-y-4">
                    <>
                      <input type="hidden" name="id" value={faq.id} />
                      <div className="space-y-2">
                        <Label htmlFor={`q-${faq.id}`}>Question</Label>
                        <Input
                          id={`q-${faq.id}`}
                          name="question"
                          defaultValue={faq.question}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`a-${faq.id}`}>Answer</Label>
                        <Textarea
                          id={`a-${faq.id}`}
                          name="answer"
                          defaultValue={faq.answer}
                          required
                        />
                      </div>
                      <div className="flex flex-wrap items-end gap-4">
                        <div className="w-24 space-y-2">
                          <Label htmlFor={`o-${faq.id}`}>Order</Label>
                          <Input
                            id={`o-${faq.id}`}
                            name="order"
                            type="number"
                            min={0}
                            defaultValue={faq.order}
                          />
                        </div>
                        <div className="flex items-center gap-3 pb-2">
                          <input type="hidden" name="isPublished" value="false" />
                          <Checkbox
                            id={`p-${faq.id}`}
                            name="isPublished"
                            value="true"
                            defaultChecked={faq.isPublished}
                          />
                          <Label
                            htmlFor={`p-${faq.id}`}
                            className="text-sm font-normal"
                          >
                            Published
                          </Label>
                        </div>
                        <SubmitButton
                          variant="secondary"
                          size="sm"
                          pendingLabel="Saving…"
                        >
                          Save
                        </SubmitButton>
                      </div>
                    </>
                  </ActionForm>
                </details>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* ----------------------------- Prizes ----------------------------- */}
        <TabsContent value="prizes" className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>Add a prize</CardTitle>
              <CardDescription>
                Position 1 is the champion; 2 and above render as runners-up.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ActionForm action={upsertPrize} className="space-y-4" resetOnSuccess>
                <>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="reward">Reward</Label>
                      <Input id="reward" name="reward" placeholder="iPhone" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="title">Title</Label>
                      <Input
                        id="title"
                        name="title"
                        placeholder="Champion — The Editor Arena 2026"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="position">Position</Label>
                      <Input
                        id="position"
                        name="position"
                        type="number"
                        min={1}
                        defaultValue={prizes.length + 1}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="quantity">Quantity</Label>
                      <Input
                        id="quantity"
                        name="quantity"
                        type="number"
                        min={1}
                        defaultValue={1}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="icon">Icon</Label>
                      <select
                        id="icon"
                        name="icon"
                        className="h-11 w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 text-sm"
                        defaultValue="trophy"
                      >
                        {ICON_OPTIONS.map((icon) => (
                          <option key={icon} value={icon} className="bg-[#171613]">
                            {icon}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="prize-order">Order</Label>
                      <Input
                        id="prize-order"
                        name="order"
                        type="number"
                        min={0}
                        defaultValue={prizes.length + 1}
                      />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea id="description" name="description" />
                    </div>
                  </div>
                  <SubmitButton pendingLabel="Adding…">
                    <Trophy />
                    Add prize
                  </SubmitButton>
                </>
              </ActionForm>
            </CardContent>
          </Card>

          {prizes.map((prize) => (
            <Card key={prize.id}>
              <CardContent className="flex flex-wrap items-start justify-between gap-4 p-5">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Badge variant={prize.position === 1 ? "gold" : "secondary"}>
                      Position {prize.position}
                    </Badge>
                    {prize.quantity > 1 ? (
                      <Badge variant="outline">× {prize.quantity}</Badge>
                    ) : null}
                  </div>
                  <p className="mt-2 font-display text-lg font-bold">{prize.reward}</p>
                  <p className="text-sm text-muted-foreground">{prize.title}</p>
                  {prize.description ? (
                    <p className="mt-1 max-w-xl text-sm text-muted-foreground">
                      {prize.description}
                    </p>
                  ) : null}
                </div>
                <ActionButton
                  action={deletePrize}
                  fields={{ id: prize.id }}
                  size="sm"
                  variant="ghost"
                  className="text-rose-300 hover:bg-rose-500/10"
                  confirm={{
                    title: "Delete this prize?",
                    description: "It is removed from the landing page.",
                    confirmLabel: "Delete",
                  }}
                  aria-label="Delete prize"
                >
                  <Trash2 />
                </ActionButton>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* ---------------------------- Timeline ---------------------------- */}
        <TabsContent value="timeline" className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>Add a timeline entry</CardTitle>
              <CardDescription>All times are entered and shown in IST.</CardDescription>
            </CardHeader>
            <CardContent>
              <ActionForm
                action={upsertTimelineEvent}
                className="space-y-4"
                resetOnSuccess
              >
                <>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="tl-title">Title</Label>
                      <Input id="tl-title" name="title" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="occursAt">Date &amp; time (IST)</Label>
                      <Input
                        id="occursAt"
                        name="occursAt"
                        type="datetime-local"
                        required
                      />
                      <FieldError name="occursAt" />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="tl-description">Description</Label>
                      <Textarea id="tl-description" name="description" />
                    </div>
                    <div className="w-24 space-y-2">
                      <Label htmlFor="tl-order">Order</Label>
                      <Input
                        id="tl-order"
                        name="order"
                        type="number"
                        min={0}
                        defaultValue={timeline.length + 1}
                      />
                    </div>
                  </div>
                  <SubmitButton pendingLabel="Adding…">
                    <CalendarPlus />
                    Add entry
                  </SubmitButton>
                </>
              </ActionForm>
            </CardContent>
          </Card>

          {timeline.map((event) => (
            <Card key={event.id}>
              <CardContent className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">#{event.order}</Badge>
                      {!event.isPublished ? (
                        <Badge variant="outline">Hidden</Badge>
                      ) : null}
                    </div>
                    <p className="mt-2 font-display text-base font-semibold">
                      {event.title}
                    </p>
                    <p className="text-xs tabular-nums text-muted-foreground">
                      {formatIST(event.occursAt)} IST
                    </p>
                    {event.description ? (
                      <p className="mt-1 max-w-xl text-sm text-muted-foreground">
                        {event.description}
                      </p>
                    ) : null}
                  </div>
                  <ActionButton
                    action={deleteTimelineEvent}
                    fields={{ id: event.id }}
                    size="sm"
                    variant="ghost"
                    className="text-rose-300 hover:bg-rose-500/10"
                    confirm={{
                      title: "Delete this entry?",
                      description: "It is removed from the public timeline.",
                      confirmLabel: "Delete",
                    }}
                    aria-label="Delete timeline entry"
                  >
                    <Trash2 />
                  </ActionButton>
                </div>

                <details className="mt-4">
                  <summary className="cursor-pointer text-sm font-medium text-amber-300">
                    Edit
                  </summary>
                  <ActionForm action={upsertTimelineEvent} className="mt-4 space-y-4">
                    <>
                      <input type="hidden" name="id" value={event.id} />
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor={`t-${event.id}`}>Title</Label>
                          <Input
                            id={`t-${event.id}`}
                            name="title"
                            defaultValue={event.title}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`d-${event.id}`}>Date &amp; time (IST)</Label>
                          <Input
                            id={`d-${event.id}`}
                            name="occursAt"
                            type="datetime-local"
                            defaultValue={toISTInputValue(event.occursAt)}
                            required
                          />
                        </div>
                        <div className="space-y-2 sm:col-span-2">
                          <Label htmlFor={`desc-${event.id}`}>Description</Label>
                          <Textarea
                            id={`desc-${event.id}`}
                            name="description"
                            defaultValue={event.description ?? ""}
                          />
                        </div>
                        <div className="flex flex-wrap items-end gap-4 sm:col-span-2">
                          <div className="w-24 space-y-2">
                            <Label htmlFor={`ord-${event.id}`}>Order</Label>
                            <Input
                              id={`ord-${event.id}`}
                              name="order"
                              type="number"
                              min={0}
                              defaultValue={event.order}
                            />
                          </div>
                          <div className="flex items-center gap-3 pb-2">
                            <input type="hidden" name="isPublished" value="false" />
                            <Checkbox
                              id={`pub-${event.id}`}
                              name="isPublished"
                              value="true"
                              defaultChecked={event.isPublished}
                            />
                            <Label
                              htmlFor={`pub-${event.id}`}
                              className="text-sm font-normal"
                            >
                              Published
                            </Label>
                          </div>
                          <SubmitButton
                            variant="secondary"
                            size="sm"
                            pendingLabel="Saving…"
                          >
                            Save
                          </SubmitButton>
                        </div>
                      </div>
                    </>
                  </ActionForm>
                </details>
              </CardContent>
            </Card>
          ))}

          {timeline.length === 0 ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <HelpCircle className="size-4" />
              No timeline entries — the section is hidden on the landing page.
            </p>
          ) : null}
        </TabsContent>
      </Tabs>
    </div>
  );
}
