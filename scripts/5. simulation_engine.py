#!/usr/bin/env python3
"""
Strategy Experimentation Engine
================================
Phase 1: Monte Carlo Simulation (GBM-based stochastic revenue/time projections)
Phase 2: Multi-Armed Bandit (Thompson Sampling for adaptive action selection)
Phase 3: Q-Learning skeleton (Bellman updates for sequential strategy optimization)

Usage:
    python simulation_engine.py                    # Full simulation
    python simulation_engine.py --paths 5000       # More Monte Carlo paths
    python simulation_engine.py --horizon 24       # 24-month horizon

Output:
    dashboard/public/data/experiment_results.json
"""

import json, argparse, re, math, sys
from pathlib import Path
from typing import Dict, List, Tuple, Any, Optional
from dataclasses import dataclass, field, asdict
import random

# ── Try numpy; fall back to pure Python ──────────────────────────
try:
    import numpy as np
    HAS_NUMPY = True
except ImportError:
    HAS_NUMPY = False
    print("  [!] numpy not found — using pure Python (slower)")

# ── Paths ────────────────────────────────────────────────────────
ROOT = Path(__file__).resolve().parent.parent
PLAYBOOK_PATH = ROOT / "dashboard" / "public" / "data" / "action_playbook.json"
MASTER_CSV = ROOT / "data" / "master_all_businesses.csv"
OUT_PATH = ROOT / "dashboard" / "public" / "data" / "experiment_results.json"

# ═════════════════════════════════════════════════════════════════
# DOMAIN MODELS — Action Impact Priors
# ═════════════════════════════════════════════════════════════════
# These are calibrated priors for Coral Gables small businesses.
# They encode: "If a business does X, what's the expected lift?"
#
# Source: industry benchmarks for SMBs (BrightLocal, Yelp, SBA data)
# Format: (monthly_revenue_lift_pct, sigma, time_savings_hrs_month, cost_monthly)

ACTION_TYPE_PRIORS = {
    # action_type -> (mu_rev%, sigma_rev%, time_save_hrs, monthly_cost$)
    "claim_profile":         (0.05, 0.03, 4.0, 0),
    "respond_reviews":       (0.03, 0.02, 2.0, 0),
    "improve_seo":           (0.08, 0.05, 0.0, 150),
    "social_media":          (0.06, 0.04, -6.0, 200),  # negative = costs time
    "partnership":           (0.10, 0.07, 2.0, 100),
    "loyalty_program":       (0.07, 0.04, -3.0, 50),
    "new_product":           (0.12, 0.08, -8.0, 500),
    "operational_efficiency": (0.02, 0.02, 10.0, 300),
    "staff_training":        (0.04, 0.03, -4.0, 200),
    "address_red_flag":      (0.03, 0.02, 5.0, 100),
    "competitive_positioning": (0.09, 0.06, 0.0, 250),
    "data_enrichment":       (0.01, 0.01, 3.0, 50),
}

# Category-level fallbacks if action_type isn't recognized
CATEGORY_PRIORS = {
    "growth":       (0.08, 0.05, -2.0, 200),
    "visibility":   (0.06, 0.04, -4.0, 150),
    "reputation":   (0.04, 0.03, 3.0, 50),
    "risk":         (0.03, 0.02, 5.0, 100),
    "data_quality": (0.01, 0.01, 3.0, 25),
}

# Priority multipliers
PRIORITY_MULTIPLIERS = {
    "urgent": 1.3,   # Urgent = higher expected lift (more impactful)
    "high": 1.0,
    "medium": 0.7,
}

# PKP node type affects business scale
PKP_REVENUE_SCALE = {
    "infrastructure": 50000,   # Monthly revenue estimate for banks, utilities
    "platform": 30000,         # Restaurants, hotels, retail
    "asset": 15000,            # Small services, individual practitioners
}

# Neighborhood competition intensity (affects sigma)
NEIGHBORHOOD_COMPETITION = {
    "miracle_mile": 1.3,
    "ponce_de_leon": 1.2,
    "bird_road": 1.1,
    "sunset_south": 1.0,
    "douglas_road": 1.0,
    "alhambra_circle": 0.9,
    "um_area": 0.95,
    "merrick_park": 1.15,
    "Coral Gables": 1.0,
}


