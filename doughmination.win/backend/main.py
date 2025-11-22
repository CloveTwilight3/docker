# ============================================================================
# IMPORTS
# ============================================================================
import os
import shutil
import aiofiles
import uuid
import json
import asyncio
import re
import weakref
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Optional, Set, Dict, Any

from fastapi import FastAPI, HTTPException, Request, Depends, Security, status, File, UploadFile, WebSocket, WebSocketDisconnect, Body
from fastapi.responses import JSONResponse, FileResponse, RedirectResponse, Response, HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from starlette.middleware.base import BaseHTTPMiddleware
from fastapi.security import SecurityScopes
from jose import JWTError
from dotenv import load_dotenv

# Local imports
from pluralkit import get_system, get_members, get_fronters, set_front
from auth import router as auth_router, get_current_user, oauth2_scheme
from tags import (
    get_member_tags, update_member_tags, add_member_tag, remove_member_tag,
    enrich_members_with_tags, initialize_default_tags
)
from models import (
    UserCreate, UserResponse, UserUpdate, MentalState
)
from users import get_users, create_user, delete_user, initialize_admin_user, update_user, get_user_by_id
from metrics import get_fronting_time_metrics, get_switch_frequency_metrics
from member_status import (
    get_member_status, set_member_status, clear_member_status,
    enrich_members_with_status, initialize_status_storage
)

# ============================================================================
# APPLICATION SETUP
# ============================================================================
load_dotenv()

app = FastAPI()

# Initialize the admin user if no users exist
initialize_admin_user()

# Initialize tags
initialize_default_tags()

# Initialize member status storage
initialize_status_storage()

# Default fallback avatar URL
DEFAULT_AVATAR = "https://www.yuri-lover.win/cdn/pfp/fallback_avatar.png"

# ============================================================================
# MIDDLEWARE SETUP
# ============================================================================

# File size limit middleware
class FileSizeLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        if request.method == 'POST' and '/avatar' in request.url.path:
            try:
                # 2MB in bytes
                MAX_SIZE = 2 * 1024 * 1024
                content_length = request.headers.get('content-length')
                if content_length and int(content_length) > MAX_SIZE:
                    return JSONResponse(
                        status_code=413,
                        content={"detail": "File size exceeds the limit of 2MB"}
                    )
            except:
                pass
        
        response = await call_next(request)
        return response

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8080",              # Local development
        "http://127.0.0.1:8080",              # Alternative local address
        "https://www.doughmination.win", # Production domain
        "http://www.doughmination.win",  # HTTP version of production domain
        "http://frontend",                    # Docker service name
        "http://frontend:80",                 # Docker service with port
        "http://doughmination.win",
        "https://doughmination.win"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add the file size limit middleware
app.add_middleware(FileSizeLimitMiddleware)

# Include login route
app.include_router(auth_router)

# Define paths for static file serving
FRONTEND_BUILD_DIR = Path("static")  # Files are copied here by Docker
STATIC_DIR = Path("static")

# Optional authentication function for public endpoints
async def get_optional_user(token: str = Security(oauth2_scheme, scopes=[])):
    try:
        return await get_current_user(token)
    except (HTTPException, JWTError):
        return None


# ============================================================================
# STATIC FILE SERVING SETUP
# ============================================================================

DATA_DIR = Path("dough-data")
DATA_DIR.mkdir(exist_ok=True)
MENTAL_STATE_FILE = DATA_DIR / "mental_state.json"

# Check if we have a built frontend to serve
if FRONTEND_BUILD_DIR.exists() and (FRONTEND_BUILD_DIR / "index.html").exists():
    # Copy frontend build to static directory
    if STATIC_DIR.exists() and STATIC_DIR != FRONTEND_BUILD_DIR:
        shutil.rmtree(STATIC_DIR)
        shutil.copytree(FRONTEND_BUILD_DIR, STATIC_DIR)

# Mount static files for the frontend
if STATIC_DIR.exists():
    app.mount("/assets", StaticFiles(directory=STATIC_DIR / "assets"), name="assets")

# ============================================================================
# STATIC FILE ENDPOINTS
# ============================================================================

@app.get("/robots.txt")
async def robots_txt():
    """Serve enhanced robots.txt"""
    robots_content = """# Doughmination System® - Robots.txt
User-agent: *
Allow: /
Crawl-delay: 1

# Allow specific bots
User-agent: Googlebot
Allow: /
Crawl-delay: 0

User-agent: Bingbot
Allow: /
Crawl-delay: 1

User-agent: Slurp
Allow: /

# Block bad bots
User-agent: AhrefsBot
Disallow: /

User-agent: SemrushBot
Disallow: /

User-agent: MJ12bot
Disallow: /

# Block common exploit attempts
Disallow: /vendor/
Disallow: /.env
Disallow: /HNAP1/
Disallow: /onvif/
Disallow: /PSIA/
Disallow: /index.php
Disallow: /eval-stdin.php
Disallow: /api/
Disallow: /admin/
Disallow: /ws

# Sitemap
Sitemap: https://www.doughmination.win/sitemap.xml
"""
    return Response(content=robots_content, media_type="text/plain")

