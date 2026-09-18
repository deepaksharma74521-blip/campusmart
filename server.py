# ==============================================================================
# Campus Mart – Smart Food & Essentials Pre-Order System (MongoDB Backend)
# File: server.py
# Description: Flask REST API + MongoDB Database Server
# ==============================================================================

import os
import sys
import json
import uuid
import hashlib
from datetime import datetime

if hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS

app = Flask(__name__, static_folder=".")
CORS(app)

# ------------------------------------------------------------------------------
# 1. DATABASE LAYER: PyMongo with Auto-Fallback Persistent Document Store
# ------------------------------------------------------------------------------
MONGO_URI = os.environ.get("MONGO_URI", "mongodb://localhost:27017/campus_canteen")
DB_NAME = "campus_canteen"
DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
DATA_FILE = os.path.join(DATA_DIR, "canteen_db.json")

use_real_mongo = False
mongo_client = None
db = None

try:
    from pymongo import MongoClient
    mongo_client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=1500)
    # Ping database to check if server is reachable
    mongo_client.admin.command('ping')
    db = mongo_client[DB_NAME]
    use_real_mongo = True
    print(f"[OK] Successfully connected to local MongoDB server at: {MONGO_URI}")
except Exception as e:
    print(f"[INFO] Standalone MongoDB server (mongod) not running on port 27017.")
    print("[INFO] Initializing Local Persistent MongoDB Document Store (data/canteen_db.json)...")