# ═════════════════════════════════════════════════════════════════
# PHASE 1: MONTE CARLO SIMULATION (Geometric Brownian Motion)
# ═════════════════════════════════════════════════════════════════
# Revenue follows GBM: dS = μS dt + σS dW_t
# Discretized: S_{t+1} = S_t * exp[(μ - σ²/2)Δt + σ√Δt * Z]
#
# For time savings: linear model with noise
# T_{t} = T_base + lift_hrs * t + ε, ε ~ N(0, σ_t)

@dataclass
class SimulationConfig:
    n_paths: int = 1000           # Monte Carlo paths
    horizon_months: int = 12      # Projection horizon
    dt: float = 1.0               # Time step (1 month)
    risk_free_rate: float = 0.003 # Monthly risk-free rate (~3.7% annual)
    discount_rate: float = 0.008  # Monthly discount rate (~10% annual)


@dataclass
class ActionSimResult:
    action_id: str
    action_type: str
    action_title: str
    category: str
    priority: str

    # GBM parameters used
    mu: float                      # Monthly drift
    sigma: float                   # Monthly volatility
    base_revenue: float            # Starting monthly revenue
    monthly_cost: float            # Implementation cost per month

    # Monte Carlo results
    revenue_paths_summary: Dict    # {p10, p25, p50, p75, p90} at each month
    cumulative_profit: Dict        # NPV of (revenue lift - cost) at percentiles
    time_savings_monthly: float    # Expected hours saved per month
    breakeven_month: Optional[int] # Month where cumulative profit > 0 (P50)
    roi_12m: Dict                  # ROI at 12 months {p10, p50, p90}

    # Risk metrics
    probability_positive: float    # P(cumulative profit > 0) at horizon
    var_95: float                  # Value at Risk (5th percentile loss)
    expected_value: float          # E[cumulative profit]


def parse_cost(cost_str: str) -> float:
    """Parse cost strings like '$0', '$150/month', '$500'."""
    if not cost_str:
        return 0
    nums = re.findall(r'[\d,]+(?:\.\d+)?', cost_str.replace(',', ''))
    return float(nums[0]) if nums else 0


def parse_expected_impact(impact_str: str) -> Dict:
    """Parse free-text impact like '+0.3 rating, improved visibility'."""
    result = {"rating_lift": 0, "text": impact_str}
    if not impact_str:
        return result
    rating_match = re.search(r'[+]?([\d.]+)\s*rating', impact_str, re.I)
    if rating_match:
        result["rating_lift"] = float(rating_match.group(1))
    pct_match = re.search(r'(\d+)%', impact_str)
    if pct_match:
        result["pct_lift"] = int(pct_match.group(1))
    return result


def get_action_params(action: Dict, business: Dict, config: SimulationConfig) -> Tuple[float, float, float, float, float]:
    """
    Derive (mu, sigma, base_revenue, monthly_cost, time_savings) for an action.
    Combines action_type priors × priority × PKP × neighborhood.
    """
    action_type = action.get("action_type", "")
    category = action.get("category", "growth")
    priority = action.get("priority", "medium")

    # Get base priors
    if action_type in ACTION_TYPE_PRIORS:
        mu_base, sigma_base, time_save, cost = ACTION_TYPE_PRIORS[action_type]
    elif category in CATEGORY_PRIORS:
        mu_base, sigma_base, time_save, cost = CATEGORY_PRIORS[category]
    else:
        mu_base, sigma_base, time_save, cost = (0.05, 0.04, 0, 100)

    # Override cost if action has explicit cost
    explicit_cost = parse_cost(action.get("cost_estimate", ""))
    if explicit_cost > 0:
        cost = explicit_cost

    # Priority multiplier
    pri_mult = PRIORITY_MULTIPLIERS.get(priority, 0.8)
    mu = mu_base * pri_mult
    sigma = sigma_base * (1 + (pri_mult - 1) * 0.5)  # Higher priority = slightly more variance

    # PKP-based revenue scale
    pkp = business.get("pkp_node_type", "asset")
    base_revenue = PKP_REVENUE_SCALE.get(pkp, 15000)

    # Rating adjustment: higher-rated businesses have more to protect, less upside
    rating = business.get("rating", 3.5)
    if rating >= 4.5:
        mu *= 0.7      # Less room to grow
        sigma *= 0.8   # More predictable
    elif rating <= 2.5:
        mu *= 1.4      # More room to grow
        sigma *= 1.3   # More volatile

    # Neighborhood competition effect on sigma
    hood = business.get("neighborhood_area", "Coral Gables")
    hood_mult = NEIGHBORHOOD_COMPETITION.get(hood, 1.0)
    sigma *= hood_mult

    return mu, sigma, base_revenue, cost, time_save


