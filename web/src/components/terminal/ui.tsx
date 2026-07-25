// Terminal UI primitives — LinearDesign.md component vocabulary.
// Cards: Carbon surface, 12px radius, hairline inset border, 24px padding.
// Badges: 4px radius, rgba-white fill, 12px/400. Accents only where sanctioned.

export function PageHeader({
  section,
  title,
  description,
  actions,
}: {
  section: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="text-label font-w510 uppercase tracking-wide text-ash">{section}</p>
        <h1 className="mt-1 text-heading-sm font-w510 text-paper">{title}</h1>
        {description && (
          <p className="mt-2 max-w-xl text-body-sm text-fog">{description}</p>
        )}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Card({
  children,
  className = "",
  padded = true,
}: {
  children: React.ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <div
      className={`rounded-cards bg-carbon shadow-subtle ${padded ? "p-6" : ""} ${className}`}
    >
      {children}
    </div>
  );
}

export function SubtleCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-buttons bg-white/[0.02] p-3 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

export function StatCard({
  label,
  value,
  detail,
  accent,
}: {
  label: string;
  value: string | number;
  detail?: string;
  accent?: string; // sanctioned accent color var, used sparingly
}) {
  return (
    <Card className="min-w-0">
      <p className="text-label font-w510 uppercase tracking-wide text-ash">{label}</p>
      <p
        className="mt-2 truncate text-heading-sm font-w510 text-paper"
        style={accent ? { color: accent } : undefined}
      >
        {value}
      </p>
      {detail && <p className="mt-1 text-caption text-fog">{detail}</p>}
    </Card>
  );
}

export function Badge({
  children,
  color,
  className = "",
}: {
  children: React.ReactNode;
  /** sanctioned accent (pulse-green / coral-red / iris-violet / lavender) or default grey */
  color?: string;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-badges bg-white/5 px-1.5 py-px text-label text-fog ${className}`}
      style={color ? { color } : undefined}
    >
      {children}
    </span>
  );
}

export function Pill({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-pills bg-white/5 px-3 py-1 text-caption text-mist ${className}`}
    >
      {children}
    </span>
  );
}

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-label font-w510 uppercase tracking-wide text-ash">{children}</p>
  );
}

export function Divider() {
  return <div className="h-px w-full bg-graphite" />;
}

export function EmptyState({ title, detail }: { title: string; detail?: string }) {
  return (
    <Card className="text-center">
      <p className="text-body-sm font-w510 text-mist">{title}</p>
      {detail && <p className="mt-1 text-caption text-fog">{detail}</p>}
    </Card>
  );
}

/** Mono metadata (issue-ID style) — the ONLY sanctioned mono usage. */
export function MonoTag({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-mono text-label tracking-[-0.013em] text-fog">{children}</span>
  );
}

// Buttons — 6px radius. Acid-lime is the single chromatic action per view.
export function primaryBtnCls() {
  return "inline-flex cursor-pointer items-center justify-center rounded-buttons bg-acid-lime px-4 py-2.5 text-[14px] font-w510 tracking-[-0.011em] text-void transition-opacity duration-150 hover:opacity-85";
}
export function ghostBtnCls() {
  return "inline-flex cursor-pointer items-center justify-center rounded-buttons border border-graphite px-3 py-2 text-caption text-mist transition-colors duration-150 hover:border-smoke hover:bg-white/[0.03]";
}
export function inputCls() {
  return "w-full rounded-inputs border border-white/[0.08] bg-white/[0.02] px-3.5 py-3 text-[14px] text-mist outline-none placeholder:text-fog focus:border-mist";
}
