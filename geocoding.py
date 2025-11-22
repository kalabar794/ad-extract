"""
Geocoding helper for locations
"""

# Known coordinates for locations in the dataset
LOCATION_COORDS = {
    'New York': [40.7128, -74.0060],
    'Manhattan': [40.7831, -73.9712],
    'Florida': [27.9944, -81.7603],
    'Palm Beach': [26.7056, -80.0364],
    'Paris': [48.8566, 2.3522],
    'Virgin Islands': [18.3358, -64.8963],
    'Little St. James': [18.3001, -64.8251],
    'New Mexico': [34.5199, -105.8701],
    'New Jersey': [40.0583, -74.4057],
    'London': [51.5074, -0.1278],
    'Los Angeles': [34.0522, -118.2437],
    'Washington': [38.9072, -77.0369],
    'Miami': [25.7617, -80.1918],
    'California': [36.7783, -119.4179],
    'Texas': [31.9686, -99.9018],
    'Ohio': [40.4173, -82.9071],
}

def get_coordinates(location_name):
    """Get coordinates for a location"""
    # Try exact match first
    if location_name in LOCATION_COORDS:
        return LOCATION_COORDS[location_name]

    # Try fuzzy match
    for loc, coords in LOCATION_COORDS.items():
        if loc.lower() in location_name.lower() or location_name.lower() in loc.lower():
            return coords

    return None
