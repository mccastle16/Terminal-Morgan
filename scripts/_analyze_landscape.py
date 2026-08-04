#!/usr/bin/env python3
"""Analyze the Coral Gables business landscape to identify gaps and opportunities."""
import pandas as pd
import json
import os

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
df = pd.read_csv(os.path.join(BASE, "data", "master_all_businesses.csv"))

print("=== CATEGORY COUNTS ===")
print(df["category_primary"].value_counts().to_string())

print("\n=== NEIGHBORHOOD COUNTS ===")
print(df["neighborhood_area"].value_counts().to_string())

print("\n=== CATEGORY x NEIGHBORHOOD CROSS-TAB (top 10 cats) ===")
top_cats = df["category_primary"].value_counts().head(10).index.tolist()
ct = pd.crosstab(df["neighborhood_area"], df["category_primary"])[top_cats]
print(ct.to_string())

print("\n=== PRICE TIER DISTRIBUTION ===")
print(df["price_tier"].value_counts(dropna=False).to_string())

print("\n=== PKP NODE TYPES ===")
print(df["pkp_node_type"].value_counts(dropna=False).to_string())

print("\n=== RATING DISTRIBUTION ===")
ratings = df["rating_primary_value"].dropna()
print(f"Count: {len(ratings)}, Mean: {ratings.mean():.2f}, Median: {ratings.median():.1f}")
print(f"Below 3.0: {(ratings < 3.0).sum()}, 3.0-4.0: {((ratings >= 3.0) & (ratings < 4.0)).sum()}, 4.0+: {(ratings >= 4.0).sum()}")

print("\n=== CHAMBER MEMBERSHIP BY CATEGORY ===")
members = df[df["chamber_member"] == True]
non_members = df[df["chamber_member"] != True]
print(f"Members: {len(members)}, Non-members: {len(non_members)}")
print("Top member categories:")
print(members["category_primary"].value_counts().head(10).to_string())

print("\n=== BUSINESSES PER CATEGORY PER 1000 RESIDENTS (pop ~50,000) ===")
pop = 50000
cat_counts = df["category_primary"].value_counts()
per_1k = (cat_counts / pop * 1000).round(2)
print(per_1k.to_string())

print("\n=== CATEGORY GAPS vs NATIONAL BENCHMARKS ===")
# National avg businesses per 1000 people (approximate)
benchmarks = {
    "food_beverage": 15.0,
    "retail": 12.0,
    "healthcare": 8.0,
    "professional_services": 6.0,
    "real_estate": 5.0,
    "financial_services": 4.0,
    "construction": 4.0,
    "technology": 3.5,
    "education": 3.0,
    "personal_services": 5.0,
    "wellness": 3.0,
    "automotive": 2.5,
    "hospitality": 3.0,
    "arts_culture": 1.5,
    "insurance": 2.0,
    "marketing": 1.5,
    "consulting": 2.0,
    "transportation": 1.5,
    "media_entertainment": 1.0,
}
print(f"{'Category':<25} {'Actual/1k':<12} {'Benchmark/1k':<14} {'Gap':<8} {'Status'}")
print("-" * 75)
for cat, bench in sorted(benchmarks.items(), key=lambda x: x[1], reverse=True):
    actual = cat_counts.get(cat, 0) / pop * 1000
    gap = bench - actual
    status = "OVER" if gap < 0 else ("OK" if gap < 1 else "UNDER")
    print(f"{cat:<25} {actual:<12.1f} {bench:<14.1f} {gap:<8.1f} {status}")

print("\n=== NEIGHBORHOOD CATEGORY DENSITY GAPS ===")
# Which neighborhoods lack common categories?
all_neighborhoods = df["neighborhood_area"].unique()
common_cats = ["food_beverage", "retail", "healthcare", "professional_services", "wellness"]
for hood in sorted(all_neighborhoods):
    hood_df = df[df["neighborhood_area"] == hood]
    missing = []
    for cat in common_cats:
        count = len(hood_df[hood_df["category_primary"] == cat])
        if count < 3:
            missing.append(f"{cat}({count})")
    if missing:
        print(f"  {hood} ({len(hood_df)} total): needs {', '.join(missing)}")
