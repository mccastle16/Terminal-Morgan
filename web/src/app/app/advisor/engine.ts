// AI Adviser engine — LOCAL rule-based port of the legacy intent model
// (dashboard/src/terminal/tactical/engine/businessAdvisor.js + advisorRouter):
// keyword-regex intent classification + substring entity extraction, retyped
// over the new public-safe snapshot. No API calls — every answer is computed
// here, in the browser, from the serialized dataset the server page provides.

export type AdvisorBusiness = {
  slug: string;
  name: string;
  category_slug: string;
  neighborhood_label: string | null;
  rating: number | null;
  review_count: number | null;
  website: string | null;
  phone: string | null;
  /** TRI-STATE: true member · false confirmed non-member · null unknown. */
  chamber_member: boolean | null;
};

export type AdvisorStats = {
  total: number;
  members: number;
  categories: number;
  neighborhoods: number;
};

export type AdvisorDataset = {
  businesses: AdvisorBusiness[];
  categoryLabels: Record<string, string>;
  neighborhoods: string[];
  stats: AdvisorStats;
};

export type AdvisorCard =
  | { kind: "stats"; title: string; items: { label: string; value: string }[] }
  | { kind: "table"; title: string; columns: string[]; rows: string[][] }
  | {
      kind: "list";
      title: string;
      items: { primary: string; secondary: string; value: string }[];
    }
  | {
      kind: "bar";
      title: string;
      data: { label: string; value: number }[];
      note?: string;
    };

export type AdvisorResponse = { text: string; card?: AdvisorCard };

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmtInt(n: number): string {
  return n.toLocaleString("en-US");
}

function memberLabel(b: AdvisorBusiness): string {
  if (b.chamber_member === true) return "Member";
  if (b.chamber_member === false) return "Non-member";
  return "Unknown";
}

function label(ds: AdvisorDataset, slug: string): string {
  return ds.categoryLabels[slug] ?? slug;
}

// ── Entity extraction (substring match, as in the legacy engine) ────────────

function findBusinesses(msg: string, ds: AdvisorDataset): AdvisorBusiness[] {
  const m = msg.toLowerCase();
  const hits: { b: AdvisorBusiness; pos: number }[] = [];
  for (const b of ds.businesses) {
    const name = b.name.toLowerCase();
    if (name.length < 4) continue;
    const pos = m.indexOf(name);
    if (pos >= 0) hits.push({ b, pos });
  }
  // earliest first; on overlap prefer the longer name, drop nested matches
  hits.sort((a, z) => a.pos - z.pos || z.b.name.length - a.b.name.length);
  const out: AdvisorBusiness[] = [];
  let lastEnd = -1;
  for (const h of hits) {
    if (h.pos >= lastEnd) {
      out.push(h.b);
      lastEnd = h.pos + h.b.name.length;
    }
  }
  return out;
}

const CATEGORY_ALIASES: Record<string, string> = {
  restaurant: "food_beverage",
  dining: "food_beverage",
  cafe: "food_beverage",
  coffee: "food_beverage",
  lawyer: "legal",
  attorney: "legal",
  "law firm": "legal",
  doctor: "healthcare",
  medical: "healthcare",
  clinic: "healthcare",
  dentist: "healthcare",
  shop: "retail",
  store: "retail",
  boutique: "retail",
  hotel: "hospitality",
  gym: "wellness",
  fitness: "wellness",
  spa: "wellness",
  salon: "personal_services",
  bank: "banking",
  software: "technology",
  realtor: "real_estate",
  "real estate": "real_estate",
};

function findCategories(msg: string, ds: AdvisorDataset): string[] {
  const m = msg.toLowerCase();
  const out: string[] = [];
  for (const [slug, lbl] of Object.entries(ds.categoryLabels)) {
    if (slug === "other") continue; // "other" false-positives on plain English
    if (m.includes(lbl.toLowerCase()) || m.includes(slug.replace(/_/g, " "))) {
      if (!out.includes(slug)) out.push(slug);
    }
  }
  for (const [alias, slug] of Object.entries(CATEGORY_ALIASES)) {
    if (m.includes(alias) && !out.includes(slug)) out.push(slug);
  }
  return out;
}

