import React, { useRef, useEffect } from 'react';
import { MapPin } from 'lucide-react';

const GOOGLE_MAPS_API_KEY = 'AIzaSyC-FzxiIHtKD_7uv8P3j5EFvUXl5QxsJO0';

export default function LocationAutocomplete({
  value,
  onChange,
  onPlaceSelect,
  placeholder = "Start typing address...",
  error = null,
  className = "",
  required = false,
  dataTestId = "location-input"
}) {
  const inputRef = useRef(null);
  const autocompleteRef = useRef(null);

  useEffect(() => {
    // Load Google Maps script
    if (!window.google) {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places`;
      script.async = true;
      script.defer = true;
      script.onload = initAutocomplete;
      document.head.appendChild(script);
    } else {
      initAutocomplete();
    }

    return () => {
      if (autocompleteRef.current) {
        window.google?.maps?.event?.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, []);

  const initAutocomplete = () => {
    if (!inputRef.current || !window.google) return;

    autocompleteRef.current = new window.google.maps.places.Autocomplete(inputRef.current, {
      types: ['geocode', 'establishment'],
      fields: ['formatted_address', 'geometry', 'name', 'address_components']
    });

    autocompleteRef.current.addListener('place_changed', handlePlaceSelect);
  };

  const handlePlaceSelect = () => {
    const place = autocompleteRef.current.getPlace();

    if (!place.geometry) {
      console.log('No geometry found for this place');
      return;
    }

    const location = {
      address: place.formatted_address || place.name,
      latitude: place.geometry.location.lat(),
      longitude: place.geometry.location.lng(),
      placeId: place.place_id
    };

    // Extract city, state, country
    let city = '';
    let state = '';
    let country = '';

    if (place.address_components) {
      place.address_components.forEach(component => {
        const types = component.types;
        if (types.includes('locality')) {
          city = component.long_name;
        }
        if (types.includes('administrative_area_level_1')) {
          state = component.short_name;
        }
        if (types.includes('country')) {
          country = component.long_name;
        }
      });
    }

    location.city = city;
    location.state = state;
    location.country = country;

    if (onPlaceSelect) {
      onPlaceSelect(location);
    }

    if (onChange) {
      onChange({ target: { value: location.address, name: 'location' } });
    }
  };

  const handleInputChange = (e) => {
    if (onChange) {
      onChange(e);
    }
  };

  return (
    <div className="relative">
      <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#9CA3AF] z-10" />
      <input
        ref={inputRef}
        data-testid={dataTestId}
        type="text"
        value={value}
        onChange={handleInputChange}
        placeholder={placeholder}
        className={`w-full pl-10 pr-4 py-3 bg-white border ${
          error ? 'border-red-500' : 'border-stone-200'
        } rounded-lg focus:outline-none focus:border-[#1A4D2E] focus:ring-2 focus:ring-[#1A4D2E] focus:ring-opacity-20 transition-all ${className}`}
        required={required}
      />
      {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
    </div>
  );
}