def run_gbm_simulation(mu: float, sigma: float, S0: float, cost_monthly: float,
                       config: SimulationConfig) -> Dict:
    """
    Run Monte Carlo GBM simulation for revenue lift.

    S_t = base revenue under strategy
    Revenue lift at t = S_t - S_0
    Profit at t = revenue_lift - cost
    Cumulative profit = Σ discounted(profit_t)
    """
    N = config.n_paths
    T = config.horizon_months
    dt = config.dt
    discount = config.discount_rate

    if HAS_NUMPY:
        # Vectorized numpy
        Z = np.random.standard_normal((N, T))
        log_returns = (mu - 0.5 * sigma**2) * dt + sigma * math.sqrt(dt) * Z
        # Revenue multiplier paths (cumulative product of monthly returns)
        multipliers = np.exp(np.cumsum(log_returns, axis=1))
        # Revenue at each month
        revenue_paths = S0 * multipliers
        # Monthly lift = revenue - baseline
        lift_paths = revenue_paths - S0
        # Monthly profit = lift - cost
        profit_paths = lift_paths - cost_monthly
        # Discounted cumulative profit
        discount_factors = np.array([(1 / (1 + discount))**t for t in range(1, T + 1)])
        cum_profit = np.cumsum(profit_paths * discount_factors, axis=1)

        # Summary statistics
        percentiles = [10, 25, 50, 75, 90]
        revenue_summary = {}
        for m in range(T):
            vals = revenue_paths[:, m]
            revenue_summary[m + 1] = {f"p{p}": round(float(np.percentile(vals, p)), 2) for p in percentiles}

        cum_profit_final = cum_profit[:, -1]
        profit_summary = {f"p{p}": round(float(np.percentile(cum_profit_final, p)), 2) for p in percentiles}

        # Breakeven month (P50)
        median_cum = np.median(cum_profit, axis=0)
        breakeven = None
        for m in range(T):
            if median_cum[m] > 0:
                breakeven = m + 1
                break

        # ROI at 12m (or horizon)
        total_cost = cost_monthly * T
        roi = {}
        for p in [10, 50, 90]:
            final_profit = float(np.percentile(cum_profit_final, p))
            roi[f"p{p}"] = round(final_profit / max(total_cost, 1) * 100, 1) if total_cost > 0 else round(final_profit, 2)

        prob_positive = float(np.mean(cum_profit_final > 0))
        var_95 = float(np.percentile(cum_profit_final, 5))
        expected = float(np.mean(cum_profit_final))

        # Monthly trajectory for chart (P10, P50, P90)
        trajectory = []
        for m in range(T):
            trajectory.append({
                "month": m + 1,
                "p10": round(float(np.percentile(cum_profit[:, m], 10)), 0),
                "p25": round(float(np.percentile(cum_profit[:, m], 25)), 0),
                "p50": round(float(np.percentile(cum_profit[:, m], 50)), 0),
                "p75": round(float(np.percentile(cum_profit[:, m], 75)), 0),
                "p90": round(float(np.percentile(cum_profit[:, m], 90)), 0),
            })
    else:
        # Pure Python fallback
        trajectory = [{} for _ in range(T)]
        cum_finals = []
        all_cum = [[] for _ in range(T)]

        for _ in range(N):
            S = S0
            cum = 0
            for m in range(T):
                Z = random.gauss(0, 1)
                S = S * math.exp((mu - 0.5 * sigma**2) * dt + sigma * math.sqrt(dt) * Z)
                lift = S - S0
                profit = lift - cost_monthly
                df = (1 / (1 + discount))**(m + 1)
                cum += profit * df
                all_cum[m].append(cum)
            cum_finals.append(cum)

        def percentile(data, p):
            data_sorted = sorted(data)
            k = (len(data_sorted) - 1) * p / 100
            f = math.floor(k)
            c = math.ceil(k)
            if f == c:
                return data_sorted[int(k)]
            return data_sorted[f] * (c - k) + data_sorted[c] * (k - f)

        trajectory = []
        for m in range(T):
            trajectory.append({
                "month": m + 1,
                "p10": round(percentile(all_cum[m], 10), 0),
                "p25": round(percentile(all_cum[m], 25), 0),
                "p50": round(percentile(all_cum[m], 50), 0),
                "p75": round(percentile(all_cum[m], 75), 0),
                "p90": round(percentile(all_cum[m], 90), 0),
            })

        median_cum = [percentile(all_cum[m], 50) for m in range(T)]
        breakeven = None
        for m in range(T):
            if median_cum[m] > 0:
                breakeven = m + 1
                break

        total_cost = cost_monthly * T
        profit_summary = {f"p{p}": round(percentile(cum_finals, p), 2) for p in [10, 25, 50, 75, 90]}
        roi = {}
        for p in [10, 50, 90]:
            fp = percentile(cum_finals, p)
            roi[f"p{p}"] = round(fp / max(total_cost, 1) * 100, 1) if total_cost > 0 else round(fp, 2)
        prob_positive = sum(1 for x in cum_finals if x > 0) / N
        var_95 = percentile(cum_finals, 5)
        expected = sum(cum_finals) / N
        revenue_summary = {}

    return {
        "trajectory": trajectory,
        "cumulative_profit": profit_summary,
        "breakeven_month": breakeven,
        "roi_12m": roi,
        "probability_positive": round(prob_positive, 3),
        "var_95": round(var_95, 2),
        "expected_value": round(expected, 2),
        "revenue_summary": revenue_summary,
    }