function findNeighborhoods(msg: string, ds: AdvisorDataset): string[] {
  const m = msg.toLowerCase();
  return ds.neighborhoods.filter((n) => m.includes(n.toLowerCase()));
}

// ── Intent handlers ──────────────────────────────────────────────────────────

function handleCompare(msg: string, ds: AdvisorDataset): AdvisorResponse {
  const found = findBusinesses(msg, ds);
  if (found.length < 2) {
    const rated = ds.businesses.filter(
      (b) => b.rating != null && (b.review_count ?? 0) >= 10
    );
    const a = rated[0]?.name ?? "a business";
    const b = rated[1]?.name ?? "another business";
    return {
      text: `Name two businesses and I will line them up side by side. For example: "Compare ${a} vs ${b}". I match names by substring, so partial names usually work as long as they are exact fragments.`,
    };
  }
  const [a, b] = found;
  const fmtRating = (x: AdvisorBusiness) =>
    x.rating != null ? x.rating.toFixed(1) : "—";
  const rows: string[][] = [
    ["Rating", fmtRating(a), fmtRating(b)],
    [
      "Reviews",
      a.review_count != null ? fmtInt(a.review_count) : "—",
      b.review_count != null ? fmtInt(b.review_count) : "—",
    ],
    ["Category", label(ds, a.category_slug), label(ds, b.category_slug)],
    ["Neighborhood", a.neighborhood_label ?? "—", b.neighborhood_label ?? "—"],
    ["Website", a.website ? "Yes" : "No", b.website ? "Yes" : "No"],
    ["Phone", a.phone ? "Yes" : "No", b.phone ? "Yes" : "No"],
    ["Membership", memberLabel(a), memberLabel(b)],
  ];
  let text = `Side by side: ${a.name} and ${b.name}.`;
  if (a.rating != null && b.rating != null && a.rating !== b.rating) {
    const lead = a.rating > b.rating ? a : b;
    text += ` ${lead.name} holds the higher public rating.`;
  }
  text +=
    " Membership is tri-state — “Unknown” means not on any verified list, never assumed either way.";
  return {
    text,
    card: {
      kind: "table",
      title: `${a.name} vs ${b.name}`,
      columns: ["", a.name, b.name],
      rows,
    },
  };
}

