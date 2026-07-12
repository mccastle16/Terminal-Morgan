"""Shared pytest setup for the scripts/ pipeline.

scripts/_shared.py is imported by the agent scripts as a bare module
(`from _shared import ...`), not a package, so tests need scripts/ on
sys.path to import it the same way.
"""
import importlib.util
import sys
from pathlib import Path

SCRIPTS_DIR = Path(__file__).resolve().parent.parent / "scripts"
if str(SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPTS_DIR))


def load_agent_module(filename: str):
    """Import one of the numbered scripts/ files, e.g. "2. agent2-validator.py".

    Their filenames contain spaces and a leading number, so they can't be
    imported with a normal `import` statement. This mirrors the loader that
    "0. orchestrator.py" already uses at runtime (importlib.util +
    spec_from_file_location) instead of inventing a second way to do it.
    """
    path = SCRIPTS_DIR / filename
    module_name = filename.replace(" ", "_").replace(".", "_").replace("-", "_")
    spec = importlib.util.spec_from_file_location(module_name, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module
