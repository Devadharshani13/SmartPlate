import re
from typing import Tuple

def validate_phone(phone: str) -> Tuple[bool, str]:
    """
    Validate phone number
    - Must be exactly 10 digits
    - Only numeric characters allowed
    """
    if not phone:
        return False, "Phone number is required"
    
    # Remove any spaces or special characters
    phone_clean = re.sub(r'[^0-9]', '', phone)
    
    if len(phone_clean) != 10:
        return False, "Phone number must be exactly 10 digits"
    
    if not phone_clean.isdigit():
        return False, "Phone number must contain only digits"
    
    return True, phone_clean


def validate_email(email: str) -> Tuple[bool, str]:
    """
    Validate email format
    Uses regex pattern for email validation
    """
    if not email:
        return False, "Email is required"
    
    # RFC 5322 simplified email regex
    email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    
    if not re.match(email_pattern, email):
        return False, "Invalid email format"
    
    return True, email.lower()


def validate_location(location: str) -> Tuple[bool, str]:
    """
    Validate location field
    - Cannot be empty
    - Must have reasonable length
    """
    if not location or not location.strip():
        return False, "Location is required"
    
    location_clean = location.strip()
    
    if len(location_clean) < 3:
        return False, "Location must be at least 3 characters"
    
    if len(location_clean) > 200:
        return False, "Location is too long (max 200 characters)"
    
    return True, location_clean


def validate_latitude(lat: float) -> Tuple[bool, str]:
    """Validate latitude (-90 to 90)"""
    if lat is None:
        return False, "Latitude is required"
    
    try:
        lat_float = float(lat)
        if -90 <= lat_float <= 90:
            return True, ""
        return False, "Latitude must be between -90 and 90"
    except (ValueError, TypeError):
        return False, "Invalid latitude value"


def validate_longitude(lng: float) -> Tuple[bool, str]:
    """Validate longitude (-180 to 180)"""
    if lng is None:
        return False, "Longitude is required"
    
    try:
        lng_float = float(lng)
        if -180 <= lng_float <= 180:
            return True, ""
        return False, "Longitude must be between -180 and 180"
    except (ValueError, TypeError):
        return False, "Invalid longitude value"


def validate_required_field(value: str, field_name: str) -> Tuple[bool, str]:
    """Generic validation for required fields"""
    if not value or (isinstance(value, str) and not value.strip()):
        return False, f"{field_name} is required"
    return True, ""


def validate_file_upload(file_content: bytes, allowed_extensions: list, max_size_mb: int = 5) -> Tuple[bool, str]:
    """
    Validate file uploads
    - Check file size
    - Check file type by extension
    """
    if not file_content:
        return False, "No file provided"
    
    # Check file size (in MB)
    file_size_mb = len(file_content) / (1024 * 1024)
    if file_size_mb > max_size_mb:
        return False, f"File size exceeds {max_size_mb}MB limit"
    
    return True, ""


def validate_password_strength(password: str) -> Tuple[bool, str]:
    """
    Validate password strength
    - Minimum 6 characters
    - At least one letter and one number (optional but recommended)
    """
    if not password:
        return False, "Password is required"
    
    if len(password) < 6:
        return False, "Password must be at least 6 characters long"
    
    # Optional: Check for letter and number
    # has_letter = any(c.isalpha() for c in password)
    # has_number = any(c.isdigit() for c in password)
    # if not (has_letter and has_number):
    #     return False, "Password must contain both letters and numbers"
    
    return True, ""
