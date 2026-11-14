import json, re

def compute_pizza_sml(item):
    name = item.get("name", "")
    p = float(item.get("price", 0))
    p_half = item.get("priceHalf")
    p_full = item.get("priceFull")
    
    # 1. If item has half and full (like Caffelera), derive S, M, L
    if p_half and p_full and float(p_full) > float(p_half):
        s = float(p_half)
        l = float(p_full)
        diff = l - s
        m = round((s + diff * 0.52) / 10) * 10
        # If ends in 9 like 119, 149
        if int(s) % 10 == 9:
            m = m - 1 if m % 10 == 0 else m
        return s, float(m), l

    # 2. Derive from base price P
    if p <= 90:
        s = p
        m = p + 50
        l = p + 100
    elif p <= 130:
        s = p
        m = round((p * 1.58) / 10) * 10
        l = round((p * 2.18) / 10) * 10
    elif p <= 180:
        s = p
        m = round((p * 1.5) / 10) * 10
        l = round((p * 2.05) / 10) * 10
    elif p <= 250:
        s = p
        m = round((p * 1.48) / 10) * 10
        l = round((p * 1.98) / 10) * 10
    else: # Higher price pizza (e.g. 300+)
        s = round((p * 0.55) / 10) * 10
        m = round((p * 0.8) / 10) * 10
        l = p

    # Ensure clean price endings (if S ends in 9, M & L end in 9 or 0)
    if int(s) % 10 == 9:
        if int(m) % 10 == 0: m -= 1
        if int(l) % 10 == 0: l -= 1

    return float(s), float(m), float(l)

with open('data/canteen_db.json', 'r', encoding='utf-8') as f:
    db = json.load(f)

items = db.get('foodItems', [])
pizza_count = 0

for it in items:
    name_lower = it.get('name', '').lower()
    cat_lower = (it.get('category') or '').lower()
    
    # Identify Pizzas
    is_pizza = ('pizza' in name_lower) or ('calzone' in name_lower)
    
    if is_pizza:
        s, m, l = compute_pizza_sml(it)
        it['hasSizes'] = True
        it['hasHalfFull'] = False  # Pizza uses S/M/L sizes
        it['sizes'] = {
            "S": s,
            "M": m,
            "L": l
        }
        it['price'] = s
        it['priceS'] = s
        it['priceM'] = m
        it['priceL'] = l
        pizza_count += 1

print(f"Successfully configured 3 sizes (S, M, L) for {pizza_count} pizzas.")

with open('data/canteen_db.json', 'w', encoding='utf-8') as f:
    json.dump(db, f, indent=2, ensure_ascii=False)

print("Saved data/canteen_db.json successfully!")
