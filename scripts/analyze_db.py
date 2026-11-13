import json
from collections import Counter

with open('data/canteen_db.json', encoding='utf-8') as f:
    db = json.load(f)

counts = Counter(item.get('shopId') for item in db['foodItems'])
for s in sorted(counts.keys(), key=lambda x: int(x.split('-')[1]) if '-' in x and x.split('-')[1].isdigit() else 999):
    shop_obj = next((x for x in db['shops'] if x.get('id')==s), {})
    print(f"{s:7s} ({shop_obj.get('name','Unknown'):35s}): {counts[s]} items")