function handleCount(msg: string, ds: AdvisorDataset): AdvisorResponse {
  let pool = ds.businesses;
  const parts: string[] = [];
  const lacks = /\b(lack|lacking|without|missing|don'?t have|no)\b/i.test(msg);

  const cats = findCategories(msg, ds);
  if (cats.length > 0) {
    pool = pool.filter((b) => b.category_slug === cats[0]);
    parts.push(label(ds, cats[0]).toLowerCase());
  }
  const hoods = findNeighborhoods(msg, ds);
  if (hoods.length > 0) {
    pool = pool.filter((b) => b.neighborhood_label === hoods[0]);
    parts.push(`in ${hoods[0]}`);
  }

  if (/website/i.test(msg)) {
    pool = pool.filter((b) => (lacks ? !b.website : !!b.website));
    parts.push(lacks ? "without a website" : "with a website");
  } else if (/phone/i.test(msg)) {
    pool = pool.filter((b) => (lacks ? !b.phone : !!b.phone));
    parts.push(lacks ? "without a phone number" : "with a phone number");
  } else if (/\b(rating|rated|reviews?)\b/i.test(msg)) {
    pool = pool.filter((b) =>
      lacks ? b.rating == null : b.rating != null
    );
    parts.push(lacks ? "without a public rating" : "with a public rating");
  }

  let memberNote = "";
  const unknowns = ds.businesses.filter((b) => b.chamber_member == null).length;
  if (/non.?members?\b/i.test(msg)) {
    pool = pool.filter((b) => b.chamber_member === false);
    parts.push("confirmed non-members");
    memberNote = ` Membership is tri-state: ${fmtInt(unknowns)} businesses are unknown and are excluded — never counted as non-members.`;
  } else if (/members?\b/i.test(msg)) {
    pool = pool.filter((b) => b.chamber_member === true);
    parts.push("verified members");
    memberNote = ` Membership is tri-state: ${fmtInt(unknowns)} businesses are unknown and are excluded — never counted either way.`;
  }

  const share =
    ds.stats.total > 0 ? ((pool.length / ds.stats.total) * 100).toFixed(1) : "0";
  const filterText = parts.length > 0 ? ` — ${parts.join(", ")}` : "";
  return {
    text: `${fmtInt(pool.length)} of ${fmtInt(ds.stats.total)} businesses${filterText}.${memberNote}`,
    card: {
      kind: "stats",
      title: "Count",
      items: [
        { label: "Matching businesses", value: fmtInt(pool.length) },
        { label: "Share of directory", value: `${share}%` },
        { label: "Directory total", value: fmtInt(ds.stats.total) },
      ],
    },
  };
}

function handleChart(msg: string, ds: AdvisorDataset): AdvisorResponse {
  if (/neighborhood|hood|area/i.test(msg)) {
    const counts = new Map<string, number>();
    for (const b of ds.businesses) {
      if (b.neighborhood_label)
        counts.set(b.neighborhood_label, (counts.get(b.neighborhood_label) ?? 0) + 1);
    }
    const data = [...counts.entries()]
      .sort((a, z) => z[1] - a[1])
      .slice(0, 10)
      .map(([l, value]) => ({ label: l, value }));
    return {
      text: "Businesses by neighborhood. “Coral Gables” is the catch-all for records without a more specific area.",
      card: { kind: "bar", title: "Businesses by neighborhood", data },
    };
  }
  if (/rating/i.test(msg)) {
    const bands = [
      { label: "4.5 – 5.0", min: 4.5, max: 5.01, value: 0 },
      { label: "4.0 – 4.4", min: 4.0, max: 4.5, value: 0 },
      { label: "3.5 – 3.9", min: 3.5, max: 4.0, value: 0 },
      { label: "3.0 – 3.4", min: 3.0, max: 3.5, value: 0 },
      { label: "Below 3.0", min: 0, max: 3.0, value: 0 },
    ];
    let rated = 0;
    for (const b of ds.businesses) {
      if (b.rating == null) continue;
      rated += 1;
      const band = bands.find((x) => b.rating! >= x.min && b.rating! < x.max);
      if (band) band.value += 1;
    }
    return {
      text: `Rating distribution across the ${fmtInt(rated)} businesses with a public rating (${fmtInt(ds.stats.total - rated)} are unrated and excluded).`,
      card: {
        kind: "bar",
        title: "Rating distribution",
        data: bands.map(({ label: l, value }) => ({ label: l, value })),
        note: "Rated businesses only",
      },
    };
  }
  const counts = new Map<string, number>();
  for (const b of ds.businesses) {
    counts.set(b.category_slug, (counts.get(b.category_slug) ?? 0) + 1);
  }
  const data = [...counts.entries()]
    .sort((a, z) => z[1] - a[1])
    .slice(0, 10)
    .map(([slug, value]) => ({ label: label(ds, slug), value }));
  return {
    text: "Top 10 categories by business count. Ask for “chart neighborhoods” or “chart ratings” for the other views.",
    card: { kind: "bar", title: "Top categories", data },
  };
}

function handleRecommend(msg: string, ds: AdvisorDataset): AdvisorResponse {
  const cats = findCategories(msg, ds);
  const hoods = findNeighborhoods(msg, ds);
  let pool = ds.businesses;
  const scope: string[] = [];
  if (cats.length > 0) {
    pool = pool.filter((b) => b.category_slug === cats[0]);
    scope.push(label(ds, cats[0]).toLowerCase());
  } else {
    scope.push("businesses");
  }
  if (hoods.length > 0) {
    pool = pool.filter((b) => b.neighborhood_label === hoods[0]);
    scope.push(`in ${hoods[0]}`);
  }

  const rated = pool.filter((b) => b.rating != null);
  if (rated.length === 0) {
    return {
      text: `No rated ${scope.join(" ")} in the snapshot to rank. Try a broader category or drop the neighborhood filter.`,
    };
  }
  const reviewed = rated.filter((b) => (b.review_count ?? 0) >= 5);
  const basis = reviewed.length >= 5 ? reviewed : rated;
  const top = [...basis]
    .sort(
      (a, z) =>
        (z.rating ?? 0) - (a.rating ?? 0) ||
        (z.review_count ?? 0) - (a.review_count ?? 0)
    )
    .slice(0, 5);

  const items = top.map((b) => ({
    primary: b.name,
    secondary: [
      label(ds, b.category_slug),
      b.neighborhood_label,
      b.review_count != null ? `${fmtInt(b.review_count)} reviews` : "reviews n/a",
    ]
      .filter(Boolean)
      .join(" · "),
    value: b.rating != null ? b.rating.toFixed(1) : "—",
  }));

  const minNote =
    basis === reviewed
      ? " Ranked by public rating among businesses with 5+ real reviews."
      : " Ranked by public rating — few businesses here have 5+ reviews, so all rated ones were considered.";
  return {
    text: `Top ${top.length} ${scope.join(" ")} out of ${fmtInt(rated.length)} rated.${minNote}`,
    card: { kind: "list", title: `Top ${scope.join(" ")}`, items },
  };
}

function handleDiagnose(b: AdvisorBusiness, ds: AdvisorDataset): AdvisorResponse {
  const peers = ds.businesses.filter(
    (p) => p.category_slug === b.category_slug && p.slug !== b.slug && p.rating != null
  );
  let pct: number | null = null;
  if (b.rating != null && peers.length >= 5) {
    const beaten = peers.filter((p) => (p.rating as number) <= (b.rating as number)).length;
    pct = Math.round((beaten / peers.length) * 100);
  }
  const reviewCounts = peers
    .map((p) => p.review_count)
    .filter((n): n is number => n != null)
    .sort((a, z) => a - z);
  const medianReviews =
    reviewCounts.length >= 5
      ? reviewCounts[Math.floor(reviewCounts.length / 2)]
      : null;

  const catLabel = label(ds, b.category_slug);
  const items: { label: string; value: string }[] = [
    {
      label: "Rating",
      value:
        b.rating != null
          ? `${b.rating.toFixed(1)}${b.review_count != null ? ` · ${fmtInt(b.review_count)} reviews` : ""}`
          : "No public rating",
    },
    {
      label: "Category standing",
      value:
        pct != null
          ? `Meets or beats ${pct}% of ${fmtInt(peers.length)} rated ${catLabel.toLowerCase()} peers`
          : "Not enough rated peers to benchmark",
    },
    { label: "Neighborhood", value: b.neighborhood_label ?? "—" },
    { label: "Website", value: b.website ? "Listed" : "None listed" },
    { label: "Phone", value: b.phone ? "Listed" : "None listed" },
    { label: "Membership", value: memberLabel(b) },
  ];

  const lines: string[] = [`${b.name} — ${catLabel}${b.neighborhood_label ? `, ${b.neighborhood_label}` : ""}.`];
  if (b.rating != null && pct != null) {
    lines.push(
      pct >= 50
        ? `Its ${b.rating.toFixed(1)} rating meets or beats ${pct}% of rated category peers — a solid position.`
        : `Its ${b.rating.toFixed(1)} rating meets or beats ${pct}% of rated category peers — there is headroom.`
    );
  } else if (b.rating == null) {
    lines.push(
      "No public rating yet — a visible rating is the strongest trust signal in local search."
    );
  }
  const opps: string[] = [];
  if (!b.website) opps.push("a website is the biggest untapped channel");
  if (!b.phone) opps.push("a listed phone number would make it directly reachable");
  if (
    b.review_count != null &&
    medianReviews != null &&
    b.review_count < medianReviews
  )
    opps.push(
      `review volume trails the category median (${fmtInt(medianReviews)}+)`
    );
  if (opps.length > 0) lines.push(`Opportunities: ${opps.join("; ")}.`);
  else lines.push("Profile fundamentals are in place — no obvious gaps in the public record.");
  if (b.chamber_member == null)
    lines.push("Membership status is unknown — not on any verified list, so it is never assumed.");

  return {
    text: lines.join(" "),
    card: { kind: "stats", title: b.name, items },
  };
}

function handleSummarize(ds: AdvisorDataset): AdvisorResponse {
  const rated = ds.businesses.filter((b) => b.rating != null);
  const avg =
    rated.length > 0
      ? rated.reduce((s, b) => s + (b.rating as number), 0) / rated.length
      : null;
  const withSite = ds.businesses.filter((b) => b.website).length;
  const unknowns = ds.businesses.filter((b) => b.chamber_member == null).length;
  const nonMembers = ds.businesses.filter((b) => b.chamber_member === false).length;

  const catCounts = new Map<string, number>();
  for (const b of ds.businesses)
    catCounts.set(b.category_slug, (catCounts.get(b.category_slug) ?? 0) + 1);
  const topCat = [...catCounts.entries()].sort((a, z) => z[1] - a[1])[0];

  const sitePct = ((withSite / ds.stats.total) * 100).toFixed(0);
  const items = [
    { label: "Businesses tracked", value: fmtInt(ds.stats.total) },
    { label: "Verified members", value: fmtInt(ds.stats.members) },
    { label: "Confirmed non-members", value: fmtInt(nonMembers) },
    { label: "Membership unknown", value: fmtInt(unknowns) },
    {
      label: "Average rating",
      value: avg != null ? `${avg.toFixed(2)} across ${fmtInt(rated.length)} rated` : "—",
    },
    { label: "With a website", value: `${sitePct}%` },
    {
      label: "Largest category",
      value: topCat ? `${label(ds, topCat[0])} (${fmtInt(topCat[1])})` : "—",
    },
    { label: "Categories · neighborhoods", value: `${ds.stats.categories} · ${ds.stats.neighborhoods}` },
  ];

  return {
    text: `The snapshot tracks ${fmtInt(ds.stats.total)} Coral Gables businesses across ${ds.stats.categories} categories and ${ds.stats.neighborhoods} neighborhoods. ${fmtInt(ds.stats.members)} are verified members; membership is tri-state, so the ${fmtInt(unknowns)} unknowns are reported as unknown — never assumed. ${fmtInt(rated.length)} businesses carry a real public rating (averaging ${avg != null ? avg.toFixed(2) : "—"}), and ${sitePct}% list a website.`,
    card: { kind: "stats", title: "Market summary", items },
  };
}

function handleFallback(ds: AdvisorDataset): AdvisorResponse {
  const sample = ds.businesses.find((b) => b.rating != null)?.name ?? "a business name";
  return {
    text:
      "I answer locally from the directory snapshot — no external calls, nothing invented. Things I can do:\n\n" +
      "· “Summarize the market” — totals, membership (tri-state honest), ratings\n" +
      `· “How is ${sample} doing?” — profile plus a percentile within its category\n` +
      "· “Compare X vs Y” — two businesses side by side\n" +
      "· “Top restaurants on Miracle Mile” — ranked by real ratings\n" +
      "· “How many businesses lack websites?” — filtered counts\n" +
      "· “Chart categories / neighborhoods / ratings” — quick distributions\n\n" +
      "Name any business, category, or neighborhood and I will pull what the snapshot knows.",
  };
}

// ── Router (intent order matters — most specific first) ─────────────────────

const RE = {
  compare: /\bcompare\b|\bvs\.?\b|\bversus\b|difference between/i,
  count: /how many|count of|number of/i,
  chart: /\bchart\b|\bgraph\b|\bplot\b|visuali[sz]e|distribution|breakdown/i,
  recommend: /\btop\b|\bbest\b|recommend|suggest/i,
  diagnose: /diagnos|how('s| is| are)\b|\bdoing\b|\bhealth\b|why is|struggl|tell me about|\bstatus\b/i,
  summarize: /summar|overview|\bbrief/i,
};

export function respond(message: string, ds: AdvisorDataset): AdvisorResponse {
  const msg = message.trim();
  if (!msg) return handleFallback(ds);

  if (RE.compare.test(msg)) return handleCompare(msg, ds);
  if (RE.count.test(msg)) return handleCount(msg, ds);
  if (RE.chart.test(msg)) return handleChart(msg, ds);
  if (RE.recommend.test(msg)) return handleRecommend(msg, ds);

  const found = findBusinesses(msg, ds);
  if (found.length > 0 && RE.diagnose.test(msg)) return handleDiagnose(found[0], ds);
  if (RE.summarize.test(msg)) return handleSummarize(ds);
  if (found.length > 0) return handleDiagnose(found[0], ds);

  // category/neighborhood mention alone → treat as a ranked look
  if (findCategories(msg, ds).length > 0 || findNeighborhoods(msg, ds).length > 0)
    return handleRecommend(msg, ds);

  return handleFallback(ds);
}
