from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm, OAuth2PasswordBearer
from jose import jwt, JWTError
from datetime import datetime, timedelta
from pydantic import BaseModel
import os
import httpx
import logging
from dotenv import load_dotenv
from users import verify_user, get_user_by_username
from models import UserResponse

load_dotenv()

# Set up logging
logger = logging.getLogger(__name__)

router = APIRouter()

# Debug environment variables
print("==== AUTH DEBUGGING ====")
print(f"JWT_SECRET available: {'Yes, length: ' + str(len(os.getenv('JWT_SECRET'))) if os.getenv('JWT_SECRET') else 'No'}")
print(f"DOUGH_TURNSILE_SECRET available: {'Yes, length: ' + str(len(os.getenv('DOUGH_TURNSILE_SECRET'))) if os.getenv('DOUGH_TURNSILE_SECRET') else 'No'}")

JWT_SECRET = os.getenv("JWT_SECRET", "your-secret-key-for-jwt")
TURNSTILE_SECRET = os.getenv("DOUGH_TURNSILE_SECRET")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/login")

# New model for login with Turnstile
class LoginRequest(BaseModel):
    username: str
    password: str
    turnstile_token: str

class TurnstileResponse(BaseModel):
    success: bool
    error_codes: list = []
    challenge_ts: str = ""
    hostname: str = ""

async def verify_turnstile_token(token: str, remote_ip: str = None) -> bool:
    """
    Verify Cloudflare Turnstile token
    """
    if not TURNSTILE_SECRET:
        logger.error("DOUGH_TURNSILE_SECRET environment variable not set")
        raise HTTPException(status_code=500, detail="Server configuration error")
    
    verify_url = "https://challenges.cloudflare.com/turnstile/v0/siteverify"
    
    data = {
        "secret": TURNSTILE_SECRET,
        "response": token,
    }
    
    # Add remote IP if available
    if remote_ip:
        data["remoteip"] = remote_ip
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(verify_url, data=data)
            response.raise_for_status()
            
            result = TurnstileResponse(**response.json())
            
            if not result.success:
                logger.warning(f"Turnstile verification failed: {result.error_codes}")
                return False
            
            logger.info("Turnstile verification successful")
            return True
            
    except httpx.RequestError as e:
        logger.error(f"Failed to verify Turnstile token: {e}")
        raise HTTPException(status_code=500, detail="Failed to verify security token")
    except Exception as e:
        logger.error(f"Unexpected error during Turnstile verification: {e}")
        raise HTTPException(status_code=500, detail="Security verification error")

# Unified login endpoint that handles both JSON and form data
@router.post("/api/login")
async def login(request: Request):
    """
    Unified login endpoint that handles both JSON (with Turnstile) and form data (legacy)
    """
    content_type = request.headers.get("content-type", "")
    
    # Handle JSON requests (new frontend with Turnstile)
    if "application/json" in content_type:
        try:
            body = await request.json()
            login_data = LoginRequest(**body)
            
            print(f"JSON login attempt: username='{login_data.username}', password_length={len(login_data.password)}")
            
            # Get client IP for Turnstile verification
            client_ip = request.client.host if request.client else None
            print(f"Client IP: {client_ip}")
            
            # Verify Turnstile token
            try:
                print(f"Verifying Turnstile token: {login_data.turnstile_token[:20]}...")
                is_valid = await verify_turnstile_token(login_data.turnstile_token, client_ip)
                if not is_valid:
                    print("Turnstile verification failed")
                    raise HTTPException(status_code=400, detail="Security verification failed")
                print("Turnstile verification passed")
            except HTTPException:
                raise
            except Exception as e:
                logger.error(f"Turnstile verification error: {e}")
                raise HTTPException(status_code=500, detail="Security verification error")
            
            username = login_data.username
            password = login_data.password
            
        except Exception as e:
            print(f"Error parsing JSON request: {e}")
            raise HTTPException(status_code=400, detail="Invalid request format")
    
    # Handle form data requests (legacy compatibility)
    else:
        try:
            form = await request.form()
            username = form.get("username")
            password = form.get("password")
            
            if not username or not password:
                raise HTTPException(status_code=400, detail="Username and password required")
            
            print(f"Form login attempt: username='{username}', password_length={len(password)}")
            print("Note: Form login bypasses Turnstile verification for legacy compatibility")
            
        except Exception as e:
            print(f"Error parsing form request: {e}")
            raise HTTPException(status_code=400, detail="Invalid request format")
    
    # Common authentication logic
    existing_user = get_user_by_username(username)
    if existing_user:
        print(f"User found in database: id={existing_user.id}")
        print(f"  username='{existing_user.username}'")
        print(f"  is_admin={existing_user.is_admin}")
        print(f"  is_owner={existing_user.is_owner}")
        print(f"  is_pet={existing_user.is_pet}")
        print(f"  password_hash_starts_with='{existing_user.password_hash[:10]}...'")
    else:
        print(f"User NOT found in database: '{username}'")
    
    # Try authenticate
    user = verify_user(username, password)
    if not user:
        print(f"Authentication FAILED for: '{username}'")
        if existing_user:
            print("  User exists but password verification failed")
            # Debug the bcrypt verification process
            from passlib.hash import bcrypt
            try:
                is_valid = bcrypt.verify(password, existing_user.password_hash)
                print(f"  Bcrypt verify result: {is_valid}")
            except Exception as e:
                print(f"  Bcrypt error: {str(e)}")
        
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    print(f"Authentication SUCCESS for: '{username}'")
    
    token = jwt.encode({
        "sub": user.username,
        "id": user.id,
        "display_name": user.display_name,
        "admin": user.is_admin,
        "owner": user.is_owner,
        "pet": user.is_pet,
        "avatar_url": getattr(user, 'avatar_url', None),
        "exp": datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    }, JWT_SECRET, algorithm=ALGORITHM)

    return {"access_token": token, "token_type": "bearer", "success": True}

def get_current_user(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[ALGORITHM])
        username = payload.get("sub")
        if username is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        user = get_user_by_username(username)
        if user is None:
            raise HTTPException(status_code=401, detail="User not found")
            
        return user
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

@router.get("/api/user_info", response_model=UserResponse)
def get_user_info(user = Depends(get_current_user)):
    return UserResponse(
        id=user.id,
        username=user.username,
        display_name=user.display_name,
        is_admin=user.is_admin,
        is_owner=user.is_owner,
        is_pet=user.is_pet,
        avatar_url=getattr(user, 'avatar_url', None)
    )