@app.get("/sitemap.xml")
async def sitemap_xml():
    """Generate dynamic sitemap with all member pages"""
    try:
        # Fetch all members
        members = await get_members()
        
        # Start sitemap XML
        sitemap = """<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
  <!-- Homepage -->
  <url>
    <loc>https://www.doughmination.win/</loc>
    <lastmod>{today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  
  <!-- Admin/Login Pages -->
  <url>
    <loc>https://www.doughmination.win/admin/login</loc>
    <lastmod>{today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.3</priority>
  </url>
""".format(today=datetime.now(timezone.utc).strftime('%Y-%m-%d'))
        
        # Add each member page
        for member in members:
            member_name = member.get('name', '').replace(' ', '%20')
            avatar_url = member.get('avatar_url', '')
            
            sitemap += f"""  <!-- Member: {member.get('display_name') or member.get('name')} -->
  <url>
    <loc>https://www.doughmination.win/{member_name}</loc>
    <lastmod>{datetime.now(timezone.utc).strftime('%Y-%m-%d')}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>"""
            
            # Add image if available
            if avatar_url:
                sitemap += f"""
    <image:image>
      <image:loc>{avatar_url}</image:loc>
      <image:title>{member.get('display_name') or member.get('name')}</image:title>
    </image:image>"""
            
            sitemap += """
  </url>
"""
        
        # Close sitemap
        sitemap += "</urlset>"
        
        return Response(content=sitemap, media_type="application/xml")
        
    except Exception as e:
        print(f"Error generating sitemap: {e}")
        # Fallback to basic sitemap
        return Response(
            content=f"""<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://www.doughmination.win/</loc>
    <lastmod>{datetime.now(timezone.utc).strftime('%Y-%m-%d')}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>""",
            media_type="application/xml"
        )

@app.get("/favicon.ico")
async def favicon():
    """Serve favicon"""
    favicon_path = STATIC_DIR / "favicon.ico"
    if favicon_path.exists():
        return FileResponse(favicon_path)
    # Return a default favicon or 404
    raise HTTPException(status_code=404, detail="Favicon not found")

# ============================================================================
# WEBSOCKET ENDPOINT
# ============================================================================

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """
    WebSocket endpoint with improved error handling and connection management
    """

    manager = ConnectionManager()

    # Accept the WebSocket connection first
    await manager.connect(websocket, "all")
    
    # Send initial connection confirmation
    try:
        await websocket.send_json({
            "type": "connection_established",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "message": "WebSocket connected successfully"
        })
        print(f"WebSocket client connected from {websocket.client}")
    except Exception as e:
        print(f"Error sending connection confirmation: {e}")
        manager.disconnect(websocket, "all")
        return
    
    try:
        while True:
            # Keep the connection alive and handle messages
            try:
                # Use asyncio.wait_for to add timeout protection
                data = await asyncio.wait_for(
                    websocket.receive_text(),
                    timeout=60.0  # 60 second timeout
                )
                
                # Handle different message types
                if data == "ping":
                    await websocket.send_text("pong")
                    print("Received ping, sent pong")
                elif data == "subscribe":
                    # Client wants to subscribe to updates
                    await websocket.send_json({
                        "type": "subscribed",
                        "timestamp": datetime.now(timezone.utc).isoformat()
                    })
                    print("Client subscribed to updates")
                else:
                    # Log unknown messages
                    print(f"Received WebSocket message: {data}")
                    
            except asyncio.TimeoutError:
                # Send keepalive ping
                try:
                    await websocket.send_json({
                        "type": "keepalive",
                        "timestamp": datetime.now(timezone.utc).isoformat()
                    })
                except Exception:
                    print("Connection lost during keepalive")
                    break
                    
            except WebSocketDisconnect:
                print("Client disconnected")
                break
                
            except Exception as recv_error:
                print(f"Error receiving message: {recv_error}")
                break
                
    except WebSocketDisconnect:
        print("WebSocket disconnected normally")
    except Exception as e:
        print(f"WebSocket error in main loop: {e}")
        import traceback
        traceback.print_exc()
    finally:
        manager.disconnect(websocket, "all")
        print("WebSocket connection closed and cleaned up")


