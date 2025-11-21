import httpx
import os
from dotenv import load_dotenv
from cache import get_from_cache, set_in_cache
from subsystems import enrich_members_with_tags, filter_members_by_subsystem

load_dotenv()

BASE_URL = "https://api.pluralkit.me/v2"
TOKEN = os.getenv("SYSTEM_TOKEN")
CACHE_TTL = int(os.getenv("CACHE_TTL", 30))

HEADERS = {
    "Authorization": TOKEN
}

# Cofront/fusion member definitions - up to 5 members
# Values can be lists of 2-5 member names
COFRONTS = {}

# Max number of members allowed in a cofront (enforced in set_front function)
MAX_FRONTERS = 6

# Special member display names
SPECIAL_DISPLAY_NAMES = {
    "answer": "Answer Machine",
    "system": "Unsure",
    "sleeping": "I am sleeping"
}

async def get_system():
    cache_key = "system"
    if (cached := get_from_cache(cache_key)):
        return cached
    async with httpx.AsyncClient() as client:
        resp = await client.get(f"{BASE_URL}/systems/@me", headers=HEADERS)
        resp.raise_for_status()
        data = resp.json()
        set_in_cache(cache_key, data, CACHE_TTL)
        return data

async def get_member_by_name(members_data, name):
    """Helper function to find a member by name"""
    for member in members_data:
        if member.get("name") == name:
            return member
    return None

async def get_members(subsystem_filter: str = None, include_untagged: bool = True):
    cache_key = f"members_{subsystem_filter}_{include_untagged}"
    if (cached := get_from_cache(cache_key)):
        return cached
    
    # First get all members from PluralKit
    base_cache_key = "members_raw"
    if not (cached_raw := get_from_cache(base_cache_key)):
        async with httpx.AsyncClient() as client:
            resp = await client.get(f"{BASE_URL}/systems/@me/members", headers=HEADERS)
            resp.raise_for_status()
            cached_raw = resp.json()
            set_in_cache(base_cache_key, cached_raw, CACHE_TTL)
    
    data = cached_raw
    
    # Process cofront members and special members
    processed_members = []
    for member in data:
        member_name = member.get("name")
        
        # Handle cofronts
        if member_name in COFRONTS:
            component_names = COFRONTS[member_name]
            component_members = []
            
            # Find the component members
            for component_name in component_names:
                component_member = await get_member_by_name(data, component_name)
                if component_member:
                    component_members.append(component_member)
            
            # Create cofront display data
            if component_members:
                # Combine display names - FIX: Handle None values
                display_names = []
                for comp in component_members:
                    display_name = comp.get("display_name") or comp.get("name") or "Unknown"
                    display_names.append(display_name)
                
                # Create cofront member data
                cofront_member = {
                    **member,  # Keep original member data
                    "is_cofront": True,
                    "component_members": component_members,
                    "display_name": " + ".join(display_names),
                    "original_name": member_name,
                    # Store all component member details including avatars
                    "component_avatars": [comp.get("avatar_url") for comp in component_members if comp.get("avatar_url")],
                    "member_count": len(component_members)
                }
                processed_members.append(cofront_member)
            else:
                # If we can't find component members, add as normal member
                processed_members.append(member)
        
        # Handle special display names (system -> Unsure, sleeping -> I am sleeping)
        elif member_name in SPECIAL_DISPLAY_NAMES:
            # Update the display name but keep everything else the same
            special_member = {
                **member,
                "display_name": SPECIAL_DISPLAY_NAMES[member_name],
                "is_special": True,  # Mark as special for identification
                "original_name": member_name
            }
            processed_members.append(special_member)
        
        # Handle normal members
        else:
            processed_members.append(member)
    
    # Enrich all members with tag information
    processed_members = enrich_members_with_tags(processed_members)
    
    # Apply sub-system filtering if requested
    if subsystem_filter:
        processed_members = filter_members_by_subsystem(
            processed_members, 
            subsystem_filter, 
            include_untagged
        )
    
    set_in_cache(cache_key, processed_members, CACHE_TTL)
    return processed_members

