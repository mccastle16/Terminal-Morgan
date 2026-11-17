import { Archivo } from 'next/font/google'

const archivo = Archivo({ subsets: ['latin'], weight: ['100', '200', '300', '400', '500'] })

const CARD = 'bg-white shadow-[0_1px_3px_rgba(37,206,209,0.09),0_8px_22px_rgba(37,206,209,0.08)]'
const MUTED = '#9FB4B4'
const BLANK = '#B9C7C7'

export default function OverviewPage() {
  return (
    <div className={`${archivo.className} min-h-screen box-border bg-[#FAFAFA] flex items-stretch gap-[18px] p-[18px] text-black`}>
      <Sidebar />
      <main className="flex-1 min-w-0 flex flex-col gap-[18px]">
        <Header />
        <StatRow />
        <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-[18px]">
          <RatingsOverTimeCard />
          <RatingsDistributionCard />
        </div>
        <GoogleStatusCard />
        <div className="grid grid-cols-1 lg:grid-cols-[1.05fr_1fr] gap-[18px] items-stretch">
          <AISummaryCard />
          <div className="flex flex-col gap-[18px] min-w-0">
            <NextActionsCard />
            <CompetitorsCard />
          </div>
        </div>
      </main>
    </div>
  )
}

function Sidebar() {
  const navItems = [
    { label: 'Overview', dot: '#157779', active: true },
    { label: 'My Business', dot: '#0E8C7B' },
    { label: 'Map', dot: '#6A4BE0' },
    { label: 'Upcoming Events', dot: '#E39A24' },
  ]
  return (
    <nav className={`w-[216px] flex-none ${CARD} rounded-[18px] px-[18px] pt-[26px] pb-[22px] flex flex-col gap-[30px]`}>
      <div className="flex items-center gap-[10px]">
        <div className="w-[26px] h-[26px] rounded-[8px] bg-[#157779] flex-none" />
        <div className="flex flex-col">
          <div className="text-[15px] font-medium tracking-[-0.01em]">Reputation</div>
          <div className="text-[9.5px] font-normal tracking-[0.12em] uppercase">CGCC</div>
        </div>
      </div>

      <div className="flex flex-col gap-[3px]">
        {navItems.map((item) => (
          <div
            key={item.label}
            className={`flex items-center gap-[11px] px-[13px] py-[10px] rounded-[10px] text-[13.5px] ${
              item.active ? 'bg-white/75 font-normal' : 'font-extralight text-black/70 hover:bg-white/50 cursor-default'
            }`}
          >
            <span className="w-[6px] h-[6px] rounded-full flex-none" style={{ background: item.dot }} />
            {item.label}
          </div>
        ))}
      </div>
    </nav>
  )
}

function Header() {
  return (
    <header className="flex flex-wrap items-end justify-between gap-[14px] px-[4px] pt-[2px]">
      <div className="flex flex-col gap-[5px] min-w-0">
        <h1 className="m-0 text-[30px] font-medium leading-[1.1] tracking-[-0.02em]">Reputation Overview</h1>
        <div className="text-[12px] font-extralight text-[#7A9596]">Waiting on data from your validation pipeline</div>
      </div>
    </header>
  )
}

function StatCard({ label, icon, iconBg, iconColor }: { label: string; icon: string; iconBg: string; iconColor: string }) {
  return (
    <div className={`flex-1 min-w-[140px] ${CARD} rounded-[14px] px-[18px] py-[16px] flex flex-col gap-[7px]`}>
      <div className="flex items-center justify-between gap-[10px]">
        <div className="text-[9.5px] font-normal tracking-[0.1em] uppercase whitespace-nowrap">{label}</div>
        <div
          className="w-[22px] h-[22px] flex-none flex items-center justify-center rounded-[7px] text-[11px] leading-none"
          style={{ background: iconBg, color: iconColor }}
        >
          {icon}
        </div>
      </div>
      <div className="text-[30px] font-thin tracking-[-0.03em] tabular-nums whitespace-nowrap" style={{ color: BLANK }}>—</div>
      <div className="text-[11px] font-light text-[#7A9596]">No data yet</div>
    </div>
  )
}

function StatRow() {
  return (
    <section className="flex flex-wrap gap-[14px]">
      <StatCard label="Total ratings" icon="★" iconBg="rgba(21,119,121,0.12)" iconColor="#157779" />
      <StatCard label="Reviews replied" icon="✓" iconBg="rgba(14,159,140,0.12)" iconColor="#0E8C7B" />
      <StatCard label="Market rank" icon="◆" iconBg="rgba(122,90,248,0.12)" iconColor="#6A4BE0" />
    </section>
  )
}