# ═════════════════════════════════════════════════════════════════
# PHASE 2: MULTI-ARMED BANDIT (Thompson Sampling)
# ═════════════════════════════════════════════════════════════════
# Each action is an "arm". We maintain Beta posteriors for success rate.
# θ_a ~ Beta(α_a, β_a)
# Initially α=1, β=1 (uniform prior)
# On success: α += 1. On failure: β += 1.
# Selection: sample θ from each arm, pick highest.

@dataclass
class BanditArm:
    arm_id: str
    action_type: str
    title: str
    category: str
    alpha: float = 1.0       # Success count + 1
    beta: float = 1.0        # Failure count + 1
    n_pulls: int = 0         # Total times selected
    total_reward: float = 0  # Sum of rewards

    @property
    def mean(self) -> float:
        return self.alpha / (self.alpha + self.beta)

    @property
    def variance(self) -> float:
        a, b = self.alpha, self.beta
        return (a * b) / ((a + b)**2 * (a + b + 1))

    def sample(self) -> float:
        """Thompson sample from Beta posterior."""
        if HAS_NUMPY:
            return float(np.random.beta(self.alpha, self.beta))
        else:
            # Pure Python beta sampling via gamma
            x = random.gammavariate(self.alpha, 1)
            y = random.gammavariate(self.beta, 1)
            return x / (x + y) if (x + y) > 0 else 0.5

    def update(self, reward: float):
        """Update posterior with observed reward (0-1 scale)."""
        self.n_pulls += 1
        self.total_reward += reward
        if reward > 0.5:  # Binary: success
            self.alpha += 1
        else:
            self.beta += 1


