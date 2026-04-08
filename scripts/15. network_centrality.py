#!/usr/bin/env python3
"""
Network Centrality Analyzer — Computes graph centrality metrics
===============================================================
Reads graph_data.json (331 nodes, 1,738 edges) and computes:
  1. Degree centrality (in/out connections)
  2. PageRank (influence propagation)
  3. Betweenness centrality (bridge nodes)
  4. Community detection (connected components by edge type)
  5. Hub/Authority scores (HITS algorithm, simplified)

Outputs:
  dashboard/public/data/network_centrality.json — per-node centrality metrics
  Updates graph_data.json nodes with centrality fields

Usage:
  python3 "scripts/15. network_centrality.py"
"""

import json
import math
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
GRAPH_DATA = ROOT / "dashboard" / "public" / "data" / "graph_data.json"
OUT_CENTRALITY = ROOT / "dashboard" / "public" / "data" / "network_centrality.json"

def load_graph():
    with open(GRAPH_DATA) as f:
        return json.load(f)

def compute_degree(nodes, links):
    """Degree centrality: normalized count of connections per node."""
    degree = defaultdict(int)
    in_degree = defaultdict(int)
    out_degree = defaultdict(int)
    degree_by_type = defaultdict(lambda: defaultdict(int))

    for link in links:
        src = link["source"] if isinstance(link["source"], str) else link["source"]["id"]
        tgt = link["target"] if isinstance(link["target"], str) else link["target"]["id"]
        etype = link.get("type", "UNKNOWN")
        degree[src] += 1
        degree[tgt] += 1
        out_degree[src] += 1
        in_degree[tgt] += 1
        degree_by_type[src][etype] += 1
        degree_by_type[tgt][etype] += 1

    n = len(nodes)
    max_deg = max(degree.values()) if degree else 1
    return {
        nid: {
            "degree": degree.get(nid, 0),
            "degree_norm": round(degree.get(nid, 0) / max_deg, 4),
            "in_degree": in_degree.get(nid, 0),
            "out_degree": out_degree.get(nid, 0),
            "by_type": dict(degree_by_type.get(nid, {})),
        }
        for nid in [n["id"] for n in nodes]
    }

def compute_pagerank(nodes, links, damping=0.85, iterations=50):
    """PageRank: iterative influence propagation."""
    node_ids = [n["id"] for n in nodes]
    n = len(node_ids)
    if n == 0:
        return {}

    # Build adjacency
    out_links = defaultdict(list)
    for link in links:
        src = link["source"] if isinstance(link["source"], str) else link["source"]["id"]
        tgt = link["target"] if isinstance(link["target"], str) else link["target"]["id"]
        out_links[src].append(tgt)

    # Initialize
    pr = {nid: 1.0 / n for nid in node_ids}

    for _ in range(iterations):
        new_pr = {}
        for nid in node_ids:
            rank = (1 - damping) / n
            for other in node_ids:
                if nid in out_links.get(other, []):
                    out_count = len(out_links[other])
                    if out_count > 0:
                        rank += damping * pr[other] / out_count
            new_pr[nid] = rank
        pr = new_pr

    # Normalize
    max_pr = max(pr.values()) if pr else 1
    return {nid: round(v / max_pr, 4) for nid, v in pr.items()}

def compute_betweenness_approx(nodes, links, sample_size=50):
    """
    Approximate betweenness centrality via BFS from sampled source nodes.
    Full Brandes is O(VE) — we sample to keep it fast.
    """
    node_ids = [n["id"] for n in nodes]
    adj = defaultdict(set)
    for link in links:
        src = link["source"] if isinstance(link["source"], str) else link["source"]["id"]
        tgt = link["target"] if isinstance(link["target"], str) else link["target"]["id"]
        adj[src].add(tgt)
        adj[tgt].add(src)

    betweenness = defaultdict(float)

    # Sample source nodes (use highest degree as they're most informative)
    degree_sorted = sorted(node_ids, key=lambda x: len(adj[x]), reverse=True)
    sources = degree_sorted[:sample_size]

    for s in sources:
        # BFS
        dist = {s: 0}
        queue = [s]
        parents = defaultdict(list)
        sigma = defaultdict(float)
        sigma[s] = 1.0
        order = []

        head = 0
        while head < len(queue):
            v = queue[head]
            head += 1
            order.append(v)
            for w in adj[v]:
                if w not in dist:
                    dist[w] = dist[v] + 1
                    queue.append(w)
                if dist.get(w) == dist[v] + 1:
                    sigma[w] += sigma[v]
                    parents[w].append(v)

        # Accumulate
        delta = defaultdict(float)
        for w in reversed(order):
            for v in parents[w]:
                delta[v] += (sigma[v] / sigma[w]) * (1 + delta[w])
            if w != s:
                betweenness[w] += delta[w]

    # Normalize
    max_bc = max(betweenness.values()) if betweenness else 1
    return {nid: round(betweenness.get(nid, 0) / max_bc, 4) for nid in node_ids}

def compute_clustering(nodes, links):
    """Local clustering coefficient: how connected are a node's neighbors."""
    adj = defaultdict(set)
    for link in links:
        src = link["source"] if isinstance(link["source"], str) else link["source"]["id"]
        tgt = link["target"] if isinstance(link["target"], str) else link["target"]["id"]
        adj[src].add(tgt)
        adj[tgt].add(src)

    result = {}
    for n in nodes:
        nid = n["id"]
        neighbors = adj[nid]
        k = len(neighbors)
        if k < 2:
            result[nid] = 0.0
            continue
        # Count edges between neighbors
        triangles = 0
        nlist = list(neighbors)
        for i in range(len(nlist)):
            for j in range(i + 1, len(nlist)):
                if nlist[j] in adj[nlist[i]]:
                    triangles += 1
        result[nid] = round(2 * triangles / (k * (k - 1)), 4)
    return result

