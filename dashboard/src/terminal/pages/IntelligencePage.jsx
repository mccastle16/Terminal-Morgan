import { useState, useMemo } from 'react'
import { useTerminalData } from '../context/TerminalDataContext'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, CartesianGrid,
} from 'recharts'
import { VGRADIENTS, HGRADIENTS, ChartTooltip, ChartLegend, PieLabel, DonutCenter, axisTick, axisTickLabel, barCursor } from '../components/ChartTheme'
import {
  Brain, TrendingUp, TrendingDown, AlertTriangle, Users, Network,
  Heart, DollarSign, Shield, Target, Zap, BarChart3,
} from 'lucide-react'

const COLORS = ['#f59e0b', '#3b82f6', '#10b981', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16']
const SENTIMENT_COLORS = {
  very_positive: '#10b981', positive: '#3b82f6', neutral: '#6b7280',
  negative: '#ef4444', unrated: '#374151',
}
const GROWTH_COLORS = { growing: '#10b981', stable: '#f59e0b', declining: '#ef4444' }

function StatCard({ icon: Icon, label, value, sub, color = 'amber' }) {
  const textColors = { amber: 'text-amber-400', red: 'text-red-400', green: 'text-green-400', blue: 'text-blue-400', purple: 'text-purple-400' }
  const bgColors = { amber: 'bg-amber-500/10 border-amber-500/20', red: 'bg-red-500/10 border-red-500/20', green: 'bg-green-500/10 border-green-500/20', blue: 'bg-blue-500/10 border-blue-500/20', purple: 'bg-purple-500/10 border-purple-500/20' }
  return (
    <div className="bg-slate-900/50 rounded-lg border border-slate-800 p-4">
      <div className="flex items-center gap-2.5 mb-1">
        <div className={`w-7 h-7 rounded-lg border flex items-center justify-center ${bgColors[color] || bgColors.amber}`}>
          <Icon className={`w-3.5 h-3.5 ${textColors[color] || textColors.amber}`} />
        </div>
        <span className="text-xs text-slate-500 uppercase tracking-wider">{label}</span>
      </div>
      <div className="text-2xl font-semibold text-white">{value}</div>
      {sub && <div className="text-xs text-slate-500 mt-1">{sub}</div>}
    </div>
  )
}

function SectionHeader({ icon: Icon, title, subtitle }) {
  return (
    <div className="mb-4">
      <h3 className="text-sm font-medium text-white flex items-center gap-2.5">
        <div className="w-6 h-6 rounded-md bg-slate-800 border border-slate-700/60 flex items-center justify-center">
          <Icon className="w-3 h-3 text-slate-400" />
        </div>
        {title}
      </h3>
      {subtitle && <p className="text-xs text-slate-500 mt-0.5 ml-[34px]">{subtitle}</p>}
    </div>
  )
}

export default function IntelligencePage() {
  const { stats, marketAnalytics, sentimentData, centralityData, predictionData, rawBusinesses } = useTerminalData()
  const [activeTab, setActiveTab] = useState('sentiment')

  const tabs = [
    { id: 'sentiment', label: 'Sentiment', icon: Heart },
    { id: 'predictions', label: 'Predictions', icon: Brain },
    { id: 'network', label: 'Network', icon: Network },
    { id: 'pricing', label: 'Pricing', icon: DollarSign },
  ]

  // ── Sentiment tab data ──────────────────────────────────────────────────────
  const sentimentCharts = useMemo(() => {
    if (!sentimentData) return null
    const dist = sentimentData.sentiment_distribution || {}
    const pieData = Object.entries(dist).map(([key, val]) => ({
      name: key.replace('_', ' '),
      value: val,
      fill: SENTIMENT_COLORS[key] || '#6b7280',
    }))
    const catSentiment = (sentimentData.category_sentiment || []).slice(0, 12)
    return { pieData, catSentiment }
  }, [sentimentData])

  // ── Prediction tab data ─────────────────────────────────────────────────────
  const predictionCharts = useMemo(() => {
    if (!predictionData) return null
    const mpData = [
      { name: 'High (≥70)', value: predictionData.membership_distribution?.high || 0, fill: '#10b981' },
      { name: 'Medium (40-69)', value: predictionData.membership_distribution?.medium || 0, fill: '#f59e0b' },
      { name: 'Low (<40)', value: predictionData.membership_distribution?.low || 0, fill: '#ef4444' },
    ]
    const gtData = [
      { name: 'Growing', value: predictionData.growth_distribution?.growing || 0, fill: '#10b981' },
      { name: 'Stable', value: predictionData.growth_distribution?.stable || 0, fill: '#f59e0b' },
      { name: 'Declining', value: predictionData.growth_distribution?.declining || 0, fill: '#ef4444' },
    ]
    const catPred = (predictionData.category_predictions || []).slice(0, 15)
    return { mpData, gtData, catPred }
  }, [predictionData])

  // ── Network tab data ────────────────────────────────────────────────────────
  const networkCharts = useMemo(() => {
    if (!centralityData) return null
    const influencers = (centralityData.top_influencers || []).slice(0, 12)
    const bridges = (centralityData.bridge_nodes || []).slice(0, 10)
    const communities = centralityData.community_sizes || {}
    const comData = Object.entries(communities).map(([id, size]) => ({
      name: `C${id}`, value: size,
    })).sort((a, b) => b.value - a.value).slice(0, 10)
    return { influencers, bridges, comData }
  }, [centralityData])

  // ── Pricing tab data ────────────────────────────────────────────────────────
  const pricingCharts = useMemo(() => {
    if (!stats?.priceTierDist) return null
    const tierData = stats.priceTierDist.map(t => ({
      name: t.tier,
      businesses: t.count,
      members: t.members,
      avgRating: Math.round(t.avgRating * 100) / 100,
      penetration: t.count ? Math.round(t.members / t.count * 100) : 0,
    }))

    // Price tier by category
    const catPriceData = (stats.categories || []).slice(0, 12).map(cat => {
      const bizs = rawBusinesses.filter(b => b.category_primary === cat)
      const tiers = { '$': 0, '$$': 0, '$$$': 0, '$$$$': 0 }
      bizs.forEach(b => { if (tiers[b.price_tier] !== undefined) tiers[b.price_tier]++ })
      return { category: cat.replace(/_/g, ' '), ...tiers }
    })

    return { tierData, catPriceData }
  }, [stats, rawBusinesses])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-white flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-violet-500/15 border border-violet-500/25 flex items-center justify-center">
              <Brain size={16} className="text-violet-400" />
            </div>
            Intelligence
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Sentiment analysis, predictive modeling, network centrality & pricing
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard icon={Heart} label="Market Sentiment"
          value={sentimentData ? `${Math.round((sentimentData.sentiment_distribution?.very_positive + sentimentData.sentiment_distribution?.positive) / sentimentData.total_businesses * 100)}%` : '—'}
          sub="positive" color="green" />
        <StatCard icon={Brain} label="Avg Membership Prob"
          value={predictionData ? `${predictionData.avg_membership_probability}%` : '—'}
          sub={predictionData ? `${predictionData.high_potential_recruits} high-potential recruits` : ''} color="blue" />
        <StatCard icon={TrendingUp} label="Avg Growth"
          value={predictionData ? `${predictionData.avg_growth_trajectory > 0 ? '+' : ''}${predictionData.avg_growth_trajectory}` : '—'}
          sub="trajectory score" color="amber" />
        <StatCard icon={AlertTriangle} label="Churn Risk"
          value={predictionData ? `${predictionData.churn_risk_high + predictionData.churn_risk_medium}` : '—'}
          sub={predictionData ? `${predictionData.churn_risk_high} high / ${predictionData.churn_risk_medium} medium` : ''} color="red" />
        <StatCard icon={Network} label="Communities"
          value={centralityData ? centralityData.num_communities : '—'}
          sub={centralityData ? `${centralityData.total_nodes} nodes` : ''} color="purple" />
      </div>

      {/* Tab Navigation */}
      <div className="flex bg-slate-900 border border-slate-800 rounded-md p-0.5">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-slate-800 text-white'
                : 'text-slate-500 hover:text-slate-300'
            }`}>
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── SENTIMENT TAB ──────────────────────────────────────────────────── */}
      {activeTab === 'sentiment' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Sentiment Distribution Pie */}
            <div className="bg-slate-900/50 rounded-lg border border-slate-800 p-5">
              <SectionHeader icon={Heart} title="Sentiment Distribution"
                subtitle={`${sentimentData?.total_businesses || 0} businesses analyzed`} />
              {sentimentCharts?.pieData ? (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={sentimentCharts.pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80}
                      paddingAngle={3} dataKey="value" label={PieLabel} labelLine={false} strokeWidth={0}>
                      {sentimentCharts.pieData.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              ) : <div className="text-slate-500 text-center py-20">No sentiment data available</div>}
            </div>

            {/* Category Sentiment Bars */}
            <div className="bg-slate-900/50 rounded-lg border border-slate-800 p-5">
              <SectionHeader icon={BarChart3} title="Sentiment by Category"
                subtitle="Composite Sentiment Score (CSS)" />
              {sentimentCharts?.catSentiment?.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={sentimentCharts.catSentiment} layout="vertical"
                    margin={{ left: 0, right: 10 }}>
                    <defs>{HGRADIENTS}</defs>
                    <CartesianGrid strokeDasharray="3 6" stroke="#1e293b" horizontal={false} vertical={true} />
                    <XAxis type="number" domain={[0, 100]} tick={axisTick} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="category" tick={axisTickLabel}
                      tickFormatter={v => v.replace(/_/g, ' ')} width={95} axisLine={false} tickLine={false} />
                    <Tooltip content={<ChartTooltip />} cursor={barCursor} />
                    <Bar dataKey="avg_css" fill="url(#gAmberH)" radius={[0, 4, 4, 0]} name="CSS Score" />
                  </BarChart>
                </ResponsiveContainer>
              ) : <div className="text-slate-500 text-center py-20">Loading...</div>}
            </div>
          </div>

          {/* Theme Analysis */}
          {sentimentData && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-slate-900/50 rounded-lg border border-green-500/20 p-5">
                <SectionHeader icon={TrendingUp} title="Delight Themes" subtitle="Positive signals from top businesses" />
                <div className="space-y-2">
                  {Object.entries(sentimentData.delight_themes || {}).map(([theme, count]) => (
                    <div key={theme} className="flex items-center justify-between">
                      <span className="text-sm text-slate-300">{theme.replace(/_/g, ' ')}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-slate-800 rounded-full h-2">
                          <div className="bg-green-500 h-2 rounded-full" style={{ width: `${Math.min(100, count * 15)}%` }} />
                        </div>
                        <span className="text-xs text-green-400 w-8 text-right">{count}</span>
                      </div>
                    </div>
                  ))}
                  {Object.keys(sentimentData.delight_themes || {}).length === 0 && (
                    <p className="text-xs text-slate-500">Limited text data — enrich reviews for deeper themes</p>
                  )}
                </div>
              </div>
              <div className="bg-slate-900/50 rounded-lg border border-red-500/20 p-5">
                <SectionHeader icon={TrendingDown} title="Pain Themes" subtitle="Areas needing attention" />
                <div className="space-y-2">
                  {Object.entries(sentimentData.pain_themes || {}).map(([theme, count]) => (
                    <div key={theme} className="flex items-center justify-between">
                      <span className="text-sm text-slate-300">{theme.replace(/_/g, ' ')}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-slate-800 rounded-full h-2">
                          <div className="bg-red-500 h-2 rounded-full" style={{ width: `${Math.min(100, count * 15)}%` }} />
                        </div>
                        <span className="text-xs text-red-400 w-8 text-right">{count}</span>
                      </div>
                    </div>
                  ))}
                  {Object.keys(sentimentData.pain_themes || {}).length === 0 && (
                    <p className="text-xs text-slate-500">Limited text data — enrich reviews for deeper themes</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── PREDICTIONS TAB ───────────────────────────────────────────────── */}
      {activeTab === 'predictions' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Membership Probability Distribution */}
            <div className="bg-slate-900/50 rounded-lg border border-slate-800 p-5">
              <SectionHeader icon={Users} title="Membership Probability"
                subtitle="Likelihood to join/retain chamber membership" />
              {predictionCharts?.mpData ? (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={predictionCharts.mpData} cx="50%" cy="50%" innerRadius={50} outerRadius={80}
                      paddingAngle={3} dataKey="value" strokeWidth={0}
                      label={PieLabel} labelLine={false}>
                      {predictionCharts.mpData.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              ) : <div className="text-slate-500 text-center py-20">No prediction data</div>}
            </div>

            {/* Growth Trajectory Distribution */}
            <div className="bg-slate-900/50 rounded-lg border border-slate-800 p-5">
              <SectionHeader icon={TrendingUp} title="Growth Trajectory"
                subtitle="Momentum signals across the market" />
              {predictionCharts?.gtData ? (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={predictionCharts.gtData} cx="50%" cy="50%" innerRadius={50} outerRadius={80}
                      paddingAngle={3} dataKey="value" strokeWidth={0}
                      label={PieLabel} labelLine={false}>
                      {predictionCharts.gtData.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              ) : <div className="text-slate-500 text-center py-20">Loading...</div>}
            </div>
          </div>

          {/* Category Growth Chart */}
          {predictionCharts?.catPred?.length > 0 && (
            <div className="bg-slate-900/50 rounded-lg border border-slate-800 p-5">
              <SectionHeader icon={Target} title="Category Predictions"
                subtitle="Average membership probability and growth trajectory by category" />
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={predictionCharts.catPred} margin={{ left: 10, right: 30, bottom: 50 }}>
                  <defs>{VGRADIENTS}</defs>
                  <CartesianGrid strokeDasharray="3 6" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="category" tick={{ ...axisTickLabel, fontSize: 10 }} angle={-35} textAnchor="end"
                    tickFormatter={v => v.replace(/_/g, ' ')} axisLine={false} tickLine={false} />
                  <YAxis tick={axisTick} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTooltip />} cursor={barCursor} />
                  <Legend content={ChartLegend} />
                  <Bar dataKey="avg_membership_prob" fill="url(#gBlue)" name="Membership Prob %" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="avg_growth_trajectory" fill="url(#gGreen)" name="Growth Trajectory" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Churn Risk Panel */}
          {predictionData && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="bg-slate-900/50 rounded-lg border border-red-500/20 p-5">
                <div className="text-xs text-red-400 uppercase tracking-wider mb-2">High Churn Risk</div>
                <div className="text-3xl font-semibold text-red-400">{predictionData.churn_risk_high}</div>
                <p className="text-xs text-slate-500 mt-1">Members with declining trajectory ≤ -10</p>
              </div>
              <div className="bg-slate-900/50 rounded-lg border border-amber-500/20 p-5">
                <div className="text-xs text-amber-400 uppercase tracking-wider mb-2">Medium Churn Risk</div>
                <div className="text-3xl font-semibold text-amber-400">{predictionData.churn_risk_medium}</div>
                <p className="text-xs text-slate-500 mt-1">Members showing early warning signs</p>
              </div>
              <div className="bg-slate-900/50 rounded-lg border border-green-500/20 p-5">
                <div className="text-xs text-green-400 uppercase tracking-wider mb-2">Healthy Members</div>
                <div className="text-3xl font-semibold text-green-400">{predictionData.churn_risk_low}</div>
                <p className="text-xs text-slate-500 mt-1">Stable or growing trajectory</p>
              </div>
            </div>
          )}

          {/* Feature Weights */}
          {predictionData?.feature_weights && (
            <div className="bg-slate-900/50 rounded-lg border border-slate-800 p-5">
              <SectionHeader icon={Zap} title="Prediction Feature Weights"
                subtitle="Learned from member vs non-member distributions" />
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {Object.entries(predictionData.feature_weights).map(([fname, w]) => (
                  <div key={fname} className="bg-slate-800/50 rounded-lg p-3">
                    <div className="text-xs text-slate-400 mb-1">{fname.replace(/_/g, ' ')}</div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-white">
                        {w.direction > 0 ? '+' : ''}{w.direction.toFixed(2)}
                      </span>
                      <span className={`text-xs ${w.direction > 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {w.direction > 0 ? '↑ pro-member' : '↓ pro-non-member'}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      members: {w.member_mean} | others: {w.non_member_mean}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── NETWORK TAB ───────────────────────────────────────────────────── */}
      {activeTab === 'network' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Influencers */}
            <div className="bg-slate-900/50 rounded-lg border border-slate-800 p-5">
              <SectionHeader icon={Zap} title="Top Influencers"
                subtitle="Highest composite influence score (PageRank + Betweenness + Degree)" />
              {networkCharts?.influencers?.length > 0 ? (
                <ResponsiveContainer width="100%" height={340}>
                  <BarChart data={networkCharts.influencers} layout="vertical"
                    margin={{ left: 0, right: 10 }}>
                    <defs>{HGRADIENTS}</defs>
                    <CartesianGrid strokeDasharray="3 6" stroke="#1e293b" horizontal={false} vertical={true} />
                    <XAxis type="number" tick={axisTick} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="name" tick={{ ...axisTickLabel, fontSize: 10 }} width={125} axisLine={false} tickLine={false} />
                    <Tooltip content={<ChartTooltip />} cursor={barCursor} />
                    <Bar dataKey="influence_score" fill="url(#gAmberH)" radius={[0, 4, 4, 0]} name="Influence" />
                  </BarChart>
                </ResponsiveContainer>
              ) : <div className="text-slate-500 text-center py-20">No network data</div>}
            </div>

            {/* Community Sizes */}
            <div className="bg-slate-900/50 rounded-lg border border-slate-800 p-5">
              <SectionHeader icon={Users} title="Community Clusters"
                subtitle={`${centralityData?.num_communities || 0} communities detected via label propagation`} />
              {networkCharts?.comData?.length > 0 ? (
                <ResponsiveContainer width="100%" height={340}>
                  <BarChart data={networkCharts.comData} margin={{ left: 10, right: 10 }}>
                    <defs>{VGRADIENTS}</defs>
                    <CartesianGrid strokeDasharray="3 6" stroke="#1e293b" vertical={false} />
                    <XAxis dataKey="name" tick={axisTickLabel} axisLine={false} tickLine={false} />
                    <YAxis tick={axisTick} axisLine={false} tickLine={false} />
                    <Tooltip content={<ChartTooltip />} cursor={barCursor} />
                    <Bar dataKey="value" name="Nodes" radius={[4, 4, 0, 0]}>
                      {networkCharts.comData.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : <div className="text-slate-500 text-center py-20">Loading...</div>}
            </div>
          </div>

          {/* Bridge Nodes Table */}
          {networkCharts?.bridges?.length > 0 && (
            <div className="bg-slate-900/50 rounded-lg border border-slate-800 p-5">
              <SectionHeader icon={Shield} title="Bridge Nodes"
                subtitle="Businesses connecting different network communities — high strategic value" />
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-800">
                      <th className="text-left px-3 py-2 text-slate-400 font-medium">Business</th>
                      <th className="text-right px-3 py-2 text-slate-400 font-medium">Betweenness</th>
                      <th className="text-right px-3 py-2 text-slate-400 font-medium">PageRank</th>
                      <th className="text-right px-3 py-2 text-slate-400 font-medium">Degree</th>
                      <th className="text-right px-3 py-2 text-slate-400 font-medium">Community</th>
                      <th className="text-center px-3 py-2 text-slate-400 font-medium">Member</th>
                    </tr>
                  </thead>
                  <tbody>
                    {networkCharts.bridges.map((b, i) => (
                      <tr key={i} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                        <td className="px-3 py-2 text-white font-medium">{b.name}</td>
                        <td className="px-3 py-2 text-right text-amber-400">{b.betweenness?.toFixed(3)}</td>
                        <td className="px-3 py-2 text-right text-blue-400">{b.pagerank?.toFixed(3)}</td>
                        <td className="px-3 py-2 text-right text-slate-300">{b.degree}</td>
                        <td className="px-3 py-2 text-right text-purple-400">C{b.community}</td>
                        <td className="px-3 py-2 text-center">
                          <span className={`px-2 py-0.5 rounded text-xs ${b.member ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-700 text-slate-400'}`}>
                            {b.member ? 'Yes' : 'No'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── PRICING TAB ───────────────────────────────────────────────────── */}
      {activeTab === 'pricing' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Price Tier Overview */}
            <div className="bg-slate-900/50 rounded-lg border border-slate-800 p-5">
              <SectionHeader icon={DollarSign} title="Price Tier Distribution"
                subtitle={`${stats?.priceCoverage || 0}% coverage`} />
              {pricingCharts?.tierData ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={pricingCharts.tierData} margin={{ left: 10, right: 10 }}>
                    <defs>{VGRADIENTS}</defs>
                    <CartesianGrid strokeDasharray="3 6" stroke="#1e293b" vertical={false} />
                    <XAxis dataKey="name" tick={{ ...axisTickLabel, fontSize: 13 }} axisLine={false} tickLine={false} />
                    <YAxis tick={axisTick} axisLine={false} tickLine={false} />
                    <Tooltip content={<ChartTooltip />} cursor={barCursor} />
                    <Legend content={ChartLegend} />
                    <Bar dataKey="businesses" fill="url(#gBlue)" name="Total" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="members" fill="url(#gAmber)" name="Members" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <div className="text-slate-500 text-center py-20">No pricing data</div>}
            </div>

            {/* Price Tier Metrics */}
            <div className="bg-slate-900/50 rounded-lg border border-slate-800 p-5">
              <SectionHeader icon={Target} title="Tier Performance"
                subtitle="Rating and penetration by price tier" />
              {pricingCharts?.tierData ? (
                <div className="space-y-4 mt-4">
                  {pricingCharts.tierData.map(t => (
                    <div key={t.name} className="bg-slate-800/50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-lg font-semibold text-amber-400">{t.name}</span>
                        <span className="text-sm text-slate-400">{t.businesses} businesses</span>
                      </div>
                      <div className="grid grid-cols-3 gap-3 text-center">
                        <div>
                          <div className="text-sm font-medium text-white">{t.avgRating.toFixed(1)}</div>
                          <div className="text-xs text-slate-500">Avg Rating</div>
                        </div>
                        <div>
                          <div className="text-sm font-medium text-white">{t.members}</div>
                          <div className="text-xs text-slate-500">Members</div>
                        </div>
                        <div>
                          <div className="text-sm font-medium text-white">{t.penetration}%</div>
                          <div className="text-xs text-slate-500">Penetration</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </div>

          {/* Category × Price Tier Stacked */}
          {pricingCharts?.catPriceData?.length > 0 && (
            <div className="bg-slate-900/50 rounded-lg border border-slate-800 p-5">
              <SectionHeader icon={BarChart3} title="Category × Price Tier"
                subtitle="Distribution of price tiers across top categories" />
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={pricingCharts.catPriceData} margin={{ left: 10, right: 10, bottom: 50 }}>
                  <defs>{VGRADIENTS}</defs>
                  <CartesianGrid strokeDasharray="3 6" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="category" tick={{ ...axisTickLabel, fontSize: 10 }} angle={-35} textAnchor="end" axisLine={false} tickLine={false} />
                  <YAxis tick={axisTick} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTooltip />} cursor={barCursor} />
                  <Legend content={ChartLegend} />
                  <Bar dataKey="$" stackId="a" fill="url(#gGreen)" name="$" />
                  <Bar dataKey="$$" stackId="a" fill="url(#gBlue)" name="$$" />
                  <Bar dataKey="$$$" stackId="a" fill="url(#gAmber)" name="$$$" />
                  <Bar dataKey="$$$$" stackId="a" fill="url(#gPurple)" name="$$$$" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