@dataclass
class BanditState:
    """Persistent state for the MAB experiment."""
    business_id: str
    business_name: str
    arms: List[BanditArm] = field(default_factory=list)
    history: List[Dict] = field(default_factory=list)
    total_rounds: int = 0

    def select_arm(self) -> BanditArm:
        """Thompson Sampling: sample each arm, pick highest."""
        samples = [(arm, arm.sample()) for arm in self.arms]
        samples.sort(key=lambda x: -x[1])
        return samples[0][0]

    def get_recommendation(self) -> Dict:
        """Get current recommendation with confidence."""
        if not self.arms:
            return {}
        best = max(self.arms, key=lambda a: a.mean)
        return {
            "recommended_action": best.title,
            "action_type": best.action_type,
            "confidence": round(best.mean, 3),
            "uncertainty": round(math.sqrt(best.variance), 3),
            "n_observations": best.n_pulls,
            "exploration_needed": best.n_pulls < 10,
        }


def initialize_bandit(business: Dict, actions: List[Dict]) -> Dict:
    """Create MAB state for a business with its available actions."""
    arms = []
    for i, a in enumerate(actions):
        # Set initial priors based on category/priority (informative prior)
        cat = a.get("category", "growth")
        pri = a.get("priority", "medium")
        # Better prior for higher priority actions
        alpha_prior = {"urgent": 3, "high": 2, "medium": 1}.get(pri, 1)
        beta_prior = 1

        arms.append({
            "arm_id": f"{business.get('business_id', i)}_{i}",
            "action_type": a.get("action_type", "unknown"),
            "title": a.get("title", f"Action {i+1}"),
            "category": cat,
            "alpha": alpha_prior,
            "beta": beta_prior,
            "n_pulls": 0,
            "total_reward": 0,
            "mean": round(alpha_prior / (alpha_prior + beta_prior), 3),
            "variance": round((alpha_prior * beta_prior) / ((alpha_prior + beta_prior)**2 * (alpha_prior + beta_prior + 1)), 4),
        })

    # Simulate 20 rounds of Thompson Sampling to show exploration dynamics
    sim_history = []
    arm_states = [(a["alpha"], a["beta"]) for a in arms]
    for rnd in range(20):
        # Sample
        samples = []
        for j, (al, be) in enumerate(arm_states):
            if HAS_NUMPY:
                s = float(np.random.beta(al, be))
            else:
                x = random.gammavariate(al, 1)
                y = random.gammavariate(be, 1)
                s = x / (x + y)
            samples.append(s)

        chosen = samples.index(max(samples))
        # Simulate reward (based on prior mean + noise)
        true_rate = arm_states[chosen][0] / (arm_states[chosen][0] + arm_states[chosen][1])
        reward = 1 if random.random() < true_rate else 0

        # Update
        al, be = arm_states[chosen]
        if reward:
            arm_states[chosen] = (al + 1, be)
        else:
            arm_states[chosen] = (al, be + 1)

        sim_history.append({
            "round": rnd + 1,
            "chosen_arm": chosen,
            "chosen_title": arms[chosen]["title"][:40],
            "reward": reward,
            "arm_means": [round(a / (a + b), 3) for a, b in arm_states],
        })

    return {
        "arms": arms,
        "simulated_history": sim_history,
        "recommendation": {
            "best_arm": max(range(len(arm_states)), key=lambda j: arm_states[j][0] / sum(arm_states[j])),
            "best_title": arms[max(range(len(arm_states)), key=lambda j: arm_states[j][0] / sum(arm_states[j]))]["title"],
            "exploration_status": "Prior-based (no real data yet)",
        },
    }


# ═════════════════════════════════════════════════════════════════
# PHASE 3: Q-LEARNING SKELETON (Bellman Equation)
# ═════════════════════════════════════════════════════════════════
# Q(s,a) ← Q(s,a) + α[r + γ max_a' Q(s',a') - Q(s,a)]
#
# State s = (pkp_type, rating_bucket, competition_level)
# Action a = strategy choice
# Reward r = measured dollar lift (normalized)
#
# This is a skeleton — needs sequential outcome data to train.

