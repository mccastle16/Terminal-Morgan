"""
Yelp Fusion API Data Collector
Collects business data from Yelp Fusion API
"""

import asyncio
import aiohttp
from typing import Dict, List, Optional, Any
from config import settings


class YelpCollector:
    """Collector for Yelp Fusion API data"""

    BASE_URL = "https://api.yelp.com/v3"

    def __init__(self):
        self.api_key = settings.yelp.api_key
        if not self.api_key:
            raise ValueError("Yelp API key not configured")

    def _get_headers(self) -> Dict[str, str]:
        """Get headers for API request"""
        return {
            "Authorization": f"Bearer {self.api_key}",
            "Accept": "application/json"
        }

    async def search_business(
        self,
        business_name: str,
        location: str = "Coral Gables, FL"
    ) -> Optional[Dict[str, Any]]:
        """
        Search for a business by name and location
        Returns the top matching result with details
        """
        # First, search for the business
        search_url = f"{self.BASE_URL}/businesses/search"
        params = {
            "term": business_name,
            "location": location,
            "limit": 1
        }

        async with aiohttp.ClientSession() as session:
            async with session.get(
                search_url,
                headers=self._get_headers(),
                params=params
            ) as response:
                if response.status != 200:
                    error_text = await response.text()
                    print(f"Yelp API Error ({response.status}): {error_text}")
                    return None

                data = await response.json()
                businesses = data.get("businesses", [])

                if not businesses:
                    return None

                business = businesses[0]
                business_id = business.get("id")

                # Get detailed info including reviews
                details = await self._get_business_details(session, business_id)
                reviews = await self._get_business_reviews(session, business_id)

                return self._merge_data(business, details, reviews)

    async def _get_business_details(
        self,
        session: aiohttp.ClientSession,
        business_id: str
    ) -> Dict[str, Any]:
        """Get detailed business information"""
        url = f"{self.BASE_URL}/businesses/{business_id}"

        async with session.get(url, headers=self._get_headers()) as response:
            if response.status != 200:
                return {}
            return await response.json()

    async def _get_business_reviews(
        self,
        session: aiohttp.ClientSession,
        business_id: str,
        limit: int = 3
    ) -> List[Dict[str, Any]]:
        """Get business reviews"""
        url = f"{self.BASE_URL}/businesses/{business_id}/reviews"
        params = {"limit": limit}

        async with session.get(
            url,
            headers=self._get_headers(),
            params=params
        ) as response:
            if response.status != 200:
                return []
            data = await response.json()
            return data.get("reviews", [])

    async def search_businesses_in_area(
        self,
        query: str,
        location: str = "Coral Gables, FL",
        max_results: int = 20
    ) -> List[Dict[str, Any]]:
        """Search for multiple businesses in an area"""
        search_url = f"{self.BASE_URL}/businesses/search"
        params = {
            "term": query,
            "location": location,
            "limit": min(max_results, 50)  # Yelp limit
        }

        async with aiohttp.ClientSession() as session:
            async with session.get(
                search_url,
                headers=self._get_headers(),
                params=params
            ) as response:
                if response.status != 200:
                    return []

                data = await response.json()
                businesses = data.get("businesses", [])

                return [self._parse_search_result(b) for b in businesses]

    def _parse_search_result(self, business: Dict[str, Any]) -> Dict[str, Any]:
        """Parse search result into standard format"""
        location = business.get("location", {})
        coordinates = business.get("coordinates", {})

        return {
            "yelp_id": business.get("id"),
            "name": business.get("name"),
            "address": ", ".join(location.get("display_address", [])),
            "phone": business.get("phone"),
            "rating": business.get("rating"),
            "review_count": business.get("review_count"),
            "price": business.get("price"),
            "categories": [c.get("title") for c in business.get("categories", [])],
            "latitude": coordinates.get("latitude"),
            "longitude": coordinates.get("longitude"),
            "source": "yelp",
            "confidence": 0.80
        }

    def _merge_data(
        self,
        search_result: Dict[str, Any],
        details: Dict[str, Any],
        reviews: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Merge search result with details and reviews"""
        location = details.get("location", search_result.get("location", {}))
        coordinates = details.get("coordinates", search_result.get("coordinates", {}))

        # Parse hours
        hours = {}
        for day_hours in details.get("hours", [{}])[0].get("open", []):
            day_num = day_hours.get("day", 0)
            days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
            day_name = days[day_num] if day_num < len(days) else str(day_num)
            hours[day_name] = f"{day_hours.get('start', '')} - {day_hours.get('end', '')}"

        # Parse reviews
        parsed_reviews = []
        for review in reviews:
            user = review.get("user", {})
            parsed_reviews.append({
                "author": user.get("name", "Anonymous"),
                "rating": review.get("rating"),
                "text": review.get("text", ""),
                "time": review.get("time_created")
            })

        return {
            "yelp_id": details.get("id", search_result.get("id")),
            "name": details.get("name", search_result.get("name")),
            "address": ", ".join(location.get("display_address", [])),
            "phone": details.get("phone", search_result.get("phone")),
            "website": details.get("url"),
            "rating": details.get("rating", search_result.get("rating")),
            "review_count": details.get("review_count", search_result.get("review_count")),
            "price": details.get("price", search_result.get("price")),
            "categories": [c.get("title") for c in details.get("categories", [])],
            "transactions": details.get("transactions", []),
            "hours": hours,
            "is_open_now": details.get("hours", [{}])[0].get("is_open_now"),
            "latitude": coordinates.get("latitude"),
            "longitude": coordinates.get("longitude"),
            "photos": details.get("photos", [])[:5],
            "reviews": parsed_reviews,
            "source": "yelp",
            "confidence": 0.80
        }


async def test_collector():
    """Test the Yelp collector"""
    print("Testing Yelp Collector\n")
    print("=" * 50)

    try:
        collector = YelpCollector()
    except ValueError as e:
        print(f"Cannot test: {e}")
        print("Add YELP_API_KEY to your .env file")
        return

    # Test search
    print("\n1. Searching for 'Books & Books' in Coral Gables...")
    result = await collector.search_business("Books & Books", "Coral Gables, FL")

    if result:
        print(f"   ✓ Found: {result['name']}")
        print(f"   Rating: {result['rating']} ({result['review_count']} reviews)")
        print(f"   Price: {result.get('price', 'N/A')}")
        if result.get('reviews'):
            print(f"   Sample review: \"{result['reviews'][0]['text'][:100]}...\"")
    else:
        print("   ✗ Not found")

    print("\n" + "=" * 50)


if __name__ == "__main__":
    asyncio.run(test_collector())
