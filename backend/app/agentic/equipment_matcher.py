# MODULE: Agentic Classification and Assignment (Module 2) - this file belongs to the code for this module.
# Best-effort network asset equipment matcher associating complaints with switches and access points.

import re
import logging
from typing import List, Optional, Dict, Any
from bson import ObjectId
from backend.app.db import get_database
from backend.app.network_assets.models import AssetStatus, AssetCategory

logger = logging.getLogger("agentic.equipment_matcher")


def to_query_ids(ids: List[Any]) -> List[Any]:
    """Expands list of string or ObjectId identifiers so Mongo queries match both BSON types."""
    result = []
    for item in ids:
        if not item:
            continue
        s_id = str(item).strip()
        result.append(s_id)
        if ObjectId.is_valid(s_id):
            result.append(ObjectId(s_id))
    # Deduplicate while preserving order
    seen = set()
    deduped = []
    for x in result:
        # Stringify for set uniqueness check
        key = (type(x), str(x))
        if key not in seen:
            seen.add(key)
            deduped.append(x)
    return deduped


async def find_affected_equipment(
    location_name: str,
    problem_category: str,
    address_room: Optional[str] = None
) -> List[str]:
    """Finds up to 5 IN_USE network asset IDs related to a complaint's location and category.

    Args:
        location_name: Name or slug of the complaint location (e.g. "Tandon Hostel", "pd_tandon", "SVPH").
        problem_category: Routing category (WIFI_PROBLEM, LAN_PROBLEM, LAN_PORT_BROKEN, etc.).
        address_room: Optional room identifier (e.g. "Room 102", "102").

    Returns:
        List of up to 5 asset string IDs. Safe against any repository errors.
    """
    try:
        db = get_database()
        if not location_name:
            return []

        category_upper = problem_category.upper() if problem_category else ""
        if category_upper not in ["WIFI_PROBLEM", "LAN_PROBLEM", "LAN_PORT_BROKEN"]:
            return []

        # 1. Match location in na_locations (handles full names, codes, and slug IDs like "sv_patel")
        clean_loc = location_name.strip()
        normalized_name = clean_loc.replace("_", " ")

        loc_cursor = db.na_locations.find({
            "$or": [
                {"name": {"$regex": f"^{re.escape(clean_loc)}$", "$options": "i"}},
                {"name": {"$regex": f"^{re.escape(normalized_name)}$", "$options": "i"}},
                {"code": {"$regex": f"^{re.escape(clean_loc)}$", "$options": "i"}},
                {"id_key": clean_loc}
            ]
        })
        matching_locs = [doc async for doc in loc_cursor]

        if not matching_locs:
            # Partial match search on name or code
            loc_cursor = db.na_locations.find({
                "$or": [
                    {"name": {"$regex": re.escape(clean_loc), "$options": "i"}},
                    {"name": {"$regex": re.escape(normalized_name), "$options": "i"}},
                    {"code": {"$regex": re.escape(clean_loc), "$options": "i"}}
                ]
            })
            matching_locs = [doc async for doc in loc_cursor]

        if not matching_locs:
            return []

        loc_ids = [str(loc["_id"]) for loc in matching_locs]

        # Find child locations (e.g. rooms under building/hostel), querying both string and ObjectId parent_ids
        child_cursor = db.na_locations.find({"parent_id": {"$in": to_query_ids(loc_ids)}})
        child_locs = [doc async for doc in child_cursor]
        all_loc_ids = loc_ids + [str(c["_id"]) for c in child_locs]
        query_loc_ids = to_query_ids(all_loc_ids)

        asset_ids = []

        if category_upper == "WIFI_PROBLEM":
            # Find ACCESS_POINT assets IN_USE
            ap_cursor = db.na_assets.find({
                "location_id": {"$in": query_loc_ids},
                "category": AssetCategory.ACCESS_POINT.value,
                "status": AssetStatus.IN_USE.value
            }).limit(5)
            asset_ids = [str(doc["_id"]) async for doc in ap_cursor]

        elif category_upper in ["LAN_PROBLEM", "LAN_PORT_BROKEN"]:
            # If address_room specified, try to find room location first
            room_loc_ids = []
            if address_room:
                clean_room = address_room.strip().lower()
                for child in child_locs:
                    c_name = child.get("name", "").lower()
                    c_code = child.get("code", "").lower()
                    if clean_room in c_name or clean_room in c_code or c_name in clean_room:
                        room_loc_ids.append(str(child["_id"]))

            # If room location found, check switch ports
            switch_ids_from_ports = set()
            if room_loc_ids:
                ports_cursor = db.na_switch_ports.find({"location_id": {"$in": to_query_ids(room_loc_ids)}})
                async for port in ports_cursor:
                    if port.get("switch_id"):
                        switch_ids_from_ports.add(str(port["switch_id"]))

            # Match switch assets using both ObjectId and string representation for robust BSON compatibility
            if switch_ids_from_ports:
                switch_cursor = db.na_assets.find({
                    "_id": {"$in": to_query_ids(list(switch_ids_from_ports))},
                    "status": AssetStatus.IN_USE.value
                }).limit(5)
                asset_ids = [str(doc["_id"]) async for doc in switch_cursor]

            if not asset_ids:
                # Direct switch search at location
                sw_cursor = db.na_assets.find({
                    "location_id": {"$in": query_loc_ids},
                    "category": AssetCategory.SWITCH.value,
                    "status": AssetStatus.IN_USE.value
                }).limit(5)
                asset_ids = [str(doc["_id"]) async for doc in sw_cursor]

        return asset_ids[:5]

    except Exception as err:
        logger.warning(f"[EquipmentMatcher] Error finding equipment: {err}")
        return []
