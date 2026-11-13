import json
import shutil
import uuid
import os
import re
from datetime import datetime

from all_shops_menus import MENUS
from all_shops_menus_part2 import MENUS_PART2
from all_shops_menus_part3 import MENUS_PART3
from all_shops_menus_part4 import MENUS_PART4

# Combine all 16 menus
ALL_REAL_MENUS = {}
ALL_REAL_MENUS.update(MENUS)
ALL_REAL_MENUS.update(MENUS_PART2)
ALL_REAL_MENUS.update(MENUS_PART3)
ALL_REAL_MENUS.update(MENUS_PART4)

print(f"Total shops to sync: {len(ALL_REAL_MENUS)}")

DB_PATH = 'data/canteen_db.json'
BAK_PATH = 'data/canteen_db.json.bak_menu_update'

# Make backup
shutil.copyfile(DB_PATH, BAK_PATH)
print(f"Backup verified at: {BAK_PATH}")

with open(DB_PATH, 'r', encoding='utf-8') as f:
    db = json.load(f)

# Map shopId to shop name
shop_names = {s['id']: s.get('name', '') for s in db.get('shops', [])}

def clean_words(s):
    # remove punctuation and split words
    words = re.findall(r'[a-z0-9]+', s.lower())
    # remove quantity / pcs noise
    filtered = [w for w in words if w not in ['pcs', 'pc', 'per', 'plate', 'full', 'half', 'plate', 'item', 'items']]
    return filtered

# Map shopId to photo directory
SHOP_PHOTO_DIRS = {
    'shop-1': 'assets/real_food_photos/tmu_chole_kulcha',
    'shop-9': 'assets/real_food_photos/shree_balaji_chai_bhandar',
    'shop-8': 'assets/real_food_photos/jiven_canteen',
    'shop-17': 'assets/real_food_photos/vardhaman_juice',
    'shop-3': 'assets/real_food_photos/chandrakanta',
    'shop-4': 'assets/real_food_photos/super_food_corner',
    'shop-6': 'assets/real_food_photos/foodo_holic',
    'shop-14': 'assets/real_food_photos/rapid_food_corner__south_indian',
    'shop-7': 'assets/real_food_photos/sardar_ji_hub',
    'shop-22': 'assets/real_food_photos/pani_puri',
    'shop-21': 'assets/real_food_photos/chai_nagri',
    'shop-12': 'assets/real_food_photos/royal_cafe',
    'shop-19': 'assets/real_food_photos/caffelera',
    'shop-20': 'assets/real_food_photos/rainbow',
    'shop-23': 'assets/real_food_photos/yummy_express',
    'shop-16': 'assets/real_food_photos/mahinder_food_junction',
}

stats = {"updated": 0, "added": 0, "preserved_photos": 0}

for shop_id, real_items in ALL_REAL_MENUS.items():
    shop_name = shop_names.get(shop_id, shop_id)
    # Existing items for this shop
    existing_items = [it for it in db['foodItems'] if it.get('shopId') == shop_id]
    
    # Available photos in shop folder
    photo_dir = SHOP_PHOTO_DIRS.get(shop_id)
    available_photos = []
    if photo_dir and os.path.exists(photo_dir):
        available_photos = [os.path.join(photo_dir, f).replace('\\', '/') for f in os.listdir(photo_dir)]

    matched_existing_ids = set()

    for r_item in real_items:
        r_name = r_item['name']
        r_price = float(r_item['price'])
        r_portions = r_item.get('portions')
        r_cat = r_item.get('category', 'All')
        r_words = clean_words(r_name)
        r_clean = "".join(r_words)

        matched_item = None

        # Pass 1: EXACT clean name match
        for ex in existing_items:
            if ex['id'] in matched_existing_ids:
                continue
            ex_words = clean_words(ex.get('name', ''))
            if "".join(ex_words) == r_clean:
                matched_item = ex
                break

        # Pass 2: Set of words match (e.g. "Chowmein Veg" == "Veg Chowmein")
        if not matched_item:
            for ex in existing_items:
                if ex['id'] in matched_existing_ids:
                    continue
                ex_words = clean_words(ex.get('name', ''))
                if set(ex_words) == set(r_words) and len(ex_words) > 0:
                    matched_item = ex
                    break

        if matched_item:
            matched_existing_ids.add(matched_item['id'])
            # UPDATE PRICE AND PORTIONS ONLY! PRESERVE EXISTING PHOTO & DESCRIPTION!
            matched_item['price'] = r_price
            if r_portions:
                matched_item['hasHalfFull'] = True
                matched_item['portions'] = r_portions
                matched_item['priceHalf'] = list(r_portions.values())[0]
                matched_item['priceFull'] = list(r_portions.values())[-1]
            else:
                matched_item['hasHalfFull'] = False
                matched_item['portions'] = None
                matched_item['priceHalf'] = None
                matched_item['priceFull'] = None
            
            matched_item['updatedAt'] = datetime.now().isoformat()
            stats['updated'] += 1
            stats['preserved_photos'] += 1
        else:
            # ADD NEW ITEM
            assigned_photo = None
            # Look for photo matching name keywords
            for p in available_photos:
                p_clean = "".join(clean_words(os.path.basename(p)))
                if any(w in p_clean for w in r_words if len(w) > 3):
                    assigned_photo = p
                    break
            
            if not assigned_photo and available_photos:
                # pick next from shop
                assigned_photo = available_photos[len(db['foodItems']) % len(available_photos)]
            elif not assigned_photo and existing_items:
                assigned_photo = existing_items[0].get('image', 'assets/ppt_images/food.jpg')
            else:
                assigned_photo = 'assets/ppt_images/food.jpg'

            new_id = f"dish-{uuid.uuid4().hex[:8]}"
            new_item = {
                "_id": new_id,
                "id": new_id,
                "name": r_name,
                "price": r_price,
                "hasHalfFull": bool(r_portions),
                "priceHalf": list(r_portions.values())[0] if r_portions else None,
                "priceFull": list(r_portions.values())[-1] if r_portions else None,
                "portions": r_portions if r_portions else None,
                "category": r_cat,
                "type": "veg",
                "isVeg": True,
                "image": assigned_photo,
                "imageUrl": assigned_photo,
                "description": f"Fresh, hygienic and freshly prepared {r_name} at {shop_name}.",
                "available": True,
                "isAvailable": True,
                "shopId": shop_id,
                "shopName": shop_name,
                "isRealPhoto": True,
                "createdAt": datetime.now().isoformat(),
                "updatedAt": datetime.now().isoformat()
            }
            db['foodItems'].append(new_item)
            stats['added'] += 1

print(f"Sync Results: {stats}")

# Write back to canteen_db.json
with open(DB_PATH, 'w', encoding='utf-8') as f:
    json.dump(db, f, indent=2, ensure_ascii=False)

print(f"Successfully saved updated database! Total foodItems now: {len(db['foodItems'])}")