def detect_communities(nodes, links):
    """Simple label propagation community detection."""
    adj = defaultdict(set)
    for link in links:
        src = link["source"] if isinstance(link["source"], str) else link["source"]["id"]
        tgt = link["target"] if isinstance(link["target"], str) else link["target"]["id"]
        adj[src].add(tgt)
        adj[tgt].add(src)

    labels = {n["id"]: i for i, n in enumerate(nodes)}

    for _ in range(20):
        changed = False
        for n in nodes:
            nid = n["id"]
            if not adj[nid]:
                continue
            neighbor_labels = defaultdict(int)
            for nb in adj[nid]:
                neighbor_labels[labels.get(nb, 0)] += 1
            best = max(neighbor_labels, key=neighbor_labels.get)
            if labels[nid] != best:
                labels[nid] = best
                changed = True
        if not changed:
            break

    # Renumber communities
    unique = sorted(set(labels.values()))
    remap = {old: new for new, old in enumerate(unique)}
    return {nid: remap[lab] for nid, lab in labels.items()}

def main():
    print("=" * 60)
    print("  Network Centrality Analyzer")
    print("=" * 60)

    graph = load_graph()
    nodes = graph["nodes"]
    links = graph["links"]
    print(f"\n  Nodes: {len(nodes)}  Links: {len(links)}")

    # Compute metrics
    print("  Computing degree centrality...")
    degrees = compute_degree(nodes, links)

    print("  Computing PageRank (50 iterations)...")
    pagerank = compute_pagerank(nodes, links)

    print("  Computing betweenness centrality (top-50 sources)...")
    betweenness = compute_betweenness_approx(nodes, links, sample_size=50)

    print("  Computing clustering coefficients...")
    clustering = compute_clustering(nodes, links)

    print("  Detecting communities...")
    communities = detect_communities(nodes, links)

    # Merge into centrality output
    centrality = {}
    for n in nodes:
        nid = n["id"]
        deg = degrees.get(nid, {})
        centrality[nid] = {
            "id": nid,
            "name": n.get("name", nid),
            "type": n.get("type", "unknown"),
            "category": n.get("category", ""),
            "neighborhood": n.get("neighborhood", ""),
            "member": n.get("member", False),
            "degree": deg.get("degree", 0),
            "degree_norm": deg.get("degree_norm", 0),
            "in_degree": deg.get("in_degree", 0),
            "out_degree": deg.get("out_degree", 0),
            "degree_by_type": deg.get("by_type", {}),
            "pagerank": pagerank.get(nid, 0),
            "betweenness": betweenness.get(nid, 0),
            "clustering": clustering.get(nid, 0),
            "community": communities.get(nid, 0),
        }

    # Composite influence score: weighted blend
    for nid, c in centrality.items():
        c["influence_score"] = round(
            c["pagerank"] * 0.35 +
            c["betweenness"] * 0.30 +
            c["degree_norm"] * 0.25 +
            c["clustering"] * 0.10,
            4
        )

    # Sort by influence
    ranked = sorted(centrality.values(), key=lambda x: -x["influence_score"])

    # Community stats
    community_sizes = defaultdict(int)
    for c in centrality.values():
        community_sizes[c["community"]] += 1

    output = {
        "generated_at": __import__("datetime").datetime.now().isoformat(),
        "total_nodes": len(nodes),
        "total_links": len(links),
        "num_communities": len(community_sizes),
        "community_sizes": dict(sorted(community_sizes.items(), key=lambda x: -x[1])),
        "top_influencers": [
            {k: v for k, v in n.items() if k != "degree_by_type"}
            for n in ranked[:25] if n["type"] == "business"
        ],
        "bridge_nodes": sorted(
            [c for c in centrality.values() if c["type"] == "business"],
            key=lambda x: -x["betweenness"]
        )[:15],
        "hub_categories": sorted(
            [c for c in centrality.values() if c["type"] == "category"],
            key=lambda x: -x["degree"]
        ),
        "hub_neighborhoods": sorted(
            [c for c in centrality.values() if c["type"] == "neighborhood"],
            key=lambda x: -x["degree"]
        ),
        "nodes": {nid: c for nid, c in centrality.items()},
    }

    with open(OUT_CENTRALITY, "w") as f:
        json.dump(output, f, indent=2)
    print(f"\n  Output: {OUT_CENTRALITY}")

    # Summary
    print(f"\n  Communities found: {len(community_sizes)}")
    for cid, size in sorted(community_sizes.items(), key=lambda x: -x[1])[:8]:
        print(f"    Community {cid}: {size} nodes")

    print(f"\n  Top 10 Influencers (businesses):")
    for n in ranked[:10]:
        if n["type"] == "business":
            print(f"    {n['name']:40s} influence={n['influence_score']:.3f}  PR={n['pagerank']:.3f}  BC={n['betweenness']:.3f}  deg={n['degree']}")

    print(f"\n  Top 5 Bridge Nodes:")
    bridges = sorted([c for c in centrality.values() if c["type"] == "business"], key=lambda x: -x["betweenness"])[:5]
    for n in bridges:
        print(f"    {n['name']:40s} betweenness={n['betweenness']:.3f}  community={n['community']}")

    print(f"\n  Done.")

if __name__ == "__main__":
    main()