function RatingsOverTimeCard() {
  return (
    <div className={`${CARD} rounded-[16px] px-[22px] pt-[20px] pb-[16px] flex flex-col gap-[14px] min-w-0`}>
      <div className="flex flex-wrap items-start justify-between gap-[14px]">
        <div className="flex flex-col gap-[3px]">
          <div className="text-[14.5px] font-medium">Ratings over time</div>
          <div className="text-[11px] font-extralight text-[#7A9596]">No data yet</div>
        </div>
        <div className="flex items-center gap-[14px]">
          <div className="flex items-center gap-[6px] text-[11px] font-extralight text-[#7A9596]">
            <span className="w-[14px] h-[1.5px] bg-[#DDE9E9] block" />
            Rating
          </div>
          <div className="flex items-center gap-[6px] text-[11px] font-extralight text-[#7A9596]">
            <span className="w-[14px] h-[1.5px] bg-[#EAF3F3] block" />
            Category avg
          </div>
        </div>
      </div>
      <div className="relative">
        <svg viewBox="0 0 620 160" preserveAspectRatio="none" className="w-full h-[158px] block">
          <line x1="0" y1="12" x2="620" y2="12" stroke="#F2FCFC" strokeWidth="1" />
          <line x1="0" y1="56" x2="620" y2="56" stroke="#F2FCFC" strokeWidth="1" />
          <line x1="0" y1="100" x2="620" y2="100" stroke="#F2FCFC" strokeWidth="1" />
          <line x1="0" y1="140" x2="620" y2="140" stroke="#D8F4F5" strokeWidth="1" />
          <line x1="0" y1="90" x2="620" y2="90" stroke="#DDE9E9" strokeWidth="1.5" strokeDasharray="4 5" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center text-[11px] font-extralight" style={{ color: MUTED }}>
          No data yet
        </div>
      </div>
      <div className="flex justify-between text-[10px] font-light tracking-[0.1em] uppercase" style={{ color: MUTED }}>
        <span>—</span><span>—</span><span>—</span><span>—</span>
      </div>
    </div>
  )
}