def build_q_table_skeleton(businesses: List[Dict], actions_per_biz: Dict) -> Dict:
    """Build Q-table structure (initialized to 0)."""
    # State space
    pkp_types = ["infrastructure", "platform", "asset"]
    rating_buckets = ["low", "mid", "high"]  # <3, 3-4.2, 4.2+
    competition_levels = ["low", "medium", "high"]

    states = []
    for p in pkp_types:
        for r in rating_buckets:
            for c in competition_levels:
                states.append(f"{p}|{r}|{c}")

    # Action space (unique action types)
    action_types = set()
    for biz_actions in actions_per_biz.values():
        for a in biz_actions:
            action_types.add(a.get("action_type", "unknown"))
    action_types = sorted(action_types)

    # Q-table (all zeros — no training data yet)
    q_table = {}
    for s in states:
        q_table[s] = {a: 0.0 for a in action_types}

    return {
        "states": states,
        "actions": action_types,
        "q_table": q_table,
        "config": {
            "alpha": 0.1,         # Learning rate
            "gamma": 0.95,        # Discount factor
            "epsilon": 0.15,      # Exploration rate (ε-greedy)
            "episodes_trained": 0,
            "status": "Initialized — awaiting outcome data for training",
        },
        "bellman_equation": "Q(s,a) ← Q(s,a) + α[r + γ·max_a' Q(s',a') - Q(s,a)]",
    }


# ═════════════════════════════════════════════════════════════════
# MAIN PIPELINE
# ═════════════════════════════════════════════════════════════════

def load_data() -> Tuple[List[Dict], Dict]:
    """Load playbook and master CSV data."""
    with open(PLAYBOOK_PATH) as f:
        playbook = json.load(f).get("playbook", [])

    # Load master CSV for business metadata
    import csv
    biz_meta = {}
    with open(MASTER_CSV) as f:
        reader = csv.DictReader(f)
        for row in reader:
            bid = row.get("business_id", "")
            if bid:
                biz_meta[bid] = row
            # Also index by name for matching
            bname = row.get("business_name", "")
            if bname:
                biz_meta[f"name:{bname}"] = row

    return playbook, biz_meta


def match_business(biz: Dict, meta: Dict) -> Dict:
    """Merge playbook business with master CSV metadata."""
    bid = biz.get("business_id", "")
    bname = biz.get("business_name", "")

    matched = meta.get(bid) or meta.get(f"name:{bname}") or {}
    return {
        "business_id": bid or matched.get("business_id", bname.lower().replace(" ", "_")),
        "business_name": bname,
        "category_primary": matched.get("category_primary", "other"),
        "neighborhood_area": matched.get("neighborhood_area", "Coral Gables"),
        "rating": float(matched.get("rating_primary_value", 3.5) or 3.5),
        "pkp_node_type": matched.get("pkp_node_type", "asset") or "asset",
        "chamber_member": matched.get("chamber_member", "") == "Y",
    }


