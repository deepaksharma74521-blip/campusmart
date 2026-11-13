import json
import re

from all_shops_menus import MENUS

def clean_words(s):
    # remove punctuation and split words
    words = re.findall(r'[a-z0-9]+', s.lower())
    # remove quantity / pcs noise
    filtered = [w for w in words if w not in ['pcs', 'pc', 'per', 'plate', 'full', 'half']]
    return filtered

with open('data/canteen_db.json', encoding='utf-8') as f:
    db = json.load(f)

existing = [it for it in db['foodItems'] if it.get('shopId') == 'shop-8']
real_items = MENUS['shop-8']

matched_ids = set()
for r in real_items:
    r_words = clean_words(r['name'])
    r_clean = "".join(r_words)
    
    # 1. Exact clean match
    found = None
    for ex in existing:
        if ex['id'] in matched_ids:
            continue
        ex_words = clean_words(ex['name'])
        ex_clean = "".join(ex_words)
        if ex_clean == r_clean:
            found = ex
            break
            
    # 2. Token set match
    if not found:
        for ex in existing:
            if ex['id'] in matched_ids:
                continue
            ex_words = clean_words(ex['name'])
            if set(ex_words) == set(r_words) and len(ex_words) > 0:
                found = ex
                break

    if found:
        matched_ids.add(found['id'])
        print(f"MATCH: Real '{r['name']}' (Rs {r['price']}) -> DB '{found['name']}' (Old: {found['price']})")
    else:
        print(f"NEW ITEM: '{r['name']}' (Rs {r['price']})")