async def get_fronters():
    cache_key = "fronters"
    if (cached := get_from_cache(cache_key)):
        return cached
    async with httpx.AsyncClient() as client:
        resp = await client.get(f"{BASE_URL}/systems/@me/fronters", headers=HEADERS)
        resp.raise_for_status()
        data = resp.json()
        
        # Process special members and cofronts in fronters
        if "members" in data:
            # Get all members for reference (without filtering)
            all_members = await get_members()
            
            processed_fronters = []
            for member in data["members"]:
                member_name = member.get("name")
                
                # Find the processed member data from our get_members function
                processed_member = None
                for m in all_members:
                    if m.get("id") == member.get("id"):
                        processed_member = m
                        break
                
                if processed_member:
                    # Use the processed member data (which includes cofront, special display name, and tag handling)
                    processed_fronters.append(processed_member)
                else:
                    # Fallback to original member data but still enrich with tags
                    enriched_member = enrich_members_with_tags([member])[0]
                    processed_fronters.append(enriched_member)
            
            data["members"] = processed_fronters
        
        set_in_cache(cache_key, data, CACHE_TTL)
        return data

async def set_front(member_ids):
    """
    Sets the current front to the provided list of member IDs.
    Pass an empty list to clear the front.
    """
    # Enforce maximum number of fronters
    if len(member_ids) > MAX_FRONTERS:
        raise ValueError(f"Cannot have more than {MAX_FRONTERS} members fronting at once")
    
    # Clear fronters cache since we're updating it
    cache_key = "fronters"
    set_in_cache(cache_key, None, 0)  # Invalidate cache
    
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{BASE_URL}/systems/@me/switches",
            headers=HEADERS,
            json={"members": member_ids}
        )
        if resp.status_code not in (200, 204):
            raise Exception(f"Failed to set front: {resp.status_code} - {resp.text}")

        # If there's a response body, return it, otherwise return None
        return resp.json() if resp.content else None

async def create_dynamic_cofront(member_ids, name=None):
    """
    Create a dynamic cofront from a list of member IDs.
    If name is not provided, a name will be generated based on the first letter of each member.
    
    This is a helper function and doesn't directly interact with PluralKit API.
    The frontend would need additional routes to use this functionality.
    """
    if len(member_ids) < 2 or len(member_ids) > MAX_FRONTERS:
        raise ValueError(f"Cofronts must have between 2 and {MAX_FRONTERS} members")
    
    # Get all members for reference (without filtering)
    all_members = await get_members()
    
    # Find the members by their IDs
    component_members = []
    for member_id in member_ids:
        for member in all_members:
            if member.get("id") == member_id:
                component_members.append(member)
                break
    
    # Verify we found all members
    if len(component_members) != len(member_ids):
        raise ValueError("One or more member IDs not found")
    
    # Generate a name if not provided - FIX: Handle None values
    if not name:
        # Use first letter of each member name, but handle None/empty names
        name_parts = []
        for member in component_members:
            member_name = member.get("name") or "Unknown"
            if member_name:
                name_parts.append(member_name[0])
        name = "".join(name_parts) or "Cofront"
    
    # Combine display names - FIX: Handle None values
    display_names = []
    for comp in component_members:
        display_name = comp.get("display_name") or comp.get("name") or "Unknown"
        display_names.append(display_name)
    
    # Create cofront data structure
    cofront_data = {
        "is_cofront": True,
        "component_members": component_members,
        "display_name": " + ".join(display_names),
        "original_name": name,
        "component_avatars": [comp.get("avatar_url") for comp in component_members if comp.get("avatar_url")],
        "member_count": len(component_members),
        "is_dynamic": True  # Flag to indicate this is a dynamically created cofront
    }
    
    return cofront_data