def main(n_paths: int = 1000, horizon: int = 12):
    print(f"\n{'='*60}")
    print(f"  STRATEGY EXPERIMENTATION ENGINE")
    print(f"  Paths: {n_paths}  Horizon: {horizon}mo  numpy: {HAS_NUMPY}")
    print(f"{'='*60}\n")

    playbook, biz_meta = load_data()
    print(f"  Loaded {len(playbook)} businesses from playbook")

    config = SimulationConfig(n_paths=n_paths, horizon_months=horizon)
    results = {
        "config": {
            "n_paths": n_paths,
            "horizon_months": horizon,
            "discount_rate_annual": round(config.discount_rate * 12, 3),
            "generated_at": "2026-03-08",
        },
        "businesses": [],
    }

    actions_per_biz = {}
    for biz_entry in playbook:
        actions_per_biz[biz_entry.get("business_name", "")] = biz_entry.get("actions", [])

    for biz_entry in playbook:
        biz = match_business(biz_entry, biz_meta)
        actions = biz_entry.get("actions", [])
        print(f"\n  [{biz['business_name']}] ({biz['pkp_node_type']}, ★{biz['rating']:.1f})")

        biz_result = {
            "business_id": biz["business_id"],
            "business_name": biz["business_name"],
            "category": biz["category_primary"],
            "neighborhood": biz["neighborhood_area"],
            "rating": biz["rating"],
            "pkp_type": biz["pkp_node_type"],
            "simulations": [],
            "bandit": None,
        }

        for i, action in enumerate(actions):
            mu, sigma, base_rev, cost, time_save = get_action_params(action, biz, config)
            print(f"    Action {i+1}: {action.get('title','?')[:50]}")
            print(f"      μ={mu:.4f}/mo  σ={sigma:.4f}  base=${base_rev:,.0f}/mo  cost=${cost:.0f}/mo")

            sim = run_gbm_simulation(mu, sigma, base_rev, cost, config)

            biz_result["simulations"].append({
                "action_id": f"{biz['business_id']}_{i}",
                "action_type": action.get("action_type", "unknown"),
                "title": action.get("title", f"Action {i+1}"),
                "description": action.get("description", ""),
                "category": action.get("category", ""),
                "priority": action.get("priority", ""),
                "timeframe": action.get("timeframe", ""),
                "cost_estimate": action.get("cost_estimate", "$0"),
                "expected_impact_text": action.get("expected_impact", ""),
                # Model parameters
                "params": {
                    "mu": round(mu, 5),
                    "sigma": round(sigma, 5),
                    "base_revenue": base_rev,
                    "monthly_cost": cost,
                    "time_savings_hrs": time_save,
                },
                # Results
                "trajectory": sim["trajectory"],
                "cumulative_profit": sim["cumulative_profit"],
                "breakeven_month": sim["breakeven_month"],
                "roi": sim["roi_12m"],
                "probability_positive": sim["probability_positive"],
                "var_95": sim["var_95"],
                "expected_value": sim["expected_value"],
                "time_savings_monthly_hrs": time_save,
            })

            ev = sim["expected_value"]
            be = sim["breakeven_month"]
            pp = sim["probability_positive"]
            print(f"      E[profit]=${ev:,.0f}  Breakeven={be or 'N/A'}mo  P(+)={pp:.1%}")

        # Phase 2: MAB for this business
        bandit = initialize_bandit(biz, actions)
        biz_result["bandit"] = bandit

        results["businesses"].append(biz_result)

    # Phase 3: Q-table skeleton
    results["q_learning"] = build_q_table_skeleton(
        [match_business(b, biz_meta) for b in playbook],
        actions_per_biz
    )

    # Summary stats
    all_sims = [s for b in results["businesses"] for s in b["simulations"]]
    results["summary"] = {
        "total_businesses": len(results["businesses"]),
        "total_actions": len(all_sims),
        "avg_expected_value": round(sum(s["expected_value"] for s in all_sims) / len(all_sims), 2),
        "avg_probability_positive": round(sum(s["probability_positive"] for s in all_sims) / len(all_sims), 3),
        "best_action": max(all_sims, key=lambda s: s["expected_value"])["title"],
        "best_ev": max(s["expected_value"] for s in all_sims),
        "riskiest_action": min(all_sims, key=lambda s: s["var_95"])["title"],
        "worst_var95": min(s["var_95"] for s in all_sims),
    }

    # Save
    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(OUT_PATH, "w") as f:
        json.dump(results, f, separators=(",", ":"))
    size_kb = OUT_PATH.stat().st_size / 1024
    print(f"\n  Output: {OUT_PATH}")
    print(f"  Size: {size_kb:.1f} KB")
    print(f"\n  Summary:")
    print(f"    Businesses:    {results['summary']['total_businesses']}")
    print(f"    Actions:       {results['summary']['total_actions']}")
    print(f"    Avg E[profit]: ${results['summary']['avg_expected_value']:,.0f}")
    print(f"    Avg P(+):      {results['summary']['avg_probability_positive']:.1%}")
    print(f"    Best action:   {results['summary']['best_action']}")
    print(f"    Best E[V]:     ${results['summary']['best_ev']:,.0f}")
    print(f"\n{'='*60}\n")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Strategy Experimentation Engine")
    parser.add_argument("--paths", type=int, default=1000, help="Monte Carlo paths")
    parser.add_argument("--horizon", type=int, default=12, help="Projection horizon (months)")
    args = parser.parse_args()
    main(n_paths=args.paths, horizon=args.horizon)
