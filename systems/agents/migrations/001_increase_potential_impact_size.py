"""
Migration: Increase potential_impact column size from varchar(20) to varchar(100)
Run this once to fix the "value too long" error for opportunities table.
"""

import os
import sys
from sqlalchemy import create_engine, text

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config import settings


def migrate():
    """Run the migration"""
    engine = create_engine(settings.database.url)

    with engine.connect() as conn:
        # Alter the column size
        conn.execute(text("""
            ALTER TABLE opportunities
            ALTER COLUMN potential_impact TYPE VARCHAR(100)
        """))
        conn.commit()
        print("✓ Migration complete: potential_impact column increased to VARCHAR(100)")


def rollback():
    """Rollback the migration (not recommended if data > 20 chars exists)"""
    engine = create_engine(settings.database.url)

    with engine.connect() as conn:
        conn.execute(text("""
            ALTER TABLE opportunities
            ALTER COLUMN potential_impact TYPE VARCHAR(20)
        """))
        conn.commit()
        print("✓ Rollback complete: potential_impact column reverted to VARCHAR(20)")


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "rollback":
        rollback()
    else:
        migrate()
