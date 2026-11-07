# ==============================================================================
# Campus Mart – 1-Click Price Synchronizer from Excel / CSV Sheet
# File: sync_prices_from_csv.py
# Description: Reads all_menu_prices.csv AND Shop_Menu_Sheets/*.csv, updates canteen_db.json, and pushes live to Git/Render
# ==============================================================================

import os
import sys
import csv
import json
import subprocess

ALL_CSV = "all_menu_prices.csv"
SHOP_DIR = "Shop_Menu_Sheets"
DB_FILE = os.path.join("data", "canteen_db.json")

print("=" * 65)
print("  🍔 CAMPUS MART – 1-CLICK EXCEL PRICE SYNCHRONIZER 🚀")
print("=" * 65)

if not os.path.exists(DB_FILE):
    print(f"[ERROR] Database file '{DB_FILE}' not found!")
    sys.exit(1)

def read_csv_file(path):
    for enc in ['utf-8-sig', 'utf-8', 'cp1252', 'latin-1']:
        try:
            with open(path, 'r', encoding=enc) as f:
                reader = csv.DictReader(f)
                return list(reader)
        except PermissionError:
            print(f"⚠️ [EXCEL OPEN] '{os.path.basename(path)}' is open in Excel! Please close it to allow reading.")
            return []
        except Exception:
            continue
    return []

# Collect all files to read and sort by modification time (oldest first, newest last so recent edits win)
csv_files_to_read = []
if os.path.exists(ALL_CSV):
    csv_files_to_read.append(ALL_CSV)

if os.path.exists(SHOP_DIR):
    for fname in sorted(os.listdir(SHOP_DIR)):
        if fname.endswith(".csv"):
            csv_files_to_read.append(os.path.join(SHOP_DIR, fname))

if not csv_files_to_read:
    print("[ERROR] No CSV price sheets found!")
    print(f"Please check that '{ALL_CSV}' or '{SHOP_DIR}/' exists.")
    sys.exit(1)

# Sort files by modification time so whichever file was touched most recently by user has final say!
csv_files_to_read.sort(key=lambda p: os.path.getmtime(p))

print(f"[INFO] Scanning {len(csv_files_to_read)} CSV files (ordered by recent edit time)...")

by_id = {}
by_name_shop = {}
total_rows_read = 0

for file_path in csv_files_to_read:
    file_rows = read_csv_file(file_path)
    total_rows_read += len(file_rows)
    for r in file_rows:
        item_id = (r.get('Item_ID') or '').strip()
        shop = (r.get('Shop_Name') or '').strip().lower()
        dish = (r.get('Dish_Name') or '').strip().lower()

        if item_id:
            by_id[item_id] = r
        if shop and dish:
            by_name_shop[(shop, dish)] = r

print(f"[OK] Indexed {len(by_id)} unique dishes across {len(csv_files_to_read)} files.")

# Load Database
with open(DB_FILE, 'r', encoding='utf-8') as f:
    db = json.load(f)

food_items = db.get('foodItems', [])
updated_count = 0
changes_list = []

for itm in food_items:
    item_id = str(itm.get('_id') or itm.get('id') or '')
    shop = str(itm.get('shopName') or '').strip().lower()
    dish = str(itm.get('name') or '').strip().lower()

    # Find matching CSV row
    csv_row = by_id.get(item_id) or by_name_shop.get((shop, dish))
    if not csv_row:
        continue

    changed = False

    # 1. Price
    raw_price = (csv_row.get('Price_INR') or '').replace('₹', '').replace(',', '').strip()
    if raw_price:
        try:
            new_price = round(float(raw_price), 2)
            old_price = round(float(itm.get('price', 0)), 2)
            if new_price != old_price:
                itm['price'] = new_price
                changed = True
                changes_list.append(f"[{itm.get('shopName')}] {itm.get('name')}: ₹{old_price} -> ₹{new_price}")
        except ValueError:
            pass

    # 2. Half / Full Price
    raw_half = (csv_row.get('Half_Price_INR') or '').replace('₹', '').replace(',', '').strip()
    raw_full = (csv_row.get('Full_Price_INR') or '').replace('₹', '').replace(',', '').strip()

    if raw_half or raw_full:
        try:
            new_half = round(float(raw_half), 2) if raw_half else None
            new_full = round(float(raw_full), 2) if raw_full else None
            
            if new_half != itm.get('priceHalf') or new_full != itm.get('priceFull') or not itm.get('hasHalfFull'):
                itm['hasHalfFull'] = True
                itm['priceHalf'] = new_half
                itm['priceFull'] = new_full
                if new_half:
                    itm['price'] = new_half
                changed = True
        except ValueError:
            pass
    elif itm.get('hasHalfFull') and (raw_half == '' and raw_full == ''):
        # Only reset if explicitly cleared
        pass

    # 3. Availability
    raw_avail = (csv_row.get('Available') or '').strip().upper()
    if raw_avail in ['YES', 'Y', 'TRUE', '1']:
        if not itm.get('available'):
            itm['available'] = True
            itm['isAvailable'] = True
            changed = True
    elif raw_avail in ['NO', 'N', 'FALSE', '0']:
        if itm.get('available'):
            itm['available'] = False
            itm['isAvailable'] = False
            changed = True

    if changed:
        updated_count += 1

print("-" * 65)
if updated_count == 0:
    print("ℹ️  No price changes detected. All database prices already match the CSV sheets.")
else:
    print(f"✅ Successfully updated {updated_count} items in memory!")
    print("\nSample changes applied:")
    for c in changes_list[:15]:
        print(f"  • {c}")
    if len(changes_list) > 15:
        print(f"  ... and {len(changes_list) - 15} more items.")

    # Save to canteen_db.json
    with open(DB_FILE, 'w', encoding='utf-8') as f:
        json.dump(db, f, indent=2, ensure_ascii=False)
    print(f"\n[SAVED] Database '{DB_FILE}' updated with new prices.")

    # Re-sync CSV sheets so both master and shop sheets reflect fresh values
    try:
        if os.path.exists("scratch/generate_csv.py"):
            subprocess.run([sys.executable, "scratch/generate_csv.py"], check=False)
        if os.path.exists("scratch/export_shop_sheets.py"):
            subprocess.run([sys.executable, "scratch/export_shop_sheets.py"], check=False)
    except Exception:
        pass

    # Auto Git Commit & Push
    print("\n[DEPLOY] Pushing changes to GitHub & Live Website (Render)...")
    try:
        subprocess.run(["git", "add", DB_FILE], check=True)
        if os.path.exists(ALL_CSV):
            subprocess.run(["git", "add", ALL_CSV], check=True)
        if os.path.exists(SHOP_DIR):
            subprocess.run(["git", "add", SHOP_DIR], check=True)
        commit_msg = f"Update menu prices ({updated_count} items changed)"
        subprocess.run(["git", "commit", "-m", commit_msg], check=True)
        subprocess.run(["git", "push", "origin", "main"], check=True)
        print("🎉 SUCCESS! Live website & student apps updated successfully!")
    except Exception as e:
        print(f"⚠️ Git push notice (you can push manually): {e}")

print("=" * 65)
print("Done! All items are synchronized.")
