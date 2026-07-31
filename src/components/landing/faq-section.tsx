import type { Faq } from "@prisma/client";
import Link from "next/link";

import { Reveal } from "@/components/landing/reveal";
import { SectionHeading } from "@/components/landing/section-heading";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { BRAND } from "@/lib/constants";

export function FaqSection({ faqs }: { faqs: Faq[] }) {
  if (faqs.length === 0) return null;

  return (
    <section id="faq" className="relative scroll-mt-24 py-12 sm:py-16">
      <div className="container">
        <div className="grid gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
          <div>
            <SectionHeading
              eyebrow="FAQ"
              title="Questions,"
              accent="Answered"
              description="Anything not covered here? Write to us — we answer every email before the event."
            />
            <Reveal delay={0.1} className="mt-6">
              <Link
                href={`mailto:${BRAND.supportEmail}`}
                className="text-sm font-semibold text-amber-300 underline-offset-4 hover:underline"
              >
                {BRAND.supportEmail}
              </Link>
            </Reveal>
          </div>

          <Reveal delay={0.08}>
            <Accordion type="single" collapsible className="flex flex-col gap-3">
              {faqs.map((faq) => (
                <AccordionItem key={faq.id} value={faq.id}>
                  <AccordionTrigger>{faq.question}</AccordionTrigger>
                  <AccordionContent>
                    {/* Answers are admin-authored plain text; newlines become paragraphs. */}
                    {faq.answer.split(/\n{2,}/).map((paragraph, index) => (
                      <p key={index} className={index > 0 ? "mt-3" : undefined}>
                        {paragraph}
                      </p>
                    ))}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
