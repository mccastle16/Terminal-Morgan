"use client";

// Content Studio client — the legacy ContentStudioPage template engine
// (4 content types × 4 tones) ported with two honest changes: no emojis, and
// no fabricated 4.0 fallback rating — unrated businesses get rating-free copy.

import { useState } from "react";
import { Card, ghostBtnCls, primaryBtnCls, SectionLabel } from "@/components/terminal/ui";

export type ContentBusiness = {
  name: string;
  category: string;
  neighborhood: string | null;
  rating: number | null;
  delight: string | null;
};

const CONTENT_TYPES = [
  { id: "email", label: "Email" },
  { id: "social", label: "Social post" },
  { id: "blog", label: "Blog outline" },
  { id: "ad", label: "Ad copy" },
] as const;

const TONES = ["professional", "friendly", "persuasive", "urgent"] as const;

type ContentType = (typeof CONTENT_TYPES)[number]["id"];
type Tone = (typeof TONES)[number];

function generate(b: ContentBusiness, type: ContentType, tone: Tone): string {
  const name = b.name;
  const cat = b.category.toLowerCase();
  const hood = b.neighborhood ?? "Coral Gables";
  const delight = b.delight ?? "quality service";
  const r = b.rating != null ? b.rating.toFixed(1) : null;
  const starPhrase = r ? `${r}-star` : "trusted";
  const ratingFact = r
    ? `${r}/5.0 average rating across review platforms`
    : "An established presence in the local directory";
  const ratingBrag = r ? `our ${r}-star rating shows it` : "our community shows it";
  const hashHood = hood.replace(/[\s/]/g, "");
  const hashCat = b.category.replace(/[\s&/]/g, "");

  const templates: Record<ContentType, Record<Tone, string>> = {
    email: {
      professional: `Subject: Partner with ${name} — ${cat} in ${hood}\n\nDear [Contact],\n\nI'm reaching out from ${name}, a ${starPhrase} ${cat} business proudly serving the ${hood} community.\n\nOur clients consistently highlight our ${delight}, and we believe there's a strong opportunity for collaboration.\n\nKey highlights:\n- ${ratingFact}\n- Established presence in ${hood}\n- Known for: ${delight}\n\nI'd welcome the chance to discuss how we can create value together.\n\nBest regards,\n[Your Name]\n${name}`,
      friendly: `Hey there!\n\nJust wanted to introduce myself — I'm with ${name}, your neighborhood ${cat} spot in ${hood}.\n\nWe've been getting great feedback${r ? ` (${r} stars!)` : ""} especially for our ${delight}. Would love to connect and see if there's a way we can work together!\n\nLet me know if you're up for a quick chat.\n\nCheers,\n[Your Name]`,
      persuasive: `Subject: ${name} — why ${hood}'s businesses choose us\n\nHere's the thing about working with a ${starPhrase} ${cat} business: results speak louder than words.\n\n${name} has built its reputation on ${delight}. Our clients don't just come back — they bring others.\n\nThe opportunity:\n- Tap into our loyal ${hood} customer base\n- Align your brand with a proven local presence\n- Benefit from our ${delight}\n\nLet's talk about what this could look like for you.\n\n[Your Name]\n${name}`,
      urgent: `Subject: Time-sensitive — ${name} partnership opportunity\n\n[Contact],\n\nWe have a limited window to bring on new partners this quarter, and given your position in ${hood}, ${name} could be the right fit.\n\nQuick facts:\n- ${starPhrase} ${cat} business\n- Strong in: ${delight}\n- Active in ${hood}\n\nCan we connect this week?\n\n[Your Name]`,
    },
    social: {
      professional: `At ${name}, we're proud to be part of the ${hood} business community.\n\nWith a ${starPhrase} reputation in ${cat}, our team is committed to delivering ${delight} every single day.\n\n#${hashHood} #LocalBusiness #${hashCat}`,
      friendly: `Love what we do at ${name}!\n\nServing ${hood} with ${delight} — and ${ratingBrag}!\n\nCome visit us and see what everyone's talking about.\n\n#ShopLocal #${hashHood}`,
      persuasive: `Looking for a ${starPhrase} ${cat} experience in ${hood}?\n\n${name} delivers ${delight} that keeps our clients coming back.\n\nDon't take our word for it — check our reviews.\n\n#${hashHood} #TopRated`,
      urgent: `This week only at ${name}!\n\n${hood}'s ${starPhrase} ${cat} destination has something special lined up.\n\nKnown for ${delight} — don't miss out!\n\n#LimitedTime #${hashHood}`,
    },
    blog: {
      professional: `# How ${name} Became a Go-To ${b.category} Business in ${hood}\n\n## Introduction\nIn the competitive landscape of ${hood}, standing out takes more than luck. ${name} has earned a ${starPhrase} reputation through consistent excellence.\n\n## What Sets Us Apart\n- Core strength: ${delight}\n- Community trust: active member of the ${hood} business ecosystem\n- ${ratingFact}\n\n## Looking Ahead\n[Add forward-looking strategy, expansion plans, or community initiatives]\n\n## Call to Action\nReady to experience the difference? Visit ${name} today.`,
      friendly: `# Meet ${name} — Your Neighborhood ${b.category} Friend\n\nHey ${hood}! Let's talk about what makes ${name} special.\n\nSpoiler: it's the ${delight}.${r ? ` (And our ${r} stars don't hurt either!)` : ""}\n\n## Why Our Customers Love Us\nIt's simple — we treat every person who walks through our door like family.\n\n## Come See For Yourself\nSwing by and say hi!`,
      persuasive: `# ${r ? `${r} Stars and Counting: ` : ""}The ${name} Story\n\n## The Challenge\nEvery ${cat} business in ${hood} claims to be the best. ${name} lets the record do the talking.\n\n## The Proof\n- ${ratingFact}\n- Known for: ${delight}\n- Trusted by the ${hood} community\n\n## The Bottom Line\nWhen quality matters, ${name} delivers.`,
      urgent: `# Why NOW Is the Time to Partner with ${name}\n\n## The Window\n${hood}'s ${cat} market is evolving fast. ${name}'s ${starPhrase} track record positions us — and our partners — for what's next.\n\n## Act Now\n- Limited partnership slots this quarter\n- Proven: ${delight}\n- ${hood}'s trust\n\n## Next Steps\nReach out today before spots fill up.`,
    },
    ad: {
      professional: `${name} | ${starPhrase} ${cat} in ${hood}\n\nTrusted for ${delight}.${r ? " Verified reviews. Real results." : " Real results."}\n\nLearn more`,
      friendly: `Love great ${cat}? ${name} has you covered!${r ? ` ${r} stars in ${hood}.` : ` Right here in ${hood}.`}\n\nTry us out`,
      persuasive: `${r ? `${r} stars. ` : ""}${hood}'s ${cat} choice.\n\n${name}: ${delight} that speaks for itself.\n\nSee why`,
      urgent: `${name} — limited availability!\n${starPhrase} ${cat} · ${hood}\n${delight}\n\nBook now`,
    },
  };

  return templates[type][tone];
}

const selectorBtn = (active: boolean) =>
  `inline-flex cursor-pointer items-center rounded-pills px-3 py-1 text-caption transition-colors duration-150 ${
    active
      ? "bg-white/[0.08] text-paper"
      : "bg-white/[0.03] text-fog hover:bg-white/[0.06] hover:text-mist"
  }`;

export function ContentClient({ business }: { business: ContentBusiness }) {
  const [type, setType] = useState<ContentType>("email");
  const [tone, setTone] = useState<Tone>("professional");
  const [output, setOutput] = useState("");
  const [copied, setCopied] = useState(false);

  function copy() {
    void navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
      {/* Controls */}
      <div className="space-y-6">
        <div>
          <SectionLabel>Content type</SectionLabel>
          <div className="mt-2 flex flex-wrap gap-2">
            {CONTENT_TYPES.map((ct) => (
              <button
                key={ct.id}
                onClick={() => setType(ct.id)}
                className={selectorBtn(type === ct.id)}
              >
                {ct.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <SectionLabel>Tone</SectionLabel>
          <div className="mt-2 flex flex-wrap gap-2">
            {TONES.map((t) => (
              <button
                key={t}
                onClick={() => setTone(t)}
                className={selectorBtn(tone === t) + " capitalize"}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={() => setOutput(generate(business, type, tone))}
          className={primaryBtnCls()}
        >
          Generate content
        </button>

        <p className="text-label text-ash">
          Template-based, filled with real snapshot facts —{" "}
          {business.rating != null
            ? `${business.rating.toFixed(1)} rating`
            : "no public rating yet, so copy stays rating-free"}
          {business.delight ? `, praised for “${business.delight}”` : ""}.
        </p>
      </div>

      {/* Output */}
      <Card className="lg:col-span-2" padded={false}>
        <div className="flex items-center justify-between border-b border-graphite px-5 py-3">
          <p className="text-caption text-mist">
            {CONTENT_TYPES.find((c) => c.id === type)?.label} — {business.name}
          </p>
          {output && (
            <button onClick={copy} className={ghostBtnCls()}>
              {copied ? "Copied" : "Copy"}
            </button>
          )}
        </div>
        <div className="min-h-[320px] p-5">
          {output ? (
            <pre className="whitespace-pre-wrap font-sans text-body-sm text-mist">
              {output}
            </pre>
          ) : (
            <p className="flex h-full items-center justify-center py-16 text-center text-caption text-fog">
              Pick a type and tone, then generate.
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}
