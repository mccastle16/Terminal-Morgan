# agent2.py
from dataclasses import dataclass
from typing import Any, Dict, List, Optional

@dataclass
class Agent2Config:
    name: str = "normalization_agent"

class Agent2:
    def __init__(self, config: Optional[Agent2Config] = None) -> None:
        self.config = config or Agent2Config()

    def normalize_record(self, record: Dict[str, Any]) -> Dict[str, Any]:
        """
        Take a single raw record and map it into your canonical schema.
        Example canonical schema (adjust to your CSV spec):
        {
          "business_name": str,
          "category": str,
          "specialty": str,
          "address": str,
          "phone": str,
          "website": str,
          "rating": float | None,
          "reviews": int | None,
          "source": str,
          "notes": str,
        }
        """
        # TODO: replace placeholder mapping with real normalization logic
        normalized = {
            "business_name": record.get("business_name") or record.get("name") or "",
            "category": record.get("category") or "",
            "specialty": record.get("specialty") or "",
            "address": record.get("address") or "",
            "phone": record.get("phone") or "",
            "website": record.get("website") or "",
            "rating": record.get("rating"),
            "reviews": record.get("reviews"),
            "source": record.get("source") or "",
            "notes": record.get("notes") or "",
        }
        return normalized

    def run(self, input_payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        High‑level role:
        - Take Agent1's output.
        - Normalize to canonical fields.
        - Optionally enrich (e.g., geocoding, category mapping).

        Expected input:
        {
          "agent": "discovery_agent",
          "query": "...",
          "raw_results": [ {...}, ... ],
          "metadata": {...}
        }
        """
        raw_results: List[Dict[str, Any]] = input_payload.get("raw_results", [])
        normalized_records: List[Dict[str, Any]] = []

        for record in raw_results:
            normalized = self.normalize_record(record)
            # TODO: add enrichment (geocode, NAICS mapping, etc.)
            normalized_records.append(normalized)

        return {
            "agent": self.config.name,
            "query": input_payload.get("query", ""),
            "records": normalized_records,
            "metadata": {
                "input_agent": input_payload.get("agent"),
                "record_count": len(normalized_records),
            },
        }

if __name__ == "__main__":
    dummy_input = {
        "agent": "discovery_agent",
        "query": "Collect Coral Gables businesses.",
        "raw_results": [
            {"name": "Example Business", "address": "Coral Gables, FL", "source": "Web"},
        ],
    }
    agent = Agent2()
    demo = agent.run(dummy_input)
    print(demo)