# Local Persistent JSON Document Store (when standalone mongod is not running)
class LocalMongoCollection:
    def __init__(self, name):
        self.name = name

    def _read_all(self):
        if not os.path.exists(DATA_FILE):
            os.makedirs(DATA_DIR, exist_ok=True)
            initial_data = {"users": [], "foodItems": [], "orders": []}
            with open(DATA_FILE, "w", encoding="utf-8") as f:
                json.dump(initial_data, f, indent=2)
            return initial_data.get(self.name, [])
        try:
            with open(DATA_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                return data.get(self.name, [])
        except Exception:
            return []

    def _write_all(self, items):
        os.makedirs(DATA_DIR, exist_ok=True)
        data = {}
        if os.path.exists(DATA_FILE):
            try:
                with open(DATA_FILE, "r", encoding="utf-8") as f:
                    data = json.load(f)
            except Exception:
                data = {}
        data[self.name] = items
        with open(DATA_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, default=str)

    def find(self, query=None):
        items = self._read_all()
        if not query:
            return items
        results = []
        for item in items:
            match = True
            for k, v in query.items():
                if item.get(k) != v:
                    match = False
                    break
            if match:
                results.append(item)
        return results

    def find_one(self, query):
        items = self.find(query)
        return items[0] if items else None

    def insert_one(self, document):
        items = self._read_all()
        if "_id" not in document:
            document["_id"] = str(uuid.uuid4())
        items.append(document)
        self._write_all(items)
        return document

    def update_one(self, query, update):
        items = self._read_all()
        updated = False
        update_fields = update.get("$set", update)
        for item in items:
            match = True
            for k, v in query.items():
                if item.get(k) != v:
                    match = False
                    break
            if match:
                for uk, uv in update_fields.items():
                    item[uk] = uv
                updated = True
                break
        if updated:
            self._write_all(items)
        return updated

    def delete_one(self, query):
        items = self._read_all()
        new_items = []
        deleted = False
        for item in items:
            match = True
            for k, v in query.items():
                if item.get(k) != v:
                    match = False
                    break
            if not match:
                new_items.append(item)
            else:
                deleted = True
        if deleted:
            self._write_all(new_items)
        return deleted

    def count_documents(self, query=None):
        return len(self.find(query))


class LocalMongoDB:
    def __init__(self):
        self.users = LocalMongoCollection("users")
        self.foodItems = LocalMongoCollection("foodItems")
        self.orders = LocalMongoCollection("orders")

if not use_real_mongo:
    db = LocalMongoDB()

# Helper: Hash password
def hash_password(pwd):
    return hashlib.sha256(pwd.encode('utf-8')).hexdigest()

# Helper: Format Mongo doc to JSON
def format_doc(doc):
    if not doc:
        return None
    doc_copy = dict(doc)
    if "_id" in doc_copy:
        doc_copy["_id"] = str(doc_copy["_id"])
        doc_copy["id"] = doc_copy["_id"]
    return doc_copy

# ------------------------------------------------------------------------------
# 2. INITIAL SEED DATA (10+ Dishes & Default Admin)
# ------------------------------------------------------------------------------
SAMPLE_DISHES = [
    # --- 1. Canteen Food (8 items) ---
    {
        "_id": "dish-1",
        "name": "Samosa (2 Pcs)",
        "category": "Canteen Food",
        "price": 25,
        "type": "veg",
        "available": True,
        "isAvailable": True,
        "image": "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=600&auto=format&fit=crop&q=80",
        "imageUrl": "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=600&auto=format&fit=crop&q=80",
        "description": "Crispy golden pastry triangles stuffed with spiced potatoes and peas, served with sweet tamarind chutney."
    },
    {
        "_id": "dish-2",
        "name": "Aloo Paratha with Curd",
        "category": "Canteen Food",
        "price": 40,
        "type": "veg",
        "available": True,
        "isAvailable": True,
        "image": "https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=600&auto=format&fit=crop&q=80",
        "imageUrl": "https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=600&auto=format&fit=crop&q=80",
        "description": "Hot buttered whole wheat flatbread stuffed with spiced mashed potatoes, served with fresh curd & pickle."
    },
    {
        "_id": "dish-3",
        "name": "Veg Grilled Sandwich",
        "category": "Canteen Food",
        "price": 45,
        "type": "veg",
        "available": True,
        "isAvailable": True,
        "image": "https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=600&auto=format&fit=crop&q=80",
        "imageUrl": "https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=600&auto=format&fit=crop&q=80",
        "description": "Fresh grilled vegetable sandwich loaded with cucumber, tomato, cheese slice, and green mint chutney."
    },
    {
        "_id": "dish-4",
        "name": "Masala Dosa",
        "category": "Canteen Food",
        "price": 50,
        "type": "veg",
        "available": True,
        "isAvailable": True,
        "image": "https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=600&auto=format&fit=crop&q=80",
        "imageUrl": "https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=600&auto=format&fit=crop&q=80",
        "description": "Crispy thin rice crepe filled with fragrant potato masala, served with coconut chutney & hot sambar."
    },
    {
        "_id": "dish-5",
        "name": "Veg Hakka Chowmein",
        "category": "Canteen Food",
        "price": 60,
        "type": "veg",
        "available": True,
        "isAvailable": True,
        "image": "https://images.unsplash.com/photo-1585032226651-759b368d7246?w=600&auto=format&fit=crop&q=80",
        "imageUrl": "https://images.unsplash.com/photo-1585032226651-759b368d7246?w=600&auto=format&fit=crop&q=80",
        "description": "Street-style stir fried noodles with crunchy shredded vegetables, soya sauce, and spicy garlic chili."
    },
    {
        "_id": "dish-6",
        "name": "Paneer Special Thali",
        "category": "Canteen Food",
        "price": 90,
        "type": "veg",
        "available": True,
        "isAvailable": True,
        "image": "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=600&auto=format&fit=crop&q=80",
        "imageUrl": "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=600&auto=format&fit=crop&q=80",
        "description": "Complete nutritious lunch meal with paneer butter masala, 2 rotis, steamed rice, dal fry & salad."
    },
    {
        "_id": "dish-7",
        "name": "Chicken Biryani Box",
        "category": "Canteen Food",
        "price": 120,
        "type": "nonveg",
        "available": True,
        "isAvailable": True,
        "image": "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=600&auto=format&fit=crop&q=80",
        "imageUrl": "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=600&auto=format&fit=crop&q=80",
        "description": "Fragrant basmati rice slow-cooked with tender spiced chicken pieces, served with cooling onion raita."
    },
    {
        "_id": "dish-8",
        "name": "Chole Bhature (2 Pcs)",
        "category": "Canteen Food",
        "price": 65,
        "type": "veg",
        "available": True,
        "isAvailable": True,
        "image": "https://images.unsplash.com/photo-1626132647523-66f5bf380027?w=600&auto=format&fit=crop&q=80",
        "imageUrl": "https://images.unsplash.com/photo-1626132647523-66f5bf380027?w=600&auto=format&fit=crop&q=80",
        "description": "Fluffy puffed bhaturas served with authentic spicy Punjabi chole, sliced onions and tangy pickle."
    },

    # --- 2. Chocolates & Candies (8 items) ---
    {
        "_id": "dish-9",
        "name": "Cadbury Dairy Milk Silk (60g)",
        "category": "Chocolates & Candies",
        "price": 80,
        "type": "veg",
        "available": True,
        "isAvailable": True,
        "image": "https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=600&auto=format&fit=crop&q=80",
        "imageUrl": "https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=600&auto=format&fit=crop&q=80",
        "description": "Rich, smooth and creamy milk chocolate bar for chocolate lovers."
    },
    {
        "_id": "dish-10",
        "name": "Nestlé KitKat 4-Finger Bar",
        "category": "Chocolates & Candies",
        "price": 30,
        "type": "veg",
        "available": True,
        "isAvailable": True,
        "image": "https://images.unsplash.com/photo-1621996346565-e3d5d6281699?w=600&auto=format&fit=crop&q=80",
        "imageUrl": "https://images.unsplash.com/photo-1621996346565-e3d5d6281699?w=600&auto=format&fit=crop&q=80",
        "description": "Crispy wafer fingers covered with delicious milk chocolate. Have a break, have a KitKat!"
    },
    {
        "_id": "dish-11",
        "name": "Snickers Peanut Chocolate Bar",
        "category": "Chocolates & Candies",
        "price": 40,
        "type": "veg",
        "available": True,
        "isAvailable": True,
        "image": "https://images.unsplash.com/photo-1582293041079-7814c2f12063?w=600&auto=format&fit=crop&q=80",
        "imageUrl": "https://images.unsplash.com/photo-1582293041079-7814c2f12063?w=600&auto=format&fit=crop&q=80",
        "description": "Loaded with roasted peanuts, nougat, caramel and milk chocolate. Instant hunger helper!"
    },
    {
        "_id": "dish-12",
        "name": "Cadbury 5 Star 3D Bar",
        "category": "Chocolates & Candies",
        "price": 25,
        "type": "veg",
        "available": True,
        "isAvailable": True,
        "image": "https://images.unsplash.com/photo-1548907040-4baa42d10919?w=600&auto=format&fit=crop&q=80",
        "imageUrl": "https://images.unsplash.com/photo-1548907040-4baa42d10919?w=600&auto=format&fit=crop&q=80",
        "description": "Crunchy wheat crispies immersed in smooth flowing caramel and rich milk chocolate."
    },
    {
        "_id": "dish-13",
        "name": "Nestlé Munch Extra Crunch Bar",
        "category": "Chocolates & Candies",
        "price": 15,
        "type": "veg",
        "available": True,
        "isAvailable": True,
        "image": "https://images.unsplash.com/photo-1587132137056-bfbf0166836e?w=600&auto=format&fit=crop&q=80",
        "imageUrl": "https://images.unsplash.com/photo-1587132137056-bfbf0166836e?w=600&auto=format&fit=crop&q=80",
        "description": "Super crunchy light wafer layers coated with smooth milk chocolate."
    },
    {
        "_id": "dish-14",
        "name": "Cadbury Perk Double Bar",
        "category": "Chocolates & Candies",
        "price": 10,
        "type": "veg",
        "available": True,
        "isAvailable": True,
        "image": "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=600&auto=format&fit=crop&q=80",
        "imageUrl": "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=600&auto=format&fit=crop&q=80",
        "description": "Light and crispy chocolate wafer bar for sweet cravings between lectures."
    },
    {
        "_id": "dish-15",
        "name": "Cadbury Gems Colorful Candies",
        "category": "Chocolates & Candies",
        "price": 20,
        "type": "veg",
        "available": True,
        "isAvailable": True,
        "image": "https://images.unsplash.com/photo-1581798459219-318e76aecc7b?w=600&auto=format&fit=crop&q=80",
        "imageUrl": "https://images.unsplash.com/photo-1581798459219-318e76aecc7b?w=600&auto=format&fit=crop&q=80",
        "description": "Crispy sugar-coated chocolate buttons in vibrant rainbow colors."
    },
    {
        "_id": "dish-16",
        "name": "Ferrero Rocher (Pack of 3)",
        "category": "Chocolates & Candies",
        "price": 140,
        "type": "veg",
        "available": True,
        "isAvailable": True,
        "image": "https://images.unsplash.com/photo-1579372786545-d24232daf58c?w=600&auto=format&fit=crop&q=80",
        "imageUrl": "https://images.unsplash.com/photo-1579372786545-d24232daf58c?w=600&auto=format&fit=crop&q=80",
        "description": "Premium whole crunchy hazelnut inside a creamy filling with crispy wafer shell and milk chocolate."
    },

    # --- 3. Packaged Snacks & Chips (8 items) ---
    {
        "_id": "dish-17",
        "name": "Lay's India's Magic Masala (Blue)",
        "category": "Snacks & Chips",
        "price": 20,
        "type": "veg",
        "available": True,
        "isAvailable": True,
        "image": "https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=600&auto=format&fit=crop&q=80",
        "imageUrl": "https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=600&auto=format&fit=crop&q=80",
        "description": "Crunchy spicy potato chips bursting with authentic Indian street spices."
    },
    {
        "_id": "dish-18",
        "name": "Lay's American Style Cream & Onion (Green)",
        "category": "Snacks & Chips",
        "price": 20,
        "type": "veg",
        "available": True,
        "isAvailable": True,
        "image": "https://images.unsplash.com/photo-1621447504864-d8686e12698c?w=600&auto=format&fit=crop&q=80",
        "imageUrl": "https://images.unsplash.com/photo-1621447504864-d8686e12698c?w=600&auto=format&fit=crop&q=80",
        "description": "Crispy sliced potato chips infused with rich sour cream and savory onion flavors."
    },
    {
        "_id": "dish-19",
        "name": "Kurkure Masala Munch Pack",
        "category": "Snacks & Chips",
        "price": 20,
        "type": "veg",
        "available": True,
        "isAvailable": True,
        "image": "https://images.unsplash.com/photo-1599490659213-e2b9527bd087?w=600&auto=format&fit=crop&q=80",
        "imageUrl": "https://images.unsplash.com/photo-1599490659213-e2b9527bd087?w=600&auto=format&fit=crop&q=80",
        "description": "Iconic crunchy puffed corn sticks seasoned with chatpata tangy Indian spices."
    },
    {
        "_id": "dish-20",
        "name": "Bingo! Mad Angles Achaari Masti",
        "category": "Snacks & Chips",
        "price": 20,
        "type": "veg",
        "available": True,
        "isAvailable": True,
        "image": "https://images.unsplash.com/photo-1513456852971-30c0b8199d4d?w=600&auto=format&fit=crop&q=80",
        "imageUrl": "https://images.unsplash.com/photo-1513456852971-30c0b8199d4d?w=600&auto=format&fit=crop&q=80",
        "description": "Triangle shaped crunchy corn chips infused with mango pickle achaari flavor."
    },
    {
        "_id": "dish-21",
        "name": "Haldiram's Aloo Bhujia (150g)",
        "category": "Snacks & Chips",
        "price": 45,
        "type": "veg",
        "available": True,
        "isAvailable": True,
        "image": "https://images.unsplash.com/photo-1606491956689-2ea866880c84?w=600&auto=format&fit=crop&q=80",
        "imageUrl": "https://images.unsplash.com/photo-1606491956689-2ea866880c84?w=600&auto=format&fit=crop&q=80",
        "description": "Classic crispy potato and besan noodles tossed with mint, chili and spices."
    },
    {
        "_id": "dish-22",
        "name": "Haldiram's All-In-One Mixture (150g)",
        "category": "Snacks & Chips",
        "price": 45,
        "type": "veg",
        "available": True,
        "isAvailable": True,
        "image": "https://images.unsplash.com/photo-1613946069412-38f7f1ff0b65?w=600&auto=format&fit=crop&q=80",
        "imageUrl": "https://images.unsplash.com/photo-1613946069412-38f7f1ff0b65?w=600&auto=format&fit=crop&q=80",
        "description": "Sweet, salty and spicy mixture of nuts, sev, cornflakes, pulses and dry fruits."
    },
    {
        "_id": "dish-23",
        "name": "Oreo Vanilla Creme Biscuits Pack",
        "category": "Snacks & Chips",
        "price": 30,
        "type": "veg",
        "available": True,
        "isAvailable": True,
        "image": "https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=600&auto=format&fit=crop&q=80",
        "imageUrl": "https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=600&auto=format&fit=crop&q=80",
        "description": "Rich dark cocoa sandwich cookies filled with sweet vanilla cream filling. Twist, lick, dunk!"
    },
    {
        "_id": "dish-24",
        "name": "Parle Hide & Seek Choco Chip Biscuits",
        "category": "Snacks & Chips",
        "price": 35,
        "type": "veg",
        "available": True,
        "isAvailable": True,
        "image": "https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?w=600&auto=format&fit=crop&q=80",
        "imageUrl": "https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?w=600&auto=format&fit=crop&q=80",
        "description": "Crunchy chocolate chip cookies baked with real melted chocolate chips."
    },

    # --- 4. Drinks & Juices (8 items) ---
    {
        "_id": "dish-25",
        "name": "Red Bull Energy Drink (250ml Can)",
        "category": "Drinks & Juices",
        "price": 115,
        "type": "veg",
        "available": True,
        "isAvailable": True,
        "image": "https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=600&auto=format&fit=crop&q=80",
        "imageUrl": "https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=600&auto=format&fit=crop&q=80",
        "description": "Vitalizes body and mind during exam nights and intense college study sessions."
    },
    {
        "_id": "dish-26",
        "name": "Sting Energy Drink (250ml)",
        "category": "Drinks & Juices",
        "price": 20,
        "type": "veg",
        "available": True,
        "isAvailable": True,
        "image": "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=600&auto=format&fit=crop&q=80",
        "imageUrl": "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=600&auto=format&fit=crop&q=80",
        "description": "Sweet fizzy energy drink with caffeine and B-vitamins for instant campus boost."
    },
    {
        "_id": "dish-27",
        "name": "Coca-Cola Chilled Can (300ml)",
        "category": "Drinks & Juices",
        "price": 40,
        "type": "veg",
        "available": True,
        "isAvailable": True,
        "image": "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=600&auto=format&fit=crop&q=80",
        "imageUrl": "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=600&auto=format&fit=crop&q=80",
        "description": "Crisp and refreshing cold carbonated cola, served chilled."
    },
    {
        "_id": "dish-28",
        "name": "Thums Up Charged Can (300ml)",
        "category": "Drinks & Juices",
        "price": 40,
        "type": "veg",
        "available": True,
        "isAvailable": True,
        "image": "https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=600&auto=format&fit=crop&q=80",
        "imageUrl": "https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=600&auto=format&fit=crop&q=80",
        "description": "Strong fizzy spicy cola taste with an extra punch of refreshment."
    },
    {
        "_id": "dish-29",
        "name": "Sprite Lemon Lime Can (300ml)",
        "category": "Drinks & Juices",
        "price": 40,
        "type": "veg",
        "available": True,
        "isAvailable": True,
        "image": "https://images.unsplash.com/photo-1625772299848-391b6a87d7b3?w=600&auto=format&fit=crop&q=80",
        "imageUrl": "https://images.unsplash.com/photo-1625772299848-391b6a87d7b3?w=600&auto=format&fit=crop&q=80",
        "description": "Clear sparkling lemon-lime flavored beverage to beat the summer afternoon heat."
    },
    {
        "_id": "dish-30",
        "name": "Frooti Fresh Mango Drink (200ml)",
        "category": "Drinks & Juices",
        "price": 20,
        "type": "veg",
        "available": True,
        "isAvailable": True,
        "image": "https://images.unsplash.com/photo-1546173159-315724a31696?w=600&auto=format&fit=crop&q=80",
        "imageUrl": "https://images.unsplash.com/photo-1546173159-315724a31696?w=600&auto=format&fit=crop&q=80",
        "description": "Sweet refreshing real mango pulp juice packed in easy-to-sip tetra pack."
    },
    {
        "_id": "dish-31",
        "name": "Real Mixed Fruit Juice (200ml)",
        "category": "Drinks & Juices",
        "price": 30,
        "type": "veg",
        "available": True,
        "isAvailable": True,
        "image": "https://images.unsplash.com/photo-1613478223719-2ab802602423?w=600&auto=format&fit=crop&q=80",
        "imageUrl": "https://images.unsplash.com/photo-1613478223719-2ab802602423?w=600&auto=format&fit=crop&q=80",
        "description": "Delicious blend of 9 natural fruits loaded with vitamin C."
    },
    {
        "_id": "dish-32",
        "name": "Cold Coffee with Chocolate Ice Cream",
        "category": "Drinks & Juices",
        "price": 50,
        "type": "veg",
        "available": True,
        "isAvailable": True,
        "image": "https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?w=600&auto=format&fit=crop&q=80",
        "imageUrl": "https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?w=600&auto=format&fit=crop&q=80",
        "description": "Creamy blended milk coffee topped with Hershey's syrup and chocolate ice cream scoop."
    },

    # --- 5. Stationery & Study Supplies (8 items) ---
    {
        "_id": "dish-33",
        "name": "Classmate Long Spiral Register (300 Pages)",
        "category": "Stationery",
        "price": 65,
        "type": "veg",
        "available": True,
        "isAvailable": True,
        "image": "https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?w=600&auto=format&fit=crop&q=80",
        "imageUrl": "https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?w=600&auto=format&fit=crop&q=80",
        "description": "High-quality bright white smooth ruled pages, ideal for semester notes and lecture notes."
    },
    {
        "_id": "dish-34",
        "name": "Classmate Ruled Notebook (180 Pages)",
        "category": "Stationery",
        "price": 45,
        "type": "veg",
        "available": True,
        "isAvailable": True,
        "image": "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&auto=format&fit=crop&q=80",
        "imageUrl": "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&auto=format&fit=crop&q=80",
        "description": "Standard size soft bound ruled notebook for daily class work and tutorials."
    },
    {
        "_id": "dish-35",
        "name": "Reynolds Blue & Black Gel Pen Set (2 Pcs)",
        "category": "Stationery",
        "price": 20,
        "type": "veg",
        "available": True,
        "isAvailable": True,
        "image": "https://images.unsplash.com/photo-1585336261026-7f576d338f0d?w=600&auto=format&fit=crop&q=80",
        "imageUrl": "https://images.unsplash.com/photo-1585336261026-7f576d338f0d?w=600&auto=format&fit=crop&q=80",
        "description": "Smooth waterproof fast-drying gel ink pens with comfortable grip for fast exam writing."
    },
    {
        "_id": "dish-36",
        "name": "Hauser XO Extra Dark Ball Pens (Pack of 5)",
        "category": "Stationery",
        "price": 50,
        "type": "veg",
        "available": True,
        "isAvailable": True,
        "image": "https://images.unsplash.com/photo-1569683795645-b62e50fbf103?w=600&auto=format&fit=crop&q=80",
        "imageUrl": "https://images.unsplash.com/photo-1569683795645-b62e50fbf103?w=600&auto=format&fit=crop&q=80",
        "description": "German technology ultra-fluid ink ball pens for effortless non-smudge notes."
    },
    {
        "_id": "dish-37",
        "name": "Faber-Castell Pastel Highlighters (Set of 4)",
        "category": "Stationery",
        "price": 90,
        "type": "veg",
        "available": True,
        "isAvailable": True,
        "image": "https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=600&auto=format&fit=crop&q=80",
        "imageUrl": "https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=600&auto=format&fit=crop&q=80",
        "description": "Soft pastel textliner markers (yellow, mint, pink, lavender) for highlighting textbook concepts."
    },
    {
        "_id": "dish-38",
        "name": "College Practical Assignment File Folder",
        "category": "Stationery",
        "price": 25,
        "type": "veg",
        "available": True,
        "isAvailable": True,
        "image": "https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=600&auto=format&fit=crop&q=80",
        "imageUrl": "https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=600&auto=format&fit=crop&q=80",
        "description": "Durable clip folder for submitting BCA lab practical files and university assignments."
    },
    {
        "_id": "dish-39",
        "name": "Kangaro Mini Stapler with Pin Box",
        "category": "Stationery",
        "price": 45,
        "type": "veg",
        "available": True,
        "isAvailable": True,
        "image": "https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=600&auto=format&fit=crop&q=80",
        "imageUrl": "https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=600&auto=format&fit=crop&q=80",
        "description": "Compact handy metal stapler with 1000 No.10 staple pins for exam sheets."
    },
    {
        "_id": "dish-40",
        "name": "A4 Bond Printing Sheets (Pack of 100)",
        "category": "Stationery",
        "price": 60,
        "type": "veg",
        "available": True,
        "isAvailable": True,
        "image": "https://images.unsplash.com/photo-1589829085413-56de8ae18c73?w=600&auto=format&fit=crop&q=80",
        "imageUrl": "https://images.unsplash.com/photo-1589829085413-56de8ae18c73?w=600&auto=format&fit=crop&q=80",
        "description": "75 GSM bright white laser print papers for project synopsis and thesis printouts."
    },

    # --- 6. Hostel & Daily Essentials (8 items) ---
    {
        "_id": "dish-41",
        "name": "Dettol Pocket Hand Sanitizer (50ml)",
        "category": "Hostel Essentials",
        "price": 25,
        "type": "veg",
        "available": True,
        "isAvailable": True,
        "image": "https://images.unsplash.com/photo-1584744982491-665216d95f8b?w=600&auto=format&fit=crop&q=80",
        "imageUrl": "https://images.unsplash.com/photo-1584744982491-665216d95f8b?w=600&auto=format&fit=crop&q=80",
        "description": "Instant 99.9% germ protection rinse-free sanitizer with refreshing fragrance."
    },
    {
        "_id": "dish-42",
        "name": "Dettol Original Bathing Soap (75g)",
        "category": "Hostel Essentials",
        "price": 35,
        "type": "veg",
        "available": True,
        "isAvailable": True,
        "image": "https://images.unsplash.com/photo-1607006314649-411a0ea47f55?w=600&auto=format&fit=crop&q=80",
        "imageUrl": "https://images.unsplash.com/photo-1607006314649-411a0ea47f55?w=600&auto=format&fit=crop&q=80",
        "description": "Antibacterial daily hygiene bathing bar providing 100% better germ defense."
    },
    {
        "_id": "dish-43",
        "name": "Head & Shoulders Shampoo (80ml)",
        "category": "Hostel Essentials",
        "price": 75,
        "type": "veg",
        "available": True,
        "isAvailable": True,
        "image": "https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?w=600&auto=format&fit=crop&q=80",
        "imageUrl": "https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?w=600&auto=format&fit=crop&q=80",
        "description": "Cool menthol anti-dandruff shampoo for clean, fresh and oil-free hair."
    },
    {
        "_id": "dish-44",
        "name": "Colgate MaxFresh Toothpaste & Brush Combo",
        "category": "Hostel Essentials",
        "price": 65,
        "type": "veg",
        "available": True,
        "isAvailable": True,
        "image": "https://images.unsplash.com/photo-1559591937-e1610e7b8c3d?w=600&auto=format&fit=crop&q=80",
        "imageUrl": "https://images.unsplash.com/photo-1559591937-e1610e7b8c3d?w=600&auto=format&fit=crop&q=80",
        "description": "Spicy fresh red gel toothpaste (80g) with cooling crystals + flexible soft toothbrush."
    },
    {
        "_id": "dish-45",
        "name": "Fogg Scent / Body Spray (120ml)",
        "category": "Hostel Essentials",
        "price": 150,
        "type": "veg",
        "available": True,
        "isAvailable": True,
        "image": "https://images.unsplash.com/photo-1594035910387-fea47794261f?w=600&auto=format&fit=crop&q=80",
        "imageUrl": "https://images.unsplash.com/photo-1594035910387-fea47794261f?w=600&auto=format&fit=crop&q=80",
        "description": "Long lasting no-gas deodorant spray for all-day freshness during campus classes."
    },
    {
        "_id": "dish-46",
        "name": "Wild Stone Pocket Perfume (18ml)",
        "category": "Hostel Essentials",
        "price": 60,
        "type": "veg",
        "available": True,
        "isAvailable": True,
        "image": "https://images.unsplash.com/photo-1523293182086-7651a899d37f?w=600&auto=format&fit=crop&q=80",
        "imageUrl": "https://images.unsplash.com/photo-1523293182086-7651a899d37f?w=600&auto=format&fit=crop&q=80",
        "description": "250+ sprays compact pocket fragrance that fits easily into college pockets."
    },
    {
        "_id": "dish-47",
        "name": "Soft Pocket Facial Tissues (Pack of 3)",
        "category": "Hostel Essentials",
        "price": 20,
        "type": "veg",
        "available": True,
        "isAvailable": True,
        "image": "https://images.unsplash.com/photo-1583947215259-38e31be8751f?w=600&auto=format&fit=crop&q=80",
        "imageUrl": "https://images.unsplash.com/photo-1583947215259-38e31be8751f?w=600&auto=format&fit=crop&q=80",
        "description": "Extra soft 2-ply facial paper tissues for college bags and quick cleanups."
    },
    {
        "_id": "dish-48",
        "name": "Hansaplast Washproof Band-Aids (Pack of 10)",
        "category": "Hostel Essentials",
        "price": 25,
        "type": "veg",
        "available": True,
        "isAvailable": True,
        "image": "https://images.unsplash.com/photo-1603398938378-e54eab446dde?w=600&auto=format&fit=crop&q=80",
        "imageUrl": "https://images.unsplash.com/photo-1603398938378-e54eab446dde?w=600&auto=format&fit=crop&q=80",
        "description": "Waterproof antiseptic medicated wound plaster for minor paper cuts & scrapes."
    }
]

def init_db_defaults():
    # 1. Create Default Admin if none exists
    admin_user = db.users.find_one({"email": "admin@canteen.edu"})
    if not admin_user:
        db.users.insert_one({
            "_id": "admin-1",
            "uid": "admin-1",
            "name": "Canteen Admin",
            "email": "admin@canteen.edu",
            "password": hash_password("admin123"),
            "rollNo": "ADMIN-01",
            "department": "Canteen Management",
            "phone": "9876543210",
            "role": "admin",
            "createdAt": datetime.now().isoformat()
        })
        print("[OK] Default Admin created: admin@canteen.edu / admin123")

    # 2. Seed Initial Dishes if foodItems is empty
    if db.foodItems.count_documents({}) == 0:
        for dish in SAMPLE_DISHES:
            dish_copy = dict(dish)
            dish_copy["createdAt"] = datetime.now().isoformat()
            db.foodItems.insert_one(dish_copy)
        print(f"[OK] Seeded {len(SAMPLE_DISHES)} default canteen food items into MongoDB database.")

init_db_defaults()

# ------------------------------------------------------------------------------
# 3. AUTHENTICATION REST API
# ------------------------------------------------------------------------------

@app.route("/api/auth/register", methods=["POST"])
def register():
    data = request.json or {}
    name = data.get("name", "").strip()
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")
    rollNo = data.get("rollNo", "").strip()
    department = data.get("department", "BCA").strip()
    phone = data.get("phone", "").strip()

    if not name or not email or not password:
        return jsonify({"success": False, "message": "Name, email, and password are required."}), 400

    existing = db.users.find_one({"email": email})
    if existing:
        return jsonify({"success": False, "message": "This email is already registered. Please log in."}), 400

    # Check if user is applying for staff permission
    apply_for_staff = data.get("applyForStaff", False) or (data.get("role") == "pending_admin")
    role = "pending_admin" if apply_for_staff else "student"
    staff_designation = data.get("staffDesignation", "Counter / Kitchen Staff").strip() if apply_for_staff else None

    user_id = str(uuid.uuid4())
    user_doc = {
        "_id": user_id,
        "uid": user_id,
        "name": name,
        "email": email,
        "password": hash_password(password),
        "rollNo": rollNo,
        "department": department,
        "phone": phone,
        "role": role,
        "staffDesignation": staff_designation,
        "createdAt": datetime.now().isoformat()
    }
    db.users.insert_one(user_doc)

    user_safe = format_doc(user_doc)
    del user_safe["password"]

    msg = "Staff Admin request submitted! It is pending approval by Super Admin Deepak." if apply_for_staff else "Account created successfully!"
    return jsonify({"success": True, "message": msg, "user": user_safe}), 201


@app.route("/api/auth/login", methods=["POST"])
def login():
    data = request.json or {}
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")

    if not email or not password:
        return jsonify({"success": False, "message": "Email and password are required."}), 400

    user = db.users.find_one({"email": email})
    if not user or user.get("password") != hash_password(password):
        return jsonify({"success": False, "message": "Invalid email or password."}), 401

    user_safe = format_doc(user)
    if "password" in user_safe:
        del user_safe["password"]

    return jsonify({"success": True, "message": "Login successful!", "user": user_safe}), 200


# ------------------------------------------------------------------------------
# 4. FOOD MENU (CRUD) REST API
# ------------------------------------------------------------------------------

@app.route("/api/menu", methods=["GET"])
def get_menu():
    items = [format_doc(item) for item in db.foodItems.find({})]
    return jsonify({"success": True, "items": items}), 200


@app.route("/api/menu", methods=["POST"])
def add_food_item():
    data = request.json or {}
    name = data.get("name", "").strip()
    price = data.get("price", 0)
    category = data.get("category", "Breakfast")
    item_type = data.get("type", "veg")
    image = data.get("image") or data.get("imageUrl") or "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop&q=80"
    description = data.get("description", "")
    available = data.get("available", True)

    if not name or price <= 0:
        return jsonify({"success": False, "message": "Valid name and price are required."}), 400

    item_doc = {
        "_id": str(uuid.uuid4()),
        "name": name,
        "price": float(price),
        "category": category,
        "type": item_type,
        "image": image,
        "imageUrl": image,
        "description": description,
        "available": bool(available),
        "isAvailable": bool(available),
        "createdAt": datetime.now().isoformat()
    }
    db.foodItems.insert_one(item_doc)
    return jsonify({"success": True, "message": "Food item added successfully!", "item": format_doc(item_doc)}), 201


@app.route("/api/menu/<item_id>", methods=["PUT"])
def update_food_item(item_id):
    data = request.json or {}
    update_data = {}
    
    for key in ["name", "price", "category", "type", "description", "available", "isAvailable"]:
        if key in data:
            update_data[key] = data[key]
    
    if "image" in data or "imageUrl" in data:
        img = data.get("image") or data.get("imageUrl")
        update_data["image"] = img
        update_data["imageUrl"] = img

    if "available" in data:
        update_data["isAvailable"] = data["available"]
    if "isAvailable" in data:
        update_data["available"] = data["isAvailable"]

    update_data["updatedAt"] = datetime.now().isoformat()

    db.foodItems.update_one({"_id": item_id}, {"$set": update_data})
    return jsonify({"success": True, "message": "Food item updated successfully!"}), 200


@app.route("/api/menu/<item_id>", methods=["DELETE"])
def delete_food_item(item_id):
    db.foodItems.delete_one({"_id": item_id})
    return jsonify({"success": True, "message": "Food item deleted successfully!"}), 200


@app.route("/api/menu/seed", methods=["POST"])
def seed_menu():
    for dish in SAMPLE_DISHES:
        existing = db.foodItems.find_one({"name": dish["name"]})
        if not existing:
            dish_copy = dict(dish)
            dish_copy["_id"] = str(uuid.uuid4())
            dish_copy["createdAt"] = datetime.now().isoformat()
            db.foodItems.insert_one(dish_copy)
    return jsonify({"success": True, "message": "10+ Sample dishes seeded successfully into MongoDB!"}), 200


# ------------------------------------------------------------------------------
# 5. ORDERS REST API
# ------------------------------------------------------------------------------

@app.route("/api/orders", methods=["POST"])
def create_order():
    data = request.json or {}
    items = data.get("items", [])
    user_id = data.get("userId")

    if not items or not user_id:
        return jsonify({"success": False, "message": "Items and user ID are required."}), 400

    order_id = data.get("orderId") or f"ORD-{int(datetime.now().timestamp() * 1000) % 900000 + 100000}"
    subtotal = float(data.get("subtotal", 0))
    packaging_fee = float(data.get("packagingFee", 5))
    total_amount = float(data.get("totalAmount", subtotal + packaging_fee))

    order_doc = {
        "_id": str(uuid.uuid4()),
        "orderId": order_id,
        "userId": user_id,
        "customerName": data.get("customerName") or data.get("studentName", "Student"),
        "customerEmail": data.get("customerEmail") or data.get("studentEmail", ""),
        "studentName": data.get("customerName") or data.get("studentName", "Student"),
        "studentRoll": data.get("studentRoll", "N/A"),
        "studentDept": data.get("studentDept", "N/A"),
        "studentPhone": data.get("studentPhone", "N/A"),
        "studentEmail": data.get("customerEmail") or data.get("studentEmail", ""),
        "items": items,
        "subtotal": subtotal,
        "packagingFee": packaging_fee,
        "totalAmount": total_amount,
        "pickupSlot": data.get("pickupSlot", "Immediate"),
        "specialNotes": data.get("specialNotes", ""),
        "paymentMethod": data.get("paymentMethod", "Pay on Pickup Counter"),
        "paymentStatus": "Pending",
        "status": "Pending", # Pending -> Preparing -> Ready -> Completed -> Cancelled
        "createdAt": datetime.now().isoformat(),
        "updatedAt": datetime.now().isoformat()
    }

    db.orders.insert_one(order_doc)
    return jsonify({"success": True, "message": "Pre-order placed successfully!", "order": format_doc(order_doc)}), 201


@app.route("/api/orders", methods=["GET"])
def get_orders():
    user_id = request.args.get("userId")
    query = {"userId": user_id} if user_id else {}
    orders = [format_doc(order) for order in db.orders.find(query)]
    
    # Sort by createdAt descending
    orders.sort(key=lambda x: x.get("createdAt", ""), reverse=True)
    return jsonify({"success": True, "orders": orders}), 200


@app.route("/api/orders/<order_id>/status", methods=["PUT"])
def update_order_status(order_id):
    data = request.json or {}
    new_status = data.get("status")
    
    if not new_status:
        return jsonify({"success": False, "message": "Status is required."}), 400

    # Search by _id or orderId
    order = db.orders.find_one({"_id": order_id}) or db.orders.find_one({"orderId": order_id})
    if not order:
        return jsonify({"success": False, "message": "Order not found."}), 404

    target_id = order["_id"]
    db.orders.update_one({"_id": target_id}, {"$set": {"status": new_status, "updatedAt": datetime.now().isoformat()}})
    return jsonify({"success": True, "message": f"Order status updated to {new_status}!"}), 200


# ------------------------------------------------------------------------------
# 6. PROFILE & ADMIN STATS REST API
# ------------------------------------------------------------------------------

@app.route("/api/profile/<user_id>", methods=["GET"])
def get_profile(user_id):
    user = db.users.find_one({"_id": user_id}) or db.users.find_one({"uid": user_id})
    if not user:
        return jsonify({"success": False, "message": "User not found."}), 404
    
    user_safe = format_doc(user)
    if "password" in user_safe:
        del user_safe["password"]
    return jsonify({"success": True, "user": user_safe}), 200


@app.route("/api/profile/<user_id>", methods=["PUT"])
def update_profile(user_id):
    data = request.json or {}
    update_data = {}
    for key in ["name", "rollNo", "department", "phone"]:
        if key in data:
            update_data[key] = data[key]
    
    update_data["updatedAt"] = datetime.now().isoformat()
    db.users.update_one({"_id": user_id}, {"$set": update_data})
    return jsonify({"success": True, "message": "Profile updated successfully!"}), 200


@app.route("/api/admin/stats", methods=["GET"])
def get_admin_stats():
    all_orders = db.orders.find({})
    total_orders = len(all_orders)
    pending_count = sum(1 for o in all_orders if o.get("status") == "Pending")
    active_prep_count = sum(1 for o in all_orders if o.get("status") in ["Preparing", "Ready"])
    completed_count = sum(1 for o in all_orders if o.get("status") == "Completed")
    total_revenue = sum(float(o.get("totalAmount", 0)) for o in all_orders if o.get("status") == "Completed")
    total_items = db.foodItems.count_documents({})

    return jsonify({
        "success": True,
        "stats": {
            "totalOrders": total_orders,
            "pendingOrders": pending_count,
            "activePrep": active_prep_count,
            "completedOrders": completed_count,
            "totalRevenue": total_revenue,
            "totalFoodItems": total_items
        }
    }), 200


@app.route("/api/admin/staff", methods=["GET"])
def get_staff_list():
    all_users = [format_doc(u) for u in db.users.find({})]
    for u in all_users:
        if "password" in u:
            del u["password"]
    
    pending = [u for u in all_users if u.get("role") == "pending_admin"]
    active = [u for u in all_users if u.get("role") in ["admin", "superadmin"]]
    return jsonify({"success": True, "pendingStaff": pending, "activeStaff": active}), 200


@app.route("/api/admin/staff/<user_id>", methods=["PUT"])
def manage_staff(user_id):
    data = request.json or {}
    action = data.get("action", "").lower()
    
    user = db.users.find_one({"_id": user_id}) or db.users.find_one({"uid": user_id})
    if not user:
        return jsonify({"success": False, "message": "User not found."}), 404
    
    target_id = user["_id"]
    if action == "approve":
        db.users.update_one({"_id": target_id}, {"$set": {"role": "admin", "approvedAt": datetime.now().isoformat()}})
        return jsonify({"success": True, "message": f"Successfully approved {user.get('name')} as Canteen Admin!"}), 200
    elif action in ["reject", "revoke"]:
        db.users.update_one({"_id": target_id}, {"$set": {"role": "student", "staffDesignation": None, "revokedAt": datetime.now().isoformat()}})
        return jsonify({"success": True, "message": f"Access updated. {user.get('name')} is now a regular Student."}), 200
    else:
        return jsonify({"success": False, "message": "Invalid action."}), 400


# ------------------------------------------------------------------------------
# 7. STATIC FILES SERVING (HTML, CSS, JS)
# ------------------------------------------------------------------------------

@app.route("/")
def serve_index():
    return send_from_directory(".", "index.html")

@app.route("/<path:path>")
def serve_static(path):
    if os.path.exists(path):
        return send_from_directory(".", path)
    return send_from_directory(".", "index.html")

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    print("=" * 70)
    print("  [SERVER] Campus Mart - MongoDB Backend Server Running")
    print(f"  [SERVER] Local Web App URL: http://localhost:{port}/index.html")
    print(f"  [SERVER] Super Admin: deepaksharma74521@gmail.com / deepak123")
    print("=" * 70)
    app.run(host="0.0.0.0", port=port, debug=False)
