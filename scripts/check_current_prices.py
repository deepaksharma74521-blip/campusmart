import json

with open('data/canteen_db.json', encoding='utf-8') as f:
    db = json.load(f)

for s in ['shop-1', 'shop-9', 'shop-8', 'shop-17', 'shop-3', 'shop-4', 'shop-6', 'shop-14']:
    shop_items = [x for x in db['foodItems'] if x.get('shopId') == s]
    print(f"=== {s}: {len(shop_items)} items ===")
    for item in shop_items[:10]:
        print(f"  {item['name']} -> Price: {item.get('price')} (portions: {item.get('portions')})")
