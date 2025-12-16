"""
Google Places API Data Collector
Collects business data from Google Places API (New)
"""

import asyncio
import aiohttp
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
from config import settings


@dataclass
class PlaceDetails:
    """Structured place details from Google Places API"""
    place_id: str
    name: str
    address: str
    phone: Optional[str]
    website: Optional[str]
    rating: Optional[float]
    review_count: Optional[int]
    price_level: Optional[int]
    business_status: Optional[str]
    hours: Optional[Dict[str, Any]]
    types: List[str]
    latitude: Optional[float]
    longitude: Optional[float]
    reviews: List[Dict[str, Any]]
    photos: List[str]


class GooglePlacesCollector:
    """Collector for Google Places API data"""

    BASE_URL = "https://places.googleapis.com/v1/places"
    SEARCH_URL = "https://places.googleapis.com/v1/places:searchText"

    def __init__(self):
        self.api_key = settings.google.places_api_key
        if not self.api_key:
            raise ValueError("Google Places API key not configured")

    def _get_headers(self, field_mask: str) -> Dict[str, str]:
        """Get headers for API request"""
        return {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": self.api_key,
            "X-Goog-FieldMask": field_mask
        }

    async def search_business(
        self,
        business_name: str,
        location: str = "Coral Gables, FL"
    ) -> Optional[Dict[str, Any]]:
        """
        Search for a business by name and location
        Returns the top matching result
        """
        field_mask = ",".join([
            "places.id",
            "places.displayName",
            "places.formattedAddress",
            "places.nationalPhoneNumber",
            "places.websiteUri",
            "places.rating",
            "places.userRatingCount",
            "places.priceLevel",
            "places.businessStatus",
            "places.regularOpeningHours",
            "places.types",
            "places.location",
            "places.reviews",
            "places.photos"
        ])

        payload = {
            "textQuery": f"{business_name} {location}",
            "maxResultCount": 1
        }

        async with aiohttp.ClientSession() as session:
            async with session.post(
                self.SEARCH_URL,
                headers=self._get_headers(field_mask),
                json=payload
            ) as response:
                if response.status != 200:
                    error_text = await response.text()
                    print(f"API Error ({response.status}): {error_text}")
                    return None

                data = await response.json()
                places = data.get("places", [])

                if not places:
                    return None

                return self._parse_place(places[0])

    async def search_businesses_in_area(
        self,
        query: str,
        location: str = "Coral Gables, FL",
        max_results: int = 20
    ) -> List[Dict[str, Any]]:
        """
        Search for multiple businesses matching a query in an area
        """
        field_mask = ",".join([
            "places.id",
            "places.displayName",
            "places.formattedAddress",
            "places.nationalPhoneNumber",
            "places.rating",
            "places.userRatingCount",
            "places.priceLevel",
            "places.types",
            "places.location"
        ])

        payload = {
            "textQuery": f"{query} in {location}",
            "maxResultCount": min(max_results, 20)  # API limit
        }

        async with aiohttp.ClientSession() as session:
            async with session.post(
                self.SEARCH_URL,
                headers=self._get_headers(field_mask),
                json=payload
            ) as response:
                if response.status != 200:
                    error_text = await response.text()
                    print(f"API Error ({response.status}): {error_text}")
                    return []

                data = await response.json()
                places = data.get("places", [])

                return [self._parse_place(p) for p in places]

    async def get_place_details(self, place_id: str) -> Optional[Dict[str, Any]]:
        """
        Get detailed information for a specific place by ID
        """
        field_mask = ",".join([
            "id",
            "displayName",
            "formattedAddress",
            "nationalPhoneNumber",
            "internationalPhoneNumber",
            "websiteUri",
            "rating",
            "userRatingCount",
            "priceLevel",
            "businessStatus",
            "regularOpeningHours",
            "types",
            "location",
            "reviews",
            "photos",
            "editorialSummary",
            "paymentOptions",
            "parkingOptions",
            "accessibilityOptions"
        ])

        url = f"{self.BASE_URL}/{place_id}"

        async with aiohttp.ClientSession() as session:
            async with session.get(
                url,
                headers=self._get_headers(field_mask)
            ) as response:
                if response.status != 200:
                    error_text = await response.text()
                    print(f"API Error ({response.status}): {error_text}")
                    return None

                data = await response.json()
                return self._parse_place(data)

    def _parse_place(self, place: Dict[str, Any]) -> Dict[str, Any]:
        """Parse raw place data into structured format"""
        location = place.get("location", {})
        display_name = place.get("displayName", {})
        opening_hours = place.get("regularOpeningHours", {})

        # Parse reviews
        reviews = []
        for review in place.get("reviews", [])[:5]:  # Limit to 5 reviews
            author = review.get("authorAttribution", {})
            reviews.append({
                "author": author.get("displayName", "Anonymous"),
                "rating": review.get("rating"),
                "text": review.get("text", {}).get("text", ""),
                "time": review.get("publishTime"),
                "language": review.get("text", {}).get("languageCode", "en")
            })

        # Parse photos (just get photo references)
        photos = []
        for photo in place.get("photos", [])[:5]:  # Limit to 5 photos
            if "name" in photo:
                photos.append(photo["name"])

        # Parse hours
        hours = {}
        for period in opening_hours.get("weekdayDescriptions", []):
            hours[period.split(":")[0].strip() if ":" in period else period] = period

        return {
            "place_id": place.get("id", ""),
            "name": display_name.get("text", ""),
            "address": place.get("formattedAddress", ""),
            "phone": place.get("nationalPhoneNumber"),
            "international_phone": place.get("internationalPhoneNumber"),
            "website": place.get("websiteUri"),
            "rating": place.get("rating"),
            "review_count": place.get("userRatingCount"),
            "price_level": place.get("priceLevel"),
            "business_status": place.get("businessStatus"),
            "hours": hours,
            "hours_periods": opening_hours.get("periods", []),
            "types": place.get("types", []),
            "latitude": location.get("latitude"),
            "longitude": location.get("longitude"),
            "reviews": reviews,
            "photos": photos,
            "editorial_summary": place.get("editorialSummary", {}).get("text"),
            "source": "google_places",
            "confidence": 0.85  # High confidence for Google data
        }


async def test_collector():
    """Test the Google Places collector"""
    print("Testing Google Places Collector\n")
    print("=" * 50)

    collector = GooglePlacesCollector()

    # Test 1: Search for a specific business
    print("\n1. Searching for 'Books & Books' in Coral Gables...")
    result = await collector.search_business("Books & Books", "Coral Gables, FL")

    if result:
        print(f"   ✓ Found: {result['name']}")
        print(f"   Address: {result['address']}")
        print(f"   Rating: {result['rating']} ({result['review_count']} reviews)")
        print(f"   Phone: {result['phone']}")
        print(f"   Website: {result['website']}")
        if result['reviews']:
            print(f"   Sample review: \"{result['reviews'][0]['text'][:100]}...\"")
    else:
        print("   ✗ Not found")

    # Test 2: Search for restaurants in area
    print("\n2. Searching for 'restaurants' in Coral Gables...")
    restaurants = await collector.search_businesses_in_area("restaurants", "Coral Gables, FL", 5)

    print(f"   ✓ Found {len(restaurants)} restaurants:")
    for r in restaurants[:5]:
        print(f"   - {r['name']} ({r['rating']}★)")

    print("\n" + "=" * 50)
    print("Test complete!")


if __name__ == "__main__":
    asyncio.run(test_collector())