# ============================================================================
# IMPROVED CONNECTION MANAGER
# ============================================================================

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, Set[WebSocket]] = {
            "all": set(),  # All connected clients
            "authenticated": set()  # Authenticated users
        }
        # Use weakref to prevent memory leaks
        self._weak_connections = weakref.WeakSet()
        self._connection_lock = asyncio.Lock()

    async def connect(self, websocket: WebSocket, group: str = "all"):
        """Connect a WebSocket client to a group"""
        await websocket.accept()
        
        async with self._connection_lock:
            self.active_connections[group].add(websocket)
            self._weak_connections.add(websocket)
            
        print(f"Client connected to group: {group}. Total connections: {len(self.active_connections[group])}")

    def disconnect(self, websocket: WebSocket, group: str = "all"):
        """Disconnect a WebSocket client from all groups"""
        # Clean up from all groups when disconnecting
        for group_name, group_set in self.active_connections.items():
            group_set.discard(websocket)
            
        print(f"Client disconnected. Remaining connections in 'all': {len(self.active_connections['all'])}")

    async def send_personal_message(self, message: str, websocket: WebSocket):
        """Send a message to a specific client"""
        try:
            await websocket.send_text(message)
        except Exception as e:
            print(f"Error sending personal message: {e}")
            # Remove the connection if it's broken
            self.disconnect(websocket)

    async def broadcast(self, message: str, group: str = "all"):
        """Broadcast message to all connections in a group"""
        if group not in self.active_connections:
            print(f"Warning: Group '{group}' not found")
            return
            
        disconnected = set()
        connections = list(self.active_connections[group])
        
        print(f"Broadcasting to {len(connections)} clients in group '{group}'")
        
        for connection in connections:
            try:
                await connection.send_text(message)
            except WebSocketDisconnect:
                print(f"Client disconnected during broadcast")
                disconnected.add(connection)
            except RuntimeError as e:
                if "WebSocket is not connected" in str(e):
                    print(f"Client connection lost")
                    disconnected.add(connection)
                else:
                    print(f"Runtime error broadcasting: {e}")
                    disconnected.add(connection)
            except Exception as e:
                print(f"Error broadcasting to client: {e}")
                disconnected.add(connection)
        
        # Clean up disconnected clients
        for conn in disconnected:
            self.disconnect(conn, group)
        
        print(f"Broadcast complete. Removed {len(disconnected)} dead connections")

    async def broadcast_json(self, data: dict, group: str = "all"):
        """Broadcast JSON data to all connections in a group"""
        message = json.dumps(data)
        await self.broadcast(message, group)

# ============================================================================
# MENTAL STATE API ENDPOINTS
# ============================================================================

@app.get("/api/mental-state")
async def get_mental_state():
    """Get current mental state from database"""
    try:
        # Check if mental_state.json exists
        if os.path.exists(MENTAL_STATE_FILE):
            with open(MENTAL_STATE_FILE, "r") as f:
                state_data = json.load(f)
                # Convert the string back to datetime
                state_data["updated_at"] = datetime.fromisoformat(state_data["updated_at"])
                return MentalState(**state_data)
        else:
            # Default state
            return MentalState(
                level="safe",
                updated_at=datetime.now(timezone.utc),
                notes=None
            )
    except Exception as e:
        print(f"Error loading mental state: {e}")
        return MentalState(
            level="safe",
            updated_at=datetime.now(timezone.utc),
            notes=None
        )