function RatingsDistributionCard() {
  const bars = ['1★', '2★', '3★', '4★', '5★']
  return (
    <div className={`${CARD} rounded-[16px] px-[22px] pt-[20px] pb-[16px] flex flex-col gap-[14px] min-w-0`}>
      <div className="flex flex-col gap-[3px]">
        <div className="text-[14.5px] font-medium">Number of ratings</div>
        <div className="text-[11px] font-extralight text-[#7A9596]">No data yet</div>
      </div>
      <div className="grid grid-cols-5 gap-[10px] items-end h-[158px]">
        {bars.map((label) => (
          <div key={label} className="flex flex-col justify-end gap-[7px] h-full">
            <div className="text-[10.5px] font-extralight text-center tabular-nums whitespace-nowrap" style={{ color: BLANK }}>—</div>
            <div className="h-[3px] bg-[#EDF6F6] rounded-t-[5px]" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-5 gap-[10px] text-[10px] font-light tracking-[0.08em] text-center" style={{ color: MUTED }}>
        {bars.map((label) => <span key={label}>{label}</span>)}
      </div>
    </div>
  )
}

function GoogleStatusCard() {
  return (
    <section className={`${CARD} rounded-[16px] px-[26px] py-[22px] flex flex-wrap items-center gap-[22px]`}>
      <div className="flex flex-col gap-[14px] min-w-0">
        <div className="text-[14.5px] font-medium">Current Google status</div>
        <div className="flex items-center gap-[14px] flex-nowrap">
          <div className="text-[30px] leading-none tracking-[0.04em] text-[#E3FCFD] whitespace-nowrap">★★★★★</div>
          <div className="flex items-baseline gap-[7px]">
            <div className="text-[40px] font-thin tracking-[-0.04em] leading-none tabular-nums whitespace-nowrap" style={{ color: BLANK }}>—</div>
            <div className="text-[14px] font-extralight text-[#7A9596]">/ 5.0</div>
          </div>
        </div>
      </div>
      <div className="w-px self-stretch min-h-[56px] bg-[#DFF6F7] flex-none" />
      <div className="flex flex-wrap gap-[28px] flex-1 min-w-0">
        {['Total ratings', 'vs. last 90 days', 'New since June'].map((label) => (
          <div key={label} className="flex flex-col gap-[6px]">
            <div className="text-[24px] font-thin tracking-[-0.03em] tabular-nums whitespace-nowrap" style={{ color: BLANK }}>—</div>
            <div className="text-[9.5px] font-normal tracking-[0.1em] uppercase whitespace-nowrap text-[#7A9596]">{label}</div>
          </div>
        ))}
      </div>
    </section>
  )
}

function AISummaryCard() {
  return (
    <div className={`${CARD} rounded-[16px] px-[22px] pt-[20px] pb-[18px] flex flex-col gap-[22px] min-w-0`}>
      <div className="flex items-center justify-between gap-[12px]">
        <div className="text-[14.5px] font-medium whitespace-nowrap">AI review summary</div>
        <button
          disabled
          className="px-[12px] py-[5px] bg-white/55 border border-[rgba(21,119,121,0.20)] rounded-full text-[11px] font-light whitespace-nowrap flex-none cursor-not-allowed opacity-60"
        >
          Refresh
        </button>
      </div>

      <div className="flex flex-col gap-[22px] min-w-0">
        <p className="m-0 max-w-[62ch] text-[13.5px] font-extralight leading-[1.7] text-[#7A9596]">
          No summary yet. Connect your validation pipeline to see AI-generated insights here.
        </p>

        <div className="flex flex-col gap-[10px]">
          <div className="flex items-center gap-[7px] text-[9.5px] font-normal tracking-[0.12em] uppercase text-[#7A9596]">
            <span className="w-[5px] h-[5px] rounded-[1px]" style={{ background: BLANK }} />
            Top qualities
          </div>
          <div className="text-[12px] font-extralight" style={{ color: MUTED }}>No data yet</div>
        </div>

        <div className="flex flex-col gap-[10px]">
          <div className="flex items-center gap-[7px] text-[9.5px] font-normal tracking-[0.12em] uppercase text-[#7A9596]">
            <span className="w-[5px] h-[5px] rounded-[1px]" style={{ background: BLANK }} />
            Top complaints
          </div>
          <div className="text-[12px] font-extralight" style={{ color: MUTED }}>No data yet</div>
        </div>
      </div>

      <div className="flex flex-col gap-[14px] min-w-0 border-t border-[#DFF6F7] pt-[18px]">
        <div className="text-[9.5px] font-normal tracking-[0.12em] uppercase text-[#7A9596]">Sentiment</div>
        <div className="flex items-center gap-[22px] flex-wrap">
          <div className="relative w-[108px] h-[108px] flex-none">
            <svg viewBox="0 0 42 42" className="w-[108px] h-[108px] -rotate-90">
              <circle cx="21" cy="21" r="15.9" fill="none" stroke="#E3FCFD" strokeWidth="4" />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-[1px]">
              <div className="text-[22px] font-thin tracking-[-0.03em] tabular-nums whitespace-nowrap" style={{ color: BLANK }}>—</div>
              <div className="text-[9px] font-light tracking-[0.1em] uppercase" style={{ color: MUTED }}>No data</div>
            </div>
          </div>
          <div className="flex flex-col gap-[9px] flex-1 min-w-[150px]">
            {['Positive', 'Neutral', 'Negative'].map((label) => (
              <div key={label} className="flex items-center justify-between gap-[12px] text-[12.5px] font-extralight text-[#7A9596]">
                <span className="flex items-center gap-[8px]">
                  <span className="w-[7px] h-[7px] rounded-full bg-[#DDE9E9]" />
                  {label}
                </span>
                <span className="tabular-nums">—</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function NextActionsCard() {
  return (
    <div className={`${CARD} rounded-[16px] px-[22px] pt-[20px] pb-[18px] flex flex-col gap-[14px] min-w-0`}>
      <div className="flex flex-col gap-[3px]">
        <div className="text-[14.5px] font-medium whitespace-nowrap">Your next three actions</div>
        <div className="text-[11px] font-extralight text-[#7A9596]">No data yet</div>
      </div>
      <div className="text-[12.5px] font-extralight leading-[1.55]" style={{ color: MUTED }}>
        Actions will appear here once your validation pipeline is connected.
      </div>
    </div>
  )
}

function CompetitorsCard() {
  return (
    <div className={`${CARD} rounded-[16px] px-[22px] pt-[20px] pb-[16px] flex flex-col gap-[16px] min-w-0 w-full flex-1`}>
      <div className="flex items-center justify-between gap-[12px]">
        <div className="flex flex-col gap-[3px]">
          <div className="text-[14.5px] font-medium">Top competitors</div>
          <div className="text-[11px] font-extralight text-[#7A9596]">No data yet</div>
        </div>
        <button
          disabled
          className="px-[12px] py-[5px] bg-white/55 border border-[rgba(21,119,121,0.20)] rounded-full text-[11px] font-light whitespace-nowrap flex-none cursor-not-allowed opacity-60"
        >
          Filter
        </button>
      </div>

      <div className="flex flex-1 items-center justify-center py-[24px] text-[12.5px] font-extralight text-center" style={{ color: MUTED }}>
        Competitor rankings will appear here once your validation pipeline is connected.
      </div>

      <div className="flex items-center justify-between gap-[12px] pt-[12px] border-t border-[#DFF6F7] text-[11px] font-extralight" style={{ color: MUTED }}>
        <span>Showing 0 of 0 ranked businesses</span>
      </div>
    </div>
  )
}
