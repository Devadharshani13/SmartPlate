from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, UploadFile, File, Form
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import socketio
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr, validator
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import jwt
from passlib.context import CryptContext
import math
import aiofiles
import base64
import asyncio
from emergentintegrations.auth import create_google_login_url, exchange_code_for_session

# Import our utility modules
from email_service import send_welcome_email, send_verification_approved_email
from validation import validate_phone, validate_email, validate_location, validate_latitude, validate_longitude, validate_password_strength
from geo_utils import haversine_distance, sort_by_distance, get_distance_display

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
# Add SSL options for MongoDB Atlas compatibility
client = AsyncIOMotorClient(
    mongo_url,
    tls=True,
    tlsAllowInvalidCertificates=True,
    serverSelectionTimeoutMS=5000,
    connectTimeoutMS=10000,
    retryWrites=True
)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'smartplate-secret-key-change-in-production')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

sio = socketio.AsyncServer(async_mode='asgi', cors_allowed_origins='*')
socket_app = socketio.ASGIApp(sio, app)

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid authentication credentials")
        user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
        if user is None:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.JWTError:
        raise HTTPException(status_code=401, detail="Could not validate credentials")

async def log_audit(action: str, user_id: str, details: dict):
    audit_log = {
        "log_id": str(uuid.uuid4()),
        "action": action,
        "user_id": user_id,
        "details": details,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    await db.audit_logs.insert_one(audit_log)

# Pydantic Models
class UserRegister(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: str
    location: str
    phone: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    transport_mode: Optional[str] = None
    organization: Optional[str] = None
    donor_type: Optional[str] = None
    availability_slots: Optional[List[str]] = None
    
    @validator('phone')
    def validate_phone_number(cls, v):
        is_valid, result = validate_phone(v)
        if not is_valid:
            raise ValueError(result)
        return result
    
    @validator('password')
    def validate_password_field(cls, v):
        is_valid, error = validate_password_strength(v)
        if not is_valid:
            raise ValueError(error)
        return v
    
    @validator('location')
    def validate_location_field(cls, v):
        is_valid, result = validate_location(v)
        if not is_valid:
            raise ValueError(result)
        return result
    
    @validator('latitude')
    def validate_lat(cls, v):
        if v is not None:
            is_valid, error = validate_latitude(v)
            if not is_valid:
                raise ValueError(error)
        return v
    
    @validator('longitude')
    def validate_lng(cls, v):
        if v is not None:
            is_valid, error = validate_longitude(v)
            if not is_valid:
                raise ValueError(error)
        return v

class GoogleCallbackData(BaseModel):
    code: str
    role: str
    location: str
    phone: str
    organization: Optional[str] = None
    donor_type: Optional[str] = None
    transport_mode: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    user_id: str
    email: str
    name: str
    role: str
    location: str
    phone: Optional[str] = None
    transport_mode: Optional[str] = None
    organization: Optional[str] = None
    donor_type: Optional[str] = None
    verification_status: Optional[str] = None
    created_at: str

class FoodRequestCreate(BaseModel):
    food_type: str
    food_category: str
    quantity: int
    quantity_unit: str
    required_date: str
    required_time: str
    pickup_location: str
    special_instructions: Optional[str] = None
    people_count: int

class FoodRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")
    request_id: str
    ngo_id: str
    ngo_name: str
    ngo_organization: str
    food_type: str
    food_category: str
    quantity: int
    quantity_unit: str
    required_date: str
    required_time: str
    pickup_location: str
    special_instructions: Optional[str] = None
    people_count: int
    urgency_score: float
    status: str
    created_at: str
    donor_id: Optional[str] = None
    donor_name: Optional[str] = None
    volunteer_id: Optional[str] = None
    volunteer_name: Optional[str] = None
    co_volunteer_id: Optional[str] = None
    co_volunteer_name: Optional[str] = None
    delivery_photo: Optional[str] = None

class DonationAccept(BaseModel):
    request_id: str
    availability_time: str
    food_condition: str
    can_deliver_self: bool = False

class PhotoProof(BaseModel):
    image_base64: str
    latitude: float
    longitude: float
    timestamp: Optional[str] = None

class DeliveryTaskAccept(BaseModel):
    request_id: str

class DeliveryStatusUpdate(BaseModel):
    request_id: str
    status: str
    extra_volunteer_required: Optional[bool] = False
    extra_volunteer_reason: Optional[str] = None
    delivery_photo: Optional[str] = None

class ConfirmReceipt(BaseModel):
    request_id: str
    rating: Optional[int] = None
    feedback: Optional[str] = None

class VerificationAction(BaseModel):
    user_id: str
    action: str
    notes: Optional[str] = None

# Utility Functions
def calculate_urgency_score(quantity: int, people_count: int, required_datetime_str: str, ngo_history: dict = None) -> float:
    try:
        required_dt = datetime.fromisoformat(required_datetime_str)
        time_diff = (required_dt - datetime.now(timezone.utc)).total_seconds() / 3600
        
        time_score = max(0, min(10, 10 - (time_diff / 24) * 2))
        quantity_score = min(10, (people_count / 100) * 10)
        
        history_score = 5.0
        if ngo_history:
            reliability = ngo_history.get('reliability_score', 5.0)
            history_score = min(10, reliability)
        
        urgency = (time_score * 0.5 + quantity_score * 0.3 + history_score * 0.2)
        return round(urgency, 2)
    except:
        return 5.0

def calculate_distance(loc1: str, loc2: str) -> float:
    return abs(hash(loc1) - hash(loc2)) % 50

def get_volunteer_capacity_score(transport_mode: str, distance: float, quantity: int) -> float:
    capacity_map = {"van": 10, "car": 7, "two_wheeler": 5, "bicycle": 3, "on_foot": 2}
    capacity = capacity_map.get(transport_mode, 5)
    distance_penalty = min(distance / 10, 3)
    quantity_penalty = max(0, (quantity - 50) / 20)
    return capacity - distance_penalty - quantity_penalty

def should_auto_trigger_extra_volunteer(quantity: int, distance: float, transport_mode: str) -> tuple:
    capacity_score = get_volunteer_capacity_score(transport_mode, distance, quantity)
    if capacity_score < 2:
        if quantity > 100:
            return True, "heavy_load"
        elif distance > 30:
            return True, "long_distance"
        else:
            return True, "capacity_constraint"
    return False, None

# Socket.IO Events
@sio.event
async def connect(sid, environ):
    print(f"Client connected: {sid}")

@sio.event
async def disconnect(sid):
    print(f"Client disconnected: {sid}")

# Google OAuth Endpoints
@api_router.get("/auth/google/login")
async def google_login():
    """Generate Google OAuth login URL"""
    try:
        redirect_uri = f"{os.environ.get('FRONTEND_URL', 'http://localhost:3000')}/auth/callback"
        login_url = create_google_login_url(
            redirect_uri=redirect_uri,
            scopes=["email", "profile"]
        )
        return {"login_url": login_url}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create login URL: {str(e)}")

@api_router.post("/auth/google/callback")
async def google_callback(callback_data: GoogleCallbackData):
    """Handle Google OAuth callback"""
    try:
        # Exchange code for session
        session_data = exchange_code_for_session(
            code=callback_data.code,
            redirect_uri=f"{os.environ.get('FRONTEND_URL', 'http://localhost:3000')}/auth/callback"
        )
        
        email = session_data.get('email')
        name = session_data.get('name', email.split('@')[0])
        
        if not email:
            raise HTTPException(status_code=400, detail="Failed to retrieve email from Google")
        
        # Check if user exists
        existing_user = await db.users.find_one({"email": email}, {"_id": 0})
        
        if existing_user:
            # User exists, log them in
            token = create_access_token({"sub": existing_user["user_id"], "role": existing_user["role"]})
            existing_user.pop("password", None)
            return {"token": token, "user": existing_user}
        
        # Create new user
        user_id = str(uuid.uuid4())
        user_doc = {
            "user_id": user_id,
            "email": email,
            "name": name,
            "role": callback_data.role,
            "location": callback_data.location,
            "phone": callback_data.phone,
            "auth_provider": "google",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        # Add role-specific fields
        if callback_data.role == "volunteer" and callback_data.transport_mode:
            user_doc["transport_mode"] = callback_data.transport_mode
            user_doc["reliability_score"] = 5.0
            user_doc["completed_tasks"] = 0
            user_doc["availability_slots"] = []
        
        if callback_data.role == "ngo":
            user_doc["verification_status"] = "pending"
            user_doc["organization"] = callback_data.organization or ""
            user_doc["verification_documents"] = []
            user_doc["reliability_score"] = 5.0
            user_doc["total_requests"] = 0
            user_doc["completed_requests"] = 0
        
        if callback_data.role == "donor" and callback_data.donor_type:
            user_doc["donor_type"] = callback_data.donor_type
            user_doc["total_donations"] = 0
        
        await db.users.insert_one(user_doc)
        await log_audit("USER_REGISTERED_GOOGLE", user_id, {"role": callback_data.role, "email": email})
        
        # Send welcome email
        await send_welcome_email(email, name, callback_data.role)
        
        token = create_access_token({"sub": user_id, "role": callback_data.role})
        user_response = {k: v for k, v in user_doc.items() if k not in ["password", "_id"]}
        
        return {"token": token, "user": user_response}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Google authentication failed: {str(e)}")

# Authentication Endpoints
@api_router.post("/auth/register")
async def register(user_data: UserRegister):
    existing = await db.users.find_one({"email": user_data.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = str(uuid.uuid4())
    hashed_pwd = hash_password(user_data.password)
    
    user_doc = {
        "user_id": user_id,
        "email": user_data.email,
        "password": hashed_pwd,
        "name": user_data.name,
        "role": user_data.role,
        "location": user_data.location,
        "phone": user_data.phone,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    if user_data.role == "volunteer" and user_data.transport_mode:
        user_doc["transport_mode"] = user_data.transport_mode
        user_doc["reliability_score"] = 5.0
        user_doc["completed_tasks"] = 0
        user_doc["availability_slots"] = user_data.availability_slots or []
    
    if user_data.role == "ngo":
        user_doc["verification_status"] = "pending"
        user_doc["organization"] = user_data.organization or ""
        user_doc["verification_documents"] = []
        user_doc["reliability_score"] = 5.0
        user_doc["total_requests"] = 0
        user_doc["completed_requests"] = 0
    
    if user_data.role == "donor" and user_data.donor_type:
        user_doc["donor_type"] = user_data.donor_type
        user_doc["total_donations"] = 0
    
    await db.users.insert_one(user_doc)
    
    # Send welcome email
    await send_welcome_email(user_data.email, user_data.name, user_data.role)
    
    await log_audit("USER_REGISTERED", user_id, {"role": user_data.role, "email": user_data.email})
    
    token = create_access_token({"sub": user_id, "role": user_data.role})
    user_response = {k: v for k, v in user_doc.items() if k not in ["password", "_id"]}
    return {"token": token, "user": user_response}

@api_router.post("/auth/login")
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user or not verify_password(credentials.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    token = create_access_token({"sub": user["user_id"], "role": user["role"]})
    user.pop("password")
    return {"token": token, "user": user}

@api_router.get("/auth/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    return current_user

# NGO Endpoints
@api_router.post("/ngo/upload-verification")
async def upload_verification_document(file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "ngo":
        raise HTTPException(status_code=403, detail="Only NGOs can upload verification documents")
    
    file_id = str(uuid.uuid4())
    file_ext = file.filename.split('.')[-1]
    file_path = f"/app/uploads/{file_id}.{file_ext}"
    
    os.makedirs("/app/uploads", exist_ok=True)
    
    content = await file.read()
    async with aiofiles.open(file_path, 'wb') as f:
        await f.write(content)
    
    await db.users.update_one(
        {"user_id": current_user["user_id"]},
        {"$push": {"verification_documents": {"file_id": file_id, "filename": file.filename, "uploaded_at": datetime.now(timezone.utc).isoformat()}}}
    )
    
    await log_audit("VERIFICATION_DOC_UPLOADED", current_user["user_id"], {"filename": file.filename})
    
    return {"message": "Document uploaded successfully", "file_id": file_id}

@api_router.post("/ngo/requests", response_model=FoodRequest)
async def create_food_request(request_data: FoodRequestCreate, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "ngo":
        raise HTTPException(status_code=403, detail="Only NGOs can create food requests")
    
    if current_user.get("verification_status") != "verified":
        raise HTTPException(status_code=403, detail="Only verified NGOs can create food requests. Please submit verification documents and wait for admin approval.")
    
    ngo_history = {
        "reliability_score": current_user.get("reliability_score", 5.0),
        "total_requests": current_user.get("total_requests", 0),
        "completed_requests": current_user.get("completed_requests", 0)
    }
    
    required_datetime = f"{request_data.required_date}T{request_data.required_time}"
    urgency_score = calculate_urgency_score(
        request_data.quantity,
        request_data.people_count,
        required_datetime,
        ngo_history
    )
    
    request_id = str(uuid.uuid4())
    request_doc = {
        "request_id": request_id,
        "ngo_id": current_user["user_id"],
        "ngo_name": current_user["name"],
        "ngo_organization": current_user.get("organization", ""),
        "food_type": request_data.food_type,
        "food_category": request_data.food_category,
        "quantity": request_data.quantity,
        "quantity_unit": request_data.quantity_unit,
        "required_date": request_data.required_date,
        "required_time": request_data.required_time,
        "pickup_location": request_data.pickup_location,
        "special_instructions": request_data.special_instructions,
        "people_count": request_data.people_count,
        "urgency_score": urgency_score,
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "donor_id": None,
        "donor_name": None,
        "volunteer_id": None,
        "volunteer_name": None,
        "co_volunteer_id": None,
        "co_volunteer_name": None,
        "delivery_photo": None
    }
    
    await db.food_requests.insert_one(request_doc)
    await db.users.update_one({"user_id": current_user["user_id"]}, {"$inc": {"total_requests": 1}})
    await log_audit("FOOD_REQUEST_CREATED", current_user["user_id"], {"request_id": request_id, "people_count": request_data.people_count})
    
    await sio.emit('new_request', request_doc)
    
    return FoodRequest(**request_doc)

@api_router.get("/ngo/requests", response_model=List[FoodRequest])
async def get_ngo_requests(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "ngo":
        raise HTTPException(status_code=403, detail="Access denied")
    
    requests = await db.food_requests.find({"ngo_id": current_user["user_id"]}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return requests

@api_router.post("/ngo/confirm-receipt")
async def confirm_receipt(data: ConfirmReceipt, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "ngo":
        raise HTTPException(status_code=403, detail="Access denied")
    
    request = await db.food_requests.find_one({"request_id": data.request_id, "ngo_id": current_user["user_id"]})
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")
    
    update_data = {
        "status": "completed",
        "completed_at": datetime.now(timezone.utc).isoformat()
    }
    
    if data.rating:
        update_data["ngo_rating"] = data.rating
        update_data["ngo_feedback"] = data.feedback
    
    await db.food_requests.update_one(
        {"request_id": data.request_id},
        {"$set": update_data}
    )
    
    await db.users.update_one({"user_id": current_user["user_id"]}, {"$inc": {"completed_requests": 1}})
    
    if request.get("volunteer_id"):
        await db.users.update_one(
            {"user_id": request["volunteer_id"]},
            {"$inc": {"completed_tasks": 1}}
        )
        
        volunteer = await db.users.find_one({"user_id": request["volunteer_id"]}, {"_id": 0})
        if volunteer:
            completed = volunteer.get("completed_tasks", 0) + 1
            new_reliability = min(10, 5 + (completed / 10))
            await db.users.update_one(
                {"user_id": request["volunteer_id"]},
                {"$set": {"reliability_score": new_reliability}}
            )
    
    ngo_user = await db.users.find_one({"user_id": current_user["user_id"]}, {"_id": 0})
    if ngo_user:
        total = ngo_user.get("total_requests", 1)
        completed = ngo_user.get("completed_requests", 0) + 1
        new_reliability = min(10, (completed / total) * 10)
        await db.users.update_one(
            {"user_id": current_user["user_id"]},
            {"$set": {"reliability_score": new_reliability}}
        )
    
    await log_audit("RECEIPT_CONFIRMED", current_user["user_id"], {"request_id": data.request_id})
    await sio.emit('request_completed', {"request_id": data.request_id})
    
    return {"message": "Receipt confirmed successfully"}

# Donor Endpoints
@api_router.get("/donor/requests", response_model=List[FoodRequest])
async def get_available_requests(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "donor":
        raise HTTPException(status_code=403, detail="Access denied")
    
    requests = await db.food_requests.find({"status": "pending"}, {"_id": 0}).sort("urgency_score", -1).to_list(1000)
    return requests

@api_router.post("/donor/accept")
async def accept_donation(data: DonationAccept, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "donor":
        raise HTTPException(status_code=403, detail="Access denied")
    
    request = await db.food_requests.find_one({"request_id": data.request_id})
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")
    if request["status"] != "pending":
        raise HTTPException(status_code=400, detail="Request already accepted")
    
    await db.food_requests.update_one(
        {"request_id": data.request_id},
        {"$set": {
            "status": "accepted_by_donor",
            "donor_id": current_user["user_id"],
            "donor_name": current_user["name"],
            "availability_time": data.availability_time,
            "food_condition": data.food_condition,
            "accepted_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    await db.users.update_one({"user_id": current_user["user_id"]}, {"$inc": {"total_donations": 1}})
    
    volunteers = await db.users.find({"role": "volunteer"}, {"_id": 0}).to_list(1000)
    if volunteers:
        best_volunteer = None
        best_score = -1
        
        for vol in volunteers:
            distance = calculate_distance(vol["location"], request["pickup_location"])
            capacity_score = get_volunteer_capacity_score(
                vol.get("transport_mode", "on_foot"),
                distance,
                request["quantity"]
            )
            reliability = vol.get("reliability_score", 5.0)
            
            score = capacity_score + (reliability / 2) - (distance / 10)
            if score > best_score:
                best_score = score
                best_volunteer = vol
        
        if best_volunteer:
            await db.food_requests.update_one(
                {"request_id": data.request_id},
                {"$set": {
                    "status": "assigned_to_volunteer",
                    "volunteer_id": best_volunteer["user_id"],
                    "volunteer_name": best_volunteer["name"],
                    "assigned_at": datetime.now(timezone.utc).isoformat()
                }}
            )
            
            distance = calculate_distance(best_volunteer["location"], request["pickup_location"])
            should_trigger, reason = should_auto_trigger_extra_volunteer(
                request["quantity"],
                distance,
                best_volunteer.get("transport_mode", "on_foot")
            )
            
            if should_trigger:
                other_volunteers = [v for v in volunteers if v["user_id"] != best_volunteer["user_id"]]
                if other_volunteers:
                    co_vol = max(other_volunteers, key=lambda v: v.get("reliability_score", 5.0))
                    await db.food_requests.update_one(
                        {"request_id": data.request_id},
                        {"$set": {
                            "co_volunteer_id": co_vol["user_id"],
                            "co_volunteer_name": co_vol["name"],
                            "extra_volunteer_reason": reason,
                            "auto_triggered": True
                        }}
                    )
    
    await log_audit("DONATION_ACCEPTED", current_user["user_id"], {"request_id": data.request_id})
    await sio.emit('request_status_changed', {"request_id": data.request_id, "status": "accepted_by_donor"})
    
    return {"message": "Donation accepted successfully"}

@api_router.get("/donor/my-donations", response_model=List[FoodRequest])
async def get_my_donations(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "donor":
        raise HTTPException(status_code=403, detail="Access denied")
    
    donations = await db.food_requests.find({"donor_id": current_user["user_id"]}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return donations

# Volunteer Endpoints
@api_router.get("/volunteer/tasks", response_model=List[FoodRequest])
async def get_volunteer_tasks(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "volunteer":
        raise HTTPException(status_code=403, detail="Access denied")
    
    available_tasks = await db.food_requests.find(
        {"$or": [
            {"status": "assigned_to_volunteer", "volunteer_id": current_user["user_id"]},
            {"co_volunteer_id": current_user["user_id"]}
        ]},
        {"_id": 0}
    ).to_list(1000)
    
    in_progress = await db.food_requests.find(
        {"$or": [
            {"volunteer_id": current_user["user_id"], "status": {"$in": ["picked_up", "in_transit"]}},
            {"co_volunteer_id": current_user["user_id"], "status": {"$in": ["picked_up", "in_transit"]}}
        ]},
        {"_id": 0}
    ).to_list(1000)
    
    return available_tasks + in_progress

@api_router.post("/volunteer/update-status")
async def update_delivery_status(data: DeliveryStatusUpdate, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "volunteer":
        raise HTTPException(status_code=403, detail="Access denied")
    
    request = await db.food_requests.find_one({"request_id": data.request_id})
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")
    
    update_data = {"status": data.status}
    
    if data.status == "picked_up":
        update_data["picked_up_at"] = datetime.now(timezone.utc).isoformat()
    elif data.status == "in_transit":
        update_data["in_transit_at"] = datetime.now(timezone.utc).isoformat()
    elif data.status == "delivered":
        update_data["delivered_at"] = datetime.now(timezone.utc).isoformat()
        if data.delivery_photo:
            update_data["delivery_photo"] = data.delivery_photo
    
    if data.extra_volunteer_required and not request.get("co_volunteer_id"):
        volunteers = await db.users.find(
            {"role": "volunteer", "user_id": {"$ne": current_user["user_id"]}},
            {"_id": 0}
        ).to_list(1000)
        
        if volunteers:
            best_co_volunteer = None
            best_score = -1
            
            for vol in volunteers:
                distance = calculate_distance(vol["location"], request["pickup_location"])
                reliability = vol.get("reliability_score", 5.0)
                score = reliability - (distance / 10)
                
                if score > best_score:
                    best_score = score
                    best_co_volunteer = vol
            
            if best_co_volunteer:
                update_data["co_volunteer_id"] = best_co_volunteer["user_id"]
                update_data["co_volunteer_name"] = best_co_volunteer["name"]
                update_data["extra_volunteer_reason"] = data.extra_volunteer_reason
    
    await db.food_requests.update_one({"request_id": data.request_id}, {"$set": update_data})
    await log_audit("DELIVERY_STATUS_UPDATED", current_user["user_id"], {"request_id": data.request_id, "status": data.status})
    await sio.emit('request_status_changed', {"request_id": data.request_id, "status": data.status})
    
    return {"message": "Status updated successfully"}

# Admin Endpoints
@api_router.get("/admin/pending-verifications")
async def get_pending_verifications(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    pending_ngos = await db.users.find(
        {"role": "ngo", "verification_status": "pending"},
        {"_id": 0, "password": 0}
    ).to_list(1000)
    
    return pending_ngos

@api_router.post("/admin/verify-ngo")
async def verify_ngo(data: VerificationAction, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    if data.action not in ["verified", "rejected"]:
        raise HTTPException(status_code=400, detail="Invalid action")
    
    await db.users.update_one(
        {"user_id": data.user_id},
        {"$set": {
            "verification_status": data.action,
            "verification_notes": data.notes,
            "verified_at": datetime.now(timezone.utc).isoformat(),
            "verified_by": current_user["user_id"]
        }}
    )
    
    # Send approval email if verified
    if data.action == "verified":
        ngo_user = await db.users.find_one({"user_id": data.user_id}, {"_id": 0})
        if ngo_user:
            await send_verification_approved_email(
                ngo_user.get("email"),
                ngo_user.get("name"),
                ngo_user.get("organization", "")
            )
    
    await log_audit("NGO_VERIFICATION", current_user["user_id"], {"ngo_user_id": data.user_id, "action": data.action})
    await sio.emit('verification_updated', {"user_id": data.user_id, "status": data.action})
    
    return {"message": f"NGO {data.action} successfully"}

@api_router.get("/admin/users")
async def get_all_users(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    users = await db.users.find({}, {"_id": 0, "password": 0}).to_list(10000)
    return users

@api_router.get("/admin/audit-logs")
async def get_audit_logs(current_user: dict = Depends(get_current_user), limit: int = 100):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    logs = await db.audit_logs.find({}, {"_id": 0}).sort("timestamp", -1).limit(limit).to_list(limit)
    return logs

# Analytics Endpoints
@api_router.get("/analytics/dashboard")
async def get_dashboard_stats(current_user: dict = Depends(get_current_user)):
    total_requests = await db.food_requests.count_documents({})
    completed_requests = await db.food_requests.count_documents({"status": "completed"})
    
    completed_list = await db.food_requests.find({"status": "completed"}, {"_id": 0}).to_list(10000)
    total_people_fed = sum(req.get("people_count", 0) for req in completed_list)
    
    ngo_count = await db.users.count_documents({"role": "ngo"})
    donor_count = await db.users.count_documents({"role": "donor"})
    volunteer_count = await db.users.count_documents({"role": "volunteer"})
    
    success_rate = (completed_requests / total_requests * 100) if total_requests > 0 else 0
    
    status_distribution = {}
    for status in ["pending", "accepted_by_donor", "assigned_to_volunteer", "picked_up", "in_transit", "delivered", "completed"]:
        count = await db.food_requests.count_documents({"status": status})
        status_distribution[status] = count
    
    return {
        "total_requests": total_requests,
        "completed_requests": completed_requests,
        "total_people_fed": total_people_fed,
        "ngo_count": ngo_count,
        "donor_count": donor_count,
        "volunteer_count": volunteer_count,
        "success_rate": round(success_rate, 2),
        "status_distribution": status_distribution
    }

@api_router.get("/analytics/trends")
async def get_trends(current_user: dict = Depends(get_current_user)):
    requests = await db.food_requests.find({"status": "completed"}, {"_id": 0}).sort("created_at", 1).to_list(10000)
    
    trends = {}
    for req in requests:
        try:
            date_str = req["created_at"][:10]
            if date_str not in trends:
                trends[date_str] = {"date": date_str, "requests": 0, "people_fed": 0}
            trends[date_str]["requests"] += 1
            trends[date_str]["people_fed"] += req.get("people_count", 0)
        except:
            pass
    
    return {"trends": list(trends.values())}

# Root Endpoints
@app.get("/")
async def root():
    return {
        "message": "SmartPlate API is running",
        "version": "1.0.0",
        "status": "healthy",
        "endpoints": {
            "api": "/api",
            "health": "/health",
            "docs": "/docs"
        }
    }

@app.get("/health")
async def health_check():
    try:
        await db.command('ping')
        return {
            "status": "healthy",
            "database": "connected",
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "database": "disconnected",
            "error": str(e),
            "timestamp": datetime.now(timezone.utc).isoformat()
        }

# Include router and middleware
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