@app.post("/api/mental-state")
async def update_mental_state(state: MentalState, user = Depends(get_current_user)):
    """Update mental state (admin only)"""
    if not user.is_admin:
        raise HTTPException(status_code=403, detail="Admin privileges required")
    
    try:
        state_data = state.dict()
        state_data["updated_at"] = state_data["updated_at"].isoformat()
        
        with open(MENTAL_STATE_FILE, "w") as f:
            json.dump(state_data, f, indent=2)
        
        # Broadcast the mental state update
        await broadcast_mental_state_update(state_data)
        
        return {"success": True, "message": "Mental state updated"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update mental state: {str(e)}")

# ============================================================================
# SYSTEM AND MEMBER API ENDPOINTS
# ============================================================================

@app.get("/api/system")
async def system_info():
    try:
        # Get system data
        system_data = await get_system()
        
        # Get mental state
        mental_state_data = None
        if os.path.exists(MENTAL_STATE_FILE):
            with open(MENTAL_STATE_FILE, "r") as f:
                state_data = json.load(f)
                # Convert the string back to datetime for the response
                state_data["updated_at"] = datetime.fromisoformat(state_data["updated_at"])
                mental_state_data = MentalState(**state_data)
        else:
            mental_state_data = MentalState(
                level="safe",
                updated_at=datetime.now(timezone.utc),
                notes=None
            )
        
        # Add mental state to system data
        system_data["mental_state"] = mental_state_data.dict()
        
        return system_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch system info: {str(e)}")

@app.get("/api/members")
async def members():
    """Get members with tags and status information"""
    try:
        # Get members
        members_data = await get_members()
        
        # Enrich with tags
        members_with_tags = enrich_members_with_tags(members_data)
        
        # Enrich with status information
        members_with_status = enrich_members_with_status(members_with_tags)
        
        return members_with_status
    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch members: {str(e)}")

@app.get("/api/fronters")
async def fronters():
    try:
        fronters_data = await get_fronters()
        
        # Enrich fronters with tags and status
        if "members" in fronters_data:
            members_with_tags = enrich_members_with_tags(fronters_data["members"])
            fronters_data["members"] = enrich_members_with_status(members_with_tags)
        
        return fronters_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch fronters: {str(e)}")

@app.get("/api/member/{member_id}")
async def member_detail(member_id: str):
    try:
        members = await get_members()
        for member in members:
            if member["id"] == member_id or member["name"].lower() == member_id.lower():
                # Enrich with tags and status
                member_with_tags = enrich_members_with_tags([member])[0]
                member_with_status = enrich_members_with_status([member_with_tags])[0]
                return member_with_status
        raise HTTPException(status_code=404, detail="Member not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch member details: {str(e)}")

# ============================================================================
# FRONTING CONTROL API ENDPOINTS
# ============================================================================

@app.post("/api/switch")
async def switch_front(request: Request, user = Depends(get_current_user)):
    try:
        body = await request.json()
        member_ids = body.get("members", [])

        if not isinstance(member_ids, list):
            raise HTTPException(status_code=400, detail="'members' must be a list of member IDs")

        await set_front(member_ids)
        
        # Broadcast the fronting update
        fronters_data = await get_fronters()
        await broadcast_fronting_update(fronters_data)
        
        return {"status": "success", "message": "Front updated successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/switch_front")
async def switch_single_front(request: Request, user = Depends(get_current_user)):
    try:
        body = await request.json()
        member_id = body.get("member_id")
        
        if not member_id:
            raise HTTPException(status_code=400, detail="member_id is required")

        result = await set_front([member_id])

        # After successful switch, broadcast the update
        if result or True:  # Broadcast even if result is None
            # Fetch the updated fronters data
            fronters_data = await get_fronters()
            await broadcast_fronting_update(fronters_data)

        return {"success": True, "message": "Front updated", "data": result}

    except HTTPException as http_exc:
        raise http_exc

    except Exception as e:
        print("Error in /api/switch_front:", e)
        raise HTTPException(status_code=500, detail=f"Failed to switch front: {str(e)}")

@app.post("/api/multi_switch")
async def switch_multiple_fronters(
    data: Dict[str, Any] = Body(...),
    user = Depends(get_current_user)
):
    """
    Switch to multiple fronters at once
    This is an alternative to /api/switch that provides more detailed feedback
    """
    try:
        member_ids = data.get("member_ids", [])
        
        if not isinstance(member_ids, list):
            raise HTTPException(status_code=400, detail="'member_ids' must be a list")
        
        # Get the members to show their names in the response
        all_members = await get_members()
        switching_members = []
        
        for member_id in member_ids:
            for member in all_members:
                if member.get("id") == member_id:
                    switching_members.append({
                        "id": member.get("id"),
                        "name": member.get("name"),
                        "display_name": member.get("display_name", member.get("name"))
                    })
                    break
        
        # Switch the fronters
        await set_front(member_ids)
        
        # Broadcast the fronting update
        fronters_data = await get_fronters()
        await broadcast_fronting_update(fronters_data)
        
        # Return detailed information about the switch
        return {
            "status": "success",
            "message": "Fronters updated successfully",
            "fronters": switching_members,
            "count": len(switching_members)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============================================================================
# MEMBER TAGS API ENDPOINTS
# ============================================================================

@app.get("/api/member-tags")
async def list_member_tags(user = Depends(get_current_user)):
    """Get all member tag assignments (admin only)"""
    if not user.is_admin:
        raise HTTPException(status_code=403, detail="Admin privileges required")
    
    try:
        member_tags = get_member_tags()
        return {
            "status": "success",
            "member_tags": member_tags
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch member tags: {str(e)}")

@app.post("/api/member-tags/{member_identifier}")
async def update_member_tag_list(
    member_identifier: str,
    tags: List[str] = Body(...),
    user = Depends(get_current_user)
):
    """Update the complete tag list for a member (admin only)"""
    if not user.is_admin:
        raise HTTPException(status_code=403, detail="Admin privileges required")
    
    try:
        # Update the member's tags
        success = update_member_tags(member_identifier, tags)
        
        if success:
            # Clear member cache to reflect changes
            from cache import set_in_cache
            set_in_cache("members_raw", None, 0)
            
            return {
                "status": "success",
                "message": f"Updated tags for {member_identifier}",
                "tags": tags
            }
        else:
            raise HTTPException(status_code=500, detail="Failed to update member tags")
    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update member tags: {str(e)}")

@app.post("/api/member-tags/{member_identifier}/add")
async def add_single_member_tag(
    member_identifier: str,
    tag: str = Body(..., embed=True),
    user = Depends(get_current_user)
):
    """Add a single tag to a member (admin only)"""
    if not user.is_admin:
        raise HTTPException(status_code=403, detail="Admin privileges required")
    
    try:
        # Add the tag
        success = add_member_tag(member_identifier, tag)
        
        if success:
            # Clear member cache to reflect changes
            from cache import set_in_cache
            set_in_cache("members_raw", None, 0)
            
            return {
                "status": "success",
                "message": f"Added tag '{tag}' to {member_identifier}"
            }
        else:
            return {
                "status": "info",
                "message": f"Tag '{tag}' already exists for {member_identifier}"
            }
    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to add member tag: {str(e)}")

@app.delete("/api/member-tags/{member_identifier}/{tag}")
async def remove_single_member_tag(
    member_identifier: str,
    tag: str,
    user = Depends(get_current_user)
):
    """Remove a single tag from a member (admin only)"""
    if not user.is_admin:
        raise HTTPException(status_code=403, detail="Admin privileges required")
    
    try:
        # Remove the tag
        success = remove_member_tag(member_identifier, tag)
        
        if success:
            # Clear member cache to reflect changes
            from cache import set_in_cache
            set_in_cache("members_raw", None, 0)
            
            return {
                "status": "success",
                "message": f"Removed tag '{tag}' from {member_identifier}"
            }
        else:
            raise HTTPException(
                status_code=404,
                detail=f"Tag '{tag}' not found for {member_identifier}"
            )
    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to remove member tag: {str(e)}")

# ============================================================================
# AUTHENTICATION API ENDPOINTS
# ============================================================================

@app.get("/api/is_admin")
async def check_admin(user = Depends(get_current_user)):
    return {"isAdmin": user.is_admin}

# ============================================================================
# USER MANAGEMENT API ENDPOINTS
# ============================================================================

@app.get("/api/users", response_model=List[UserResponse])
async def list_users(current_user = Depends(get_current_user)):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin privileges required")
    
    users = get_users()
    return [UserResponse(
        id=user.id, 
        username=user.username, 
        display_name=user.display_name, 
        is_admin=user.is_admin,
        avatar_url=getattr(user, 'avatar_url', None)
    ) for user in users]

@app.post("/api/users", response_model=UserResponse)
async def add_user(user_create: UserCreate, current_user = Depends(get_current_user)):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin privileges required")
    
    try:
        new_user = create_user(user_create)
        return UserResponse(
            id=new_user.id, 
            username=new_user.username, 
            display_name=new_user.display_name, 
            is_admin=new_user.is_admin,
            avatar_url=getattr(new_user, 'avatar_url', None)
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create user: {str(e)}")

@app.delete("/api/users/{user_id}")
async def remove_user(user_id: str, current_user = Depends(get_current_user)):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin privileges required")
    
    # Prevent self-deletion
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
    
    success = delete_user(user_id)
    if not success:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"message": "User deleted successfully"}

@app.put("/api/users/{user_id}")
async def update_user_info(user_id: str, user_update: UserUpdate, current_user = Depends(get_current_user)):
    # Only admins or the user themselves can update their info
    if not current_user.is_admin and current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Not authorized to update this user")
    
    try:
        updated_user = update_user(user_id, user_update)
        if not updated_user:
            raise HTTPException(status_code=404, detail="User not found")
        
        return UserResponse(
            id=updated_user.id,
            username=updated_user.username,
            display_name=updated_user.display_name,
            is_admin=updated_user.is_admin,
            avatar_url=getattr(updated_user, 'avatar_url', None)
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/users/{user_id}/avatar")
async def upload_user_avatar(
    user_id: str,
    avatar: UploadFile = File(...),
    current_user = Depends(get_current_user)
):
    # Only admins or the user themselves can update their avatar
    if not current_user.is_admin and current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Not authorized to update this user")
    
    # Verify user exists
    user = get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Only allow specific file extensions
    allowed_extensions = ['.jpg', '.jpeg', '.png', '.gif']
    
    # Get file extension and convert to lowercase
    _, file_ext = os.path.splitext(avatar.filename)
    file_ext = file_ext.lower()
    
    if file_ext not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Allowed types are: {', '.join(allowed_extensions)}"
        )
    
    # Validate file size (2MB limit)
    MAX_SIZE = 2 * 1024 * 1024  # 2MB
    
    # First check content-length header
    content_length = int(avatar.headers.get("content-length", 0))
    if content_length > MAX_SIZE:
        raise HTTPException(
            status_code=413, 
            detail="File size exceeds the limit of 2MB"
        )
    
    try:
        # Ensure DATA_DIR exists
        DATA_DIR.mkdir(exist_ok=True)
        print(f"DATA_DIR: {DATA_DIR}")
        print(f"DATA_DIR exists: {DATA_DIR.exists()}")
        
        # Read the file content
        contents = await avatar.read()
        file_size = len(contents)
        
        # Double-check file size
        if file_size > MAX_SIZE:
            raise HTTPException(
                status_code=413,
                detail="File size exceeds the limit of 2MB"
            )
        
        # Generate unique filename
        unique_filename = f"{user_id}_{uuid.uuid4()}{file_ext}"
        file_path = DATA_DIR / unique_filename
        
        print(f"Saving avatar to: {file_path}")
        
        # If there's an existing avatar, try to remove it
        users = get_users()
        for i, u in enumerate(users):
            if u.id == user_id and hasattr(u, 'avatar_url') and u.avatar_url:
                # Extract filename from URL
                try:
                    old_filename = u.avatar_url.split("/")[-1]
                    old_path = DATA_DIR / old_filename
                    if os.path.exists(old_path):
                        os.remove(old_path)
                        print(f"Removed old avatar: {old_path}")
                except Exception as e:
                    print(f"Error removing old avatar: {e}")
        
        # Save the new file
        async with aiofiles.open(file_path, 'wb') as out_file:
            await out_file.write(contents)
        
        print(f"Avatar saved successfully")
        print(f"File exists after save: {os.path.exists(file_path)}")
        
        # Get the base URL from environment variables
        base_url = os.getenv("BASE_URL", "").rstrip('/')
        if not base_url:
            # Fallback to a default URL
            base_url = "https://www.doughmination.win"
        
        # Ensure the URL has www if it's the doughmination.win domain
        if "doughmination.win" in base_url and not base_url.startswith("https://www."):
            base_url = base_url.replace("https://doughmination.win", "https://www.doughmination.win")
            base_url = base_url.replace("http://doughmination.win", "https://www.doughmination.win")
        
        # Construct full avatar URL
        avatar_url = f"{base_url}/avatars/{unique_filename}"
        
        print(f"Avatar URL: {avatar_url}")
        
        # Update user with avatar URL
        user_update = UserUpdate(avatar_url=avatar_url)
        updated_user = update_user(user_id, user_update)
        
        if not updated_user:
            raise HTTPException(status_code=500, detail="Failed to update user with avatar URL")
        
        return {"success": True, "avatar_url": avatar_url}
    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        print(f"Error saving avatar: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error uploading avatar: {str(e)}")

@app.get("/avatars/{filename}")
async def get_avatar(filename: str):
    """Serve avatar images with proper content type handling"""
    # Sanitize filename to prevent directory traversal
    safe_filename = os.path.basename(filename)
    file_path = DATA_DIR / safe_filename
    
    print(f"Avatar request for: {safe_filename}")
    print(f"Looking in: {file_path}")
    print(f"File exists: {os.path.exists(file_path)}")
    
    if os.path.exists(file_path) and os.path.isfile(file_path):
        # Set the appropriate media type based on file extension
        media_type = None
        if safe_filename.lower().endswith(('.jpg', '.jpeg')):
            media_type = "image/jpeg"
        elif safe_filename.lower().endswith('.png'):
            media_type = "image/png"
        elif safe_filename.lower().endswith('.gif'):
            media_type = "image/gif"
        else:
            # Default to octet-stream for unknown types
            media_type = "application/octet-stream"
        
        print(f"Serving file with media_type: {media_type}")
        
        return FileResponse(
            path=file_path,
            media_type=media_type,
            headers={
                "Cache-Control": "public, max-age=3600",
                "Access-Control-Allow-Origin": "*"
            }
        )
    
    # File not found - log details and return 404
    print(f"Avatar not found: {safe_filename}")
    print(f"DATA_DIR contents: {list(DATA_DIR.iterdir()) if DATA_DIR.exists() else 'DATA_DIR does not exist'}")
    
    # Instead of redirecting to default, return a proper 404
    raise HTTPException(
        status_code=404, 
        detail=f"Avatar not found: {safe_filename}"
    )

# ============================================================================
# METRICS API ENDPOINTS
# ============================================================================

@app.get("/api/metrics/fronting-time")
async def fronting_time_metrics(days: int = 30, user = Depends(get_current_user)):
    """Get fronting time metrics for each member over different timeframes"""
    try:
        metrics = await get_fronting_time_metrics(days)
        return metrics
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch fronting metrics: {str(e)}")

@app.get("/api/metrics/switch-frequency")
async def switch_frequency_metrics(days: int = 30, user = Depends(get_current_user)):
    """Get switch frequency metrics over different timeframes"""
    try:
        metrics = await get_switch_frequency_metrics(days)
        return metrics
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch switch frequency metrics: {str(e)}")

# ============================================================================
# ADMIN UTILITY ENDPOINTS
# ============================================================================

@app.post("/api/admin/refresh")
async def admin_refresh(user = Depends(get_current_user)):
    """Force refresh all connected clients"""
    if not user.is_admin:
        raise HTTPException(status_code=403, detail="Admin privileges required")
    
    try:
        # Broadcast refresh command
        await broadcast_frontend_update("force_refresh", {
            "message": "Admin initiated refresh"
        })
        
        return {"success": True, "message": "Refresh broadcast sent"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to broadcast refresh: {str(e)}")

# ============================================================================
# MEMBER STATUS ENDPOINTS
# ============================================================================
@app.get("/api/members/{member_identifier}/status")
async def get_member_status_endpoint(member_identifier: str):
    """Get status for a specific member (public endpoint)"""
    try:
        status = get_member_status(member_identifier)
        
        if status:
            return {
                "success": True,
                "member_identifier": member_identifier,
                "status": status
            }
        else:
            return {
                "success": True,
                "member_identifier": member_identifier,
                "status": None
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch member status: {str(e)}")

@app.post("/api/members/{member_identifier}/status")
async def set_member_status_endpoint(
    member_identifier: str,
    status_data: Dict[str, Any] = Body(...),
    user = Depends(get_current_user)
):
    """Set or update status for a member (admin only)"""
    if not user.is_admin:
        raise HTTPException(status_code=403, detail="Admin privileges required")
    
    try:
        status_text = status_data.get("text")
        emoji = status_data.get("emoji")
        
        if not status_text:
            raise HTTPException(status_code=400, detail="Status text is required")
        
        # Validate status text length
        if len(status_text) > 100:
            raise HTTPException(status_code=400, detail="Status text must be 100 characters or less")
        
        status = set_member_status(member_identifier, status_text, emoji)
        
        return {
            "success": True,
            "message": f"Status updated for {member_identifier}",
            "status": status
        }
    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to set member status: {str(e)}")

@app.delete("/api/members/{member_identifier}/status")
async def clear_member_status_endpoint(
    member_identifier: str,
    user = Depends(get_current_user)
):
    """Clear status for a member (admin only)"""
    if not user.is_admin:
        raise HTTPException(status_code=403, detail="Admin privileges required")
    
    try:
        success = clear_member_status(member_identifier)
        
        if success:
            return {
                "success": True,
                "message": f"Status cleared for {member_identifier}"
            }
        else:
            return {
                "success": False,
                "message": f"No status found for {member_identifier}"
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to clear member status: {str(e)}")

# =============================================================================
# ROOT ENDPOINT
# =============================================================================
@app.get("/")
async def serve_root():
    """Serve the main frontend application"""
    return FileResponse(STATIC_DIR / "index.html")

# ============================================================================
# DYNAMIC EMBEDS ENDPOINTS
# ============================================================================
@app.get("/{member_name}")
async def serve_member_page(member_name: str, request: Request):
    """Serve member page with dynamic meta tags for crawlers and enhanced SEO"""
    
    # Skip non-member routes
    skip_routes = ['api', 'admin', 'assets', 'avatars', 'favicon.ico', 
                   'robots.txt', 'sitemap.xml', 'ws', 'fonts']
    if any(member_name.startswith(route) for route in skip_routes):
        raise HTTPException(status_code=404)
    
    # Hex normalization helper (compatible with Python < 3.10)
    def normalize_hex(color: Optional[str], default: str = "#FF69B4") -> str:
        # Require a string input
        if not isinstance(color, str) or not color:
            return default
        c = color.lstrip("#")
        if len(c) == 6 and all(ch in "0123456789abcdefABCDEF" for ch in c):
            return f"#{c.upper()}"
        return default
    
    # HTML escape helper
    def escape_html(text: str) -> str:
        """Escape HTML special characters"""
        if not text:
            return ""
        return (text
                .replace('&', '&amp;')
                .replace('<', '&lt;')
                .replace('>', '&gt;')
                .replace('"', '&quot;')
                .replace("'", '&#x27;'))
    
    try:
        members = await get_members()
        member = None
        
        for m in members:
            if m.get("name", "").lower() == member_name.lower():
                member = m
                break
        
        if not member:
            return FileResponse(STATIC_DIR / "index.html")

        # Extract and prepare member data
        raw_color = member.get("color") or "#FF69B4"
        color = normalize_hex(raw_color)
        pronouns = escape_html(member.get("pronouns") or "they/them")
        display_name = escape_html(member.get("display_name") or member.get("name"))
        raw_description = member.get("description") or f"Member of the Doughmination System®"
        description = escape_html(raw_description)
        avatar_url = member.get("avatar_url") or "https://www.yuri-lover.win/cdn/pfp/fallback_avatar.png"
        member_id = member.get("id", "")
        
        # Prepare tags for keywords
        tags = member.get("tags", [])
        tags_text = ", ".join(tags) if tags else ""
        
        # Build keywords meta tag
        keywords = f"plural system, {display_name}, system member, Doughmination System, {pronouns}, headmate, alter"
        if tags_text:
            keywords += f", {tags_text}"
        
        # Structured data for Schema.org
        structured_data = f"""
    <script type="application/ld+json">
    {{
      "@context": "https://schema.org",
      "@type": "Person",
      "name": "{display_name}",
      "description": "{description}",
      "image": "{avatar_url}",
      "url": "https://www.doughmination.win/{member_name}",
      "identifier": "{member_id}",
      "memberOf": {{
        "@type": "Organization",
        "name": "Doughmination System®",
        "url": "https://www.doughmination.win/",
        "logo": "https://www.yuri-lover.win/cdn/pfp/fallback_avatar.png"
      }}
    }}
    </script>"""
        
        # Read index.html from frontend build
        index_path = STATIC_DIR / "index.html"
        with open(index_path, "r", encoding="utf-8") as f:
            html_content = f.read()
        
        # Build enhanced meta head with SEO optimization
        meta_head = f"""
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0">

    <!-- Page Title -->
    <title>{display_name} ({pronouns}) | Doughmination System® Member</title>
    
    <!-- SEO Meta Tags -->
    <meta name="description" content="{description} - Member of the Doughmination System®. Pronouns: {pronouns}" />
    <meta name="keywords" content="{keywords}" />
    <meta name="author" content="Doughmination System®" />
    <meta name="robots" content="index, follow, max-image-preview:large" />
    
    <!-- Canonical URL -->
    <link rel="canonical" href="https://www.doughmination.win/{member_name}" />

    <!-- iOS Safari Meta Tags -->
    <meta name="apple-mobile-web-app-title" content="{display_name}" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <meta name="mobile-web-app-capable" content="yes" />
    <link rel="apple-touch-icon" href="{avatar_url}" />

    <!-- Theme Color -->
    <meta name="theme-color" content="{color}" />

    <!-- Open Graph / Discord / Facebook -->
    <meta property="og:site_name" content="Doughmination System®" />
    <meta property="og:title" content="{display_name} - {pronouns}" />
    <meta property="og:description" content="{description}" />
    <meta property="og:image" content="{avatar_url}" />
    <meta property="og:image:width" content="400" />
    <meta property="og:image:height" content="400" />
    <meta property="og:image:alt" content="{display_name} avatar" />
    <meta property="og:type" content="profile" />
    <meta property="og:url" content="https://www.doughmination.win/{member_name}" />
    <meta property="og:locale" content="en_GB" />
    <meta property="profile:username" content="{member_name}" />

    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary" />
    <meta name="twitter:title" content="{display_name} - {pronouns}" />
    <meta name="twitter:description" content="{description}" />
    <meta name="twitter:image" content="{avatar_url}" />
    <meta name="twitter:image:alt" content="{display_name} avatar" />
    
    <!-- Structured Data (Schema.org JSON-LD) -->
    {structured_data}
    
    <!-- Breadcrumb Structured Data -->
    <script type="application/ld+json">
    {{
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        {{
          "@type": "ListItem",
          "position": 1,
          "name": "Home",
          "item": "https://www.doughmination.win/"
        }},
        {{
          "@type": "ListItem",
          "position": 2,
          "name": "{display_name}",
          "item": "https://www.doughmination.win/{member_name}"
        }}
      ]
    }}
    </script>
</head>
"""
        
        # Replace the head section
        html_content = re.sub(
            r"<head>.*?</head>",
            meta_head,
            html_content,
            flags=re.DOTALL
        )
        
        return HTMLResponse(content=html_content)
        
    except Exception as e:
        print(f"Error serving member page: {e}")
        import traceback
        traceback.print_exc()
        return FileResponse(STATIC_DIR / "index.html")