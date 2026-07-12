"""Regression tests for the geo logic in scripts/_shared.py and
scripts/2. agent2-validator.py.

Background: _shared.haversine() returns kilometers, but agent2's
reconcile_sources() (Pass B) compares that result directly against
COORD_PROXIMITY_M, a constant documented and named as *meters*
(scripts/2. agent2-validator.py ~line 1114: `if dist > COORD_PROXIMITY_M`).
No unit conversion happens, so the "two records within 100 meters count
as the same physical location" check is actually testing "within 100
kilometers" within whatever candidates the spatial grid pre-filter hands
it. The second test below reproduces that directly.
"""
import pandas as pd
import pytest

from _shared import haversine

from conftest import load_agent_module


def test_haversine_100m_is_not_100km():
    # Two points ~100 meters apart (a tiny lat/lon nudge)
    km = haversine(25.7497, -80.2589, 25.7506, -80.2589)
    assert km < 0.15  # should be ~0.1 km, not 100


@pytest.mark.xfail(
    strict=True,
    reason=(
        "Known bug: agent2's Pass B compares haversine()'s km output "
        "directly against COORD_PROXIMITY_M=100, which is documented as "
        "meters. Two same-named records ~110m apart (i.e. NOT the same "
        "location under the intended 100m rule) still get merged because "
        "0.11 km < 100. Remove this xfail once "
        "'2. agent2-validator.py' converts dist to meters before comparing."
    ),
)
def test_reconcile_sources_rejects_locations_over_100m_apart():
    agent2 = load_agent_module("2. agent2-validator.py")

    # Same business name, two different source families, ~110m apart —
    # just outside the intended 100m "same location" radius, but close
    # enough to land in the same spatial-grid cell so Pass B evaluates it.
    df = pd.DataFrame(
        [
            {
                "business_name": "Java House Cafe",
                "lat": 25.75000,
                "lon": -80.2589,
                "source_file": "outscraper_run1.csv",
            },
            {
                "business_name": "Java House Cafe",
                "lat": 25.75099,
                "lon": -80.2589,
                "source_file": "osm_chunk3.csv",
            },
        ]
    )

    result = agent2.reconcile_sources(df)

    # ~110m apart is outside the intended 100m radius, so these should be
    # treated as two independent businesses (corroboration_count == "1"),
    # not merged into one corroborated record.
    assert result.loc[0, "corroboration_count"] == "1"
    assert result.loc[1, "corroboration_count"] == "1"
