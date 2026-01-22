import math
from typing import Tuple, Optional

def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate the great-circle distance between two points on Earth
    using the Haversine formula.
    
    Args:
        lat1: Latitude of point 1 in decimal degrees
        lon1: Longitude of point 1 in decimal degrees
        lat2: Latitude of point 2 in decimal degrees
        lon2: Longitude of point 2 in decimal degrees
    
    Returns:
        Distance in kilometers
    """
    # Earth's radius in kilometers
    R = 6371.0
    
    # Convert latitude and longitude from degrees to radians
    lat1_rad = math.radians(lat1)
    lon1_rad = math.radians(lon1)
    lat2_rad = math.radians(lat2)
    lon2_rad = math.radians(lon2)
    
    # Difference in coordinates
    dlat = lat2_rad - lat1_rad
    dlon = lon2_rad - lon1_rad
    
    # Haversine formula
    a = (math.sin(dlat / 2)**2 + 
         math.cos(lat1_rad) * math.cos(lat2_rad) * 
         math.sin(dlon / 2)**2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    
    # Distance in kilometers
    distance = R * c
    
    return round(distance, 2)


def get_distance_display(distance_km: float) -> str:
    """
    Convert distance to human-readable format
    
    Args:
        distance_km: Distance in kilometers
    
    Returns:
        Formatted string (e.g., "2.5 km" or "850 m")
    """
    if distance_km < 1:
        meters = int(distance_km * 1000)
        return f"{meters} m"
    elif distance_km < 10:
        return f"{distance_km:.1f} km"
    else:
        return f"{int(distance_km)} km"


def calculate_distance_safe(lat1: Optional[float], lon1: Optional[float], 
                            lat2: Optional[float], lon2: Optional[float]) -> Optional[float]:
    """
    Safely calculate distance with None checks
    
    Returns:
        Distance in km, or None if coordinates are invalid
    """
    if None in [lat1, lon1, lat2, lon2]:
        return None
    
    try:
        return haversine_distance(lat1, lon1, lat2, lon2)
    except (ValueError, TypeError):
        return None


def sort_by_distance(items: list, target_lat: float, target_lon: float, 
                     lat_key: str = 'latitude', lon_key: str = 'longitude') -> list:
    """
    Sort a list of items by distance from a target location
    
    Args:
        items: List of dictionaries containing location data
        target_lat: Target latitude
        target_lon: Target longitude
        lat_key: Key name for latitude in items
        lon_key: Key name for longitude in items
    
    Returns:
        Sorted list (closest first)
    """
    def get_distance(item):
        item_lat = item.get(lat_key)
        item_lon = item.get(lon_key)
        
        if item_lat is None or item_lon is None:
            return float('inf')  # Put items without location at the end
        
        return haversine_distance(target_lat, target_lon, item_lat, item_lon)
    
    return sorted(items, key=get_distance)


def is_within_radius(lat1: float, lon1: float, lat2: float, lon2: float, 
                     radius_km: float) -> bool:
    """
    Check if two points are within a specified radius
    
    Args:
        lat1, lon1: First point coordinates
        lat2, lon2: Second point coordinates
        radius_km: Radius in kilometers
    
    Returns:
        True if distance <= radius_km, False otherwise
    """
    distance = haversine_distance(lat1, lon1, lat2, lon2)
    return distance <= radius_km


def find_nearest_item(items: list, target_lat: float, target_lon: float,
                     lat_key: str = 'latitude', lon_key: str = 'longitude') -> Optional[dict]:
    """
    Find the nearest item from a list
    
    Returns:
        The nearest item, or None if list is empty
    """
    if not items:
        return None
    
    sorted_items = sort_by_distance(items, target_lat, target_lon, lat_key, lon_key)
    return sorted_items[0] if sorted_items else None


# Example usage and test
if __name__ == "__main__":
    # Test Haversine formula
    # Delhi to Mumbai
    delhi_lat, delhi_lon = 28.6139, 77.2090
    mumbai_lat, mumbai_lon = 19.0760, 72.8777
    
    distance = haversine_distance(delhi_lat, delhi_lon, mumbai_lat, mumbai_lon)
    print(f"Delhi to Mumbai: {distance} km")  # Should be ~1150 km
    print(f"Display: {get_distance_display(distance)}")
    
    # Test sorting
    locations = [
        {"name": "A", "latitude": 28.6, "longitude": 77.2},
        {"name": "B", "latitude": 28.7, "longitude": 77.3},
        {"name": "C", "latitude": 28.5, "longitude": 77.1}
    ]
    
    sorted_locs = sort_by_distance(locations, 28.6139, 77.2090)
    print("\nSorted locations:")
    for loc in sorted_locs:
        dist = haversine_distance(28.6139, 77.2090, loc["latitude"], loc["longitude"])
        print(f"  {loc['name']}: {dist} km")
