import json

with open('data/canteen_db.json', encoding='utf-8') as f:
    db = json.load(f)

for s in ['shop-1', 'shop-9', 'shop-8', 'shop-4']:
    shop_obj = next((x for x in db['shops'] if x.get('id')==s), {})
    items = [x for x in db['foodItems'] if x.get('shopId')==s]
    print(f"=== {s}: {shop_obj.get('name')} ({len(items)} items) ===")
    for it in items[:15]:
        p = it.get('price')
        portions = it.get('portions')
        img = it.get('image', '')
        print(f"  - {it.get('name')}: Rs {p} (portions: {portions}) [img: {img[:35]}]")
