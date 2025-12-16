"""
Configuration management for Coral Gables BI Platform
Loads settings from environment variables
"""

import os
from pathlib import Path
from dataclasses import dataclass
from typing import Optional

# Load .env file if it exists
def load_dotenv():
    """Load environment variables from .env file"""
    env_path = Path(__file__).parent.parent.parent / ".env"
    if env_path.exists():
        with open(env_path) as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    key, value = line.split("=", 1)
                    os.environ.setdefault(key.strip(), value.strip())

# Load on import
load_dotenv()


@dataclass
class GoogleConfig:
    """Google API configuration"""
    places_api_key: Optional[str] = None

    def __post_init__(self):
        self.places_api_key = os.getenv("GOOGLE_PLACES_API_KEY")

    @property
    def is_configured(self) -> bool:
        return bool(self.places_api_key and not self.places_api_key.startswith("your_"))


@dataclass
class YelpConfig:
    """Yelp API configuration"""
    api_key: Optional[str] = None

    def __post_init__(self):
        self.api_key = os.getenv("YELP_API_KEY")

    @property
    def is_configured(self) -> bool:
        return bool(self.api_key and not self.api_key.startswith("your_"))


@dataclass
class DatabaseConfig:
    """Database configuration"""
    url: str = "postgresql://postgres:postgres@localhost:5432/coral_gables_bi"

    def __post_init__(self):
        self.url = os.getenv("DATABASE_URL", self.url)


@dataclass
class AnthropicConfig:
    """Anthropic API configuration"""
    api_key: Optional[str] = None

    def __post_init__(self):
        self.api_key = os.getenv("ANTHROPIC_API_KEY")

    @property
    def is_configured(self) -> bool:
        return bool(self.api_key and not self.api_key.startswith("your_"))


@dataclass
class AppConfig:
    """Application configuration"""
    env: str = "development"
    host: str = "0.0.0.0"
    port: int = 8000

    def __post_init__(self):
        self.env = os.getenv("APP_ENV", self.env)
        self.host = os.getenv("API_HOST", self.host)
        self.port = int(os.getenv("API_PORT", self.port))

    @property
    def is_production(self) -> bool:
        return self.env == "production"


class Settings:
    """Main settings container"""

    def __init__(self):
        self.google = GoogleConfig()
        self.yelp = YelpConfig()
        self.database = DatabaseConfig()
        self.anthropic = AnthropicConfig()
        self.app = AppConfig()

    def print_status(self):
        """Print configuration status"""
        print("Configuration Status:")
        print(f"  Google Places API: {'✓ Configured' if self.google.is_configured else '✗ Not configured'}")
        print(f"  Yelp API: {'✓ Configured' if self.yelp.is_configured else '✗ Not configured'}")
        print(f"  Anthropic API: {'✓ Configured' if self.anthropic.is_configured else '✗ Not configured'}")
        print(f"  Database URL: {self.database.url[:30]}...")
        print(f"  Environment: {self.app.env}")


# Singleton instance
settings = Settings()


if __name__ == "__main__":
    settings.print_status()
