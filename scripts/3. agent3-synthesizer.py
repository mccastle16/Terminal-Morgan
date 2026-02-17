# agent3.py
from dataclasses import dataclass
from typing import Any, Dict, List, Optional
import csv
from pathlib import Path

@dataclass
class Agent3Config:
    name: str = "output_agent"
    output_dir: str = "output"
    default_filename: str = "coral_gables_businesses.csv"

class Agent3:
    def __init__(self, config: Optional[Agent3Config] = None) -> None:
        self.config = config or Agent3Config()
        Path(self.config.output_dir).mkdir(parents=True, exist_ok=True)

    def _infer_fieldnames(self, records: List[Dict[str, Any]]) -> List[str]:
        """
        Infer CSV headers from the union of keys across all records.
        You can also hard‑code the canonical order if you prefer.
        """
        fieldnames = set()
        for r in records:
            fieldnames.update(r.keys())
        return sorted(fieldnames)

    def write_csv(
        self,
        records: List[Dict[str, Any]],
        filename: Optional[str] = None,
    ) -> str:
        """
        Persist normalized records to CSV.

        Parameters
        ----------
        records : list[dict]
            Canonical records from Agent2.
        filename : str, optional
            Override default filename.

        Returns
        -------
        str
            Path to the written CSV file.
        """
        if not records:
            # Nothing to write; you may want to raise instead.
            return ""

        filename = filename or self.config.default_filename
        out_path = Path(self.config.output_dir) / filename

        fieldnames = self._infer_fieldnames(records)

        with out_path.open("w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            for row in records:
                writer.writerow(row)

        return str(out_path)

    def run(self, input_payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        High‑level role:
        - Take Agent2's normalized/enriched records.
        - Persist to CSV (or another sink).
        - Return file metadata / stats.

        Expected input:
        {
          "agent": "normalization_agent",
          "query": "...",
          "records": [ {...}, ... ],
          "metadata": {...}
        }
        """
        records: List[Dict[str, Any]] = input_payload.get("records", [])
        csv_path = self.write_csv(records)

        return {
            "agent": self.config.name,
            "query": input_payload.get("query", ""),
            "csv_path": csv_path,
            "record_count": len(records),
            "metadata": {
                "input_agent": input_payload.get("agent"),
            },
        }

if __name__ == "__main__":
    dummy_input = {
        "agent": "normalization_agent",
        "query": "Collect Coral Gables businesses.",
        "records": [
            {
                "business_name": "Example Business",
                "category": "accounting",
                "address": "Coral Gables, FL",
                "source": "Web",
            },
        ],
    }
    agent = Agent3()
    demo = agent.run(dummy_input)
    print(demo)
