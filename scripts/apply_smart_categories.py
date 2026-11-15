import json, re

def categorize_dish(name, current_cat="", desc=""):
    full_text = f"{name} {current_cat} {desc}".lower()
    clean_name = re.sub(r'[^a-zA-Z0-9\s]', ' ', name).lower()
    
    # South Indian FIRST (e.g. Paper Dosa must not match paper stationery)
    if re.search(r'\b(dosa|dosas|idli|idlis|uttapam|uttappam|sambhar|sambar|vada sambhar|curd rice)\b', full_text):
        return "South Indian"

    # Pizzas & Garlic Breads
    if re.search(r'\b(pizza|pizzas|garlic bread|garlic breadsticks|calzone)\b', full_text):
        return "Pizzas & Garlic Breads"

    # Burgers & Sandwiches
    if re.search(r'\b(burger|burgers|sandwich|sandwiches|sub|subs|toast|panini|club sandwich)\b', full_text):
        return "Burgers & Sandwiches"

    # Rolls & Wraps
    if re.search(r'\b(roll|rolls|kathi|wrap|wraps|frankie)\b', full_text) and not re.search(r'\b(spring roll|bread roll)\b', full_text):
        return "Rolls & Wraps"

    # Chinese, Pastas & Momos
    if re.search(r'\b(noodle|noodles|chowmein|pasta|pastas|macaroni|makroni|manchurian|fried rice|chilli paneer|chilli potato|chilly potato|chilli mushroom|chilli soya|schezwan|singapuri|momo|momos|spring roll|kurkure momo|crispy corn|chopsuey|chop suey)\b', full_text):
        return "Chinese, Pastas & Momos"

    # Drinks, Shakes & Juices
    if re.search(r'\b(tea|chai|coffee|cold coffee|hot coffee|shake|shakes|juice|juices|mojito|mojitos|soda|shikanji|lassi|frappe|smoothie|lemonade|cooler|mocktail|water|pepsi|coke|sprite|dew|frooti|maaza|red bull|bournvita|horlicks)\b', full_text):
        return "Drinks, Shakes & Juices"

    # Desserts, Sweets & Waffles
    if any(k in full_text for k in ['waffle', 'brownie', 'ice cream', 'gulab jamun', 'rasgulla', 'kheer', 'kulfi', 'halwa', 'ras malai', 'chhena poda', 'cake', 'pastry', 'donut', 'cupcake', 'lava cake', 'sweet', 'chocolates', 'silk', 'kitkat', '5star', 'munch', 'snickers']):
        return "Desserts, Sweets & Waffles"

    # Naans, Rotis & Parathas
    if re.search(r'\b(roti|rotis|naan|naans|paratha|parathas|prantha|parantha|kulcha|kulchas|rumali|missi|laccha|tandoori roti|butter roti)\b', full_text):
        return "Naans, Rotis & Parathas"

    # Thalis, Rice & Biryanis
    if re.search(r'\b(thali|thalis|biryani|biryanis|pulao|khichdi|chawal|jeera rice|plain rice|combo|combos)\b', full_text):
        return "Thalis, Rice & Biryanis"

    # Main Course Curries
    if re.search(r'\b(paneer|dal|makhani|tadka|kofta|kadhai|shahi|lababdar|handi|chaap|mix veg|malai kofta|dum aloo|sev bhaji|chana masala|bhurji|subzi|curry|gravy|mughlai|changezi|rogan josh|matar paneer|palak paneer|tawa paneer|chole)\b', full_text):
        return "Main Course Curries"

    # Snacks, Maggi & Chaat
    if re.search(r'\b(maggi|samosa|pakoda|pakodi|bread pakora|bread roll|fries|nachos|pav bhaji|pao bhaji|chole bhature|bhature|aloo puri|bonda|golgappe|pani puri|chaat|chat|tikki|cutlet|chilla|poha|patty|patties|chips|kurkure|lays|namkeen|finger|fingers)\b', full_text):
        return "Snacks, Maggi & Chaat"

    # Salon & Grooming
    if any(k in full_text for k in ['haircut', 'shave', 'beard', 'facial', 'massage', 'trim', 'bleach', 'cleanup']):
        return "Salon & Grooming"
        
    # Stationery & Essentials
    if any(k in full_text for k in ['register', 'notebook', 'file', 'folder', 'pencil', 'pen', 'sheet', 'paper', 'photocopy', 'xerox', 'printout', 'spiral', 'soap', 'shampoo', 'paste', 'brush', 'sanitizer', 'detergent', 'towel']):
        return "Stationery & Essentials"

    # Default based on current category
    if "drink" in current_cat.lower() or "juice" in current_cat.lower():
        return "Drinks, Shakes & Juices"
    if "snack" in current_cat.lower() or "chip" in current_cat.lower():
        return "Snacks, Maggi & Chaat"
    if "stationery" in current_cat.lower() or "essential" in current_cat.lower():
        return "Stationery & Essentials"
        
    return "Main Course Curries"

def fix_price(p):
    p_int = int(p)
    p_str = str(p_int)
    if (p_str.endswith('01') or p_str.endswith('51')) and p_int > 200:
        # e.g. 801 -> 80, 601 -> 60, 1301 -> 130, 251 -> 25
        return float(p_str[:-1])
    return p

with open('data/canteen_db.json', 'r', encoding='utf-8') as f:
    db = json.load(f)

items = db.get('foodItems', [])
updated_count = 0
price_fixed_count = 0

for it in items:
    # NEVER touch items added manually by user or shopkeepers
    if it.get('manualAdded') or it.get('isManual'):
        continue
    old_cat = it.get('category', '')
    new_cat = categorize_dish(it.get('name', ''), old_cat, it.get('description', ''))
    if old_cat != new_cat:
        it['category'] = new_cat
        updated_count += 1
        
    old_p = it.get('price', 0)
    new_p = fix_price(old_p)
    if old_p != new_p:
        it['price'] = new_p
        price_fixed_count += 1
        print(f"Fixed glitched price for {it.get('name')}: {old_p} -> {new_p}")

print(f"Categories updated for {updated_count} dishes.")
print(f"Prices fixed for {price_fixed_count} dishes.")

with open('data/canteen_db.json', 'w', encoding='utf-8') as f:
    json.dump(db, f, indent=2, ensure_ascii=False)

print("Saved data/canteen_db.json successfully!")
