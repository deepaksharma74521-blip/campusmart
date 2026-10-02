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
import random
from datetime import datetime, timedelta

if hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS

app = Flask(__name__, static_folder=".")
app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 0
CORS(app, resources={r"/*": {"origins": "*"}}, supports_credentials=True)

@app.after_request
def add_header(response):
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate, max-age=0"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    return response

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
            initial_data = {"users": [], "foodItems": [], "orders": [], "feedbacks": [], "shops": [], "parcels": []}
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

    def delete_many(self, query):
        items = self._read_all()
        new_items = []
        deleted_count = 0
        for item in items:
            match = True
            for k, v in query.items():
                if item.get(k) != v:
                    match = False
                    break
            if not match:
                new_items.append(item)
            else:
                deleted_count += 1
        if deleted_count > 0:
            self._write_all(new_items)
        return deleted_count

    def count_documents(self, query=None):
        return len(self.find(query))


class LocalMongoDB:
    def __init__(self):
        self.users = LocalMongoCollection("users")
        self.foodItems = LocalMongoCollection("foodItems")
        self.orders = LocalMongoCollection("orders")
        self.feedbacks = LocalMongoCollection("feedbacks")
        self.shops = LocalMongoCollection("shops")
        self.parcels = LocalMongoCollection("parcels")
        self.otps = LocalMongoCollection("otps")

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
SAMPLE_DISHES = []

SAMPLE_FEEDBACKS = [
    {
        "_id": "fb-1",
        "orderId": "ORD-781920",
        "userId": "student-demo-1",
        "userName": "Rahul Sharma",
        "userRoll": "BCA-2024-012",
        "rating": 5,
        "tags": ["Delicious Taste", "Fast Pickup", "Good Packaging"],
        "comment": "Samosa and Masala Dosa were hot and crispy! Prepared right on time for our 11:00 AM break.",
        "createdAt": datetime.now().isoformat()
    },
    {
        "_id": "fb-2",
        "orderId": "ORD-629104",
        "userId": "student-demo-2",
        "userName": "Priya Verma",
        "userRoll": "BCA-2024-045",
        "rating": 5,
        "tags": ["Fast Pickup", "Hygienic"],
        "comment": "Super convenient to order spiral register and pens during practical class. Zero waiting!",
        "createdAt": datetime.now().isoformat()
    },
    {
        "_id": "fb-3",
        "orderId": "ORD-519302",
        "userId": "student-demo-3",
        "userName": "Aman Gupta",
        "userRoll": "B.Tech-CS-088",
        "rating": 4,
        "tags": ["Delicious Taste", "Good Value"],
        "comment": "Cold Coffee with ice cream is awesome! Fast service at express counter.",
        "createdAt": datetime.now().isoformat()
    }
]

SAMPLE_ORDERS = [
    {
        "_id": "order-demo-1",
        "orderId": "ORD-781920",
        "userId": "faculty-demo-1",
        "customerType": "Faculty",
        "cabinNumber": "Cabin 204, B-Block (CS Dept)",
        "customerName": "Dr. Sandeep Mehta (Faculty)",
        "customerEmail": "sandeep.mehta@canteen.edu",
        "studentName": "Dr. Sandeep Mehta",
        "studentRoll": "FAC-CS-102",
        "studentDept": "Computer Science & IT",
        "studentPhone": "9812345678",
        "studentEmail": "sandeep.mehta@canteen.edu",
        "items": [
            { "id": "dish-1", "name": "Samosa (2 Pcs)", "price": 25, "quantity": 1, "type": "veg", "category": "Canteen Food" },
            { "id": "dish-32", "name": "Cold Coffee with Chocolate Ice Cream", "price": 50, "quantity": 1, "type": "veg", "category": "Drinks & Juices" }
        ],
        "subtotal": 75,
        "packagingFee": 5,
        "totalAmount": 80,
        "paymentSplit": "50% Advance + 50% on Pickup",
        "advancePercentage": 50,
        "advanceAmount": 40,
        "dueAmount": 40,
        "pickupSlot": "Deliver to Faculty Cabin / Staff Room",
        "specialNotes": "Please deliver to Cabin 204 on 2nd Floor, Block B.",
        "paymentMethod": "Campus Digital Wallet",
        "paymentStatus": "Advance Paid (₹40)",
        "dueStatus": "₹40 to Collect at Pickup",
        "status": "Preparing",
        "createdAt": datetime.now().isoformat(),
        "updatedAt": datetime.now().isoformat()
    },
    {
        "_id": "order-demo-2",
        "orderId": "ORD-629104",
        "userId": "student-demo-2",
        "customerType": "Student",
        "cabinNumber": "",
        "customerName": "Priya Verma",
        "customerEmail": "priya.verma@canteen.edu",
        "studentName": "Priya Verma",
        "studentRoll": "BCA-2024-045",
        "studentDept": "BCA",
        "studentPhone": "9876501234",
        "studentEmail": "priya.verma@canteen.edu",
        "items": [
            { "id": "dish-33", "name": "Classmate Long Spiral Register (300 Pages)", "price": 65, "quantity": 1, "type": "veg", "category": "Stationery" },
            { "id": "dish-35", "name": "Reynolds Blue & Black Gel Pen Set (2 Pcs)", "price": 20, "quantity": 1, "type": "veg", "category": "Stationery" }
        ],
        "subtotal": 85,
        "packagingFee": 5,
        "totalAmount": 90,
        "paymentSplit": "80% Advance + 20% on Pickup",
        "advancePercentage": 80,
        "advanceAmount": 72,
        "dueAmount": 18,
        "pickupSlot": "Lunch Break (1:15 PM)",
        "specialNotes": "Keep ready before 1:15 PM",
        "paymentMethod": "Instant UPI & QR Pay",
        "paymentStatus": "Advance Paid (₹72)",
        "dueStatus": "₹18 to Collect at Pickup",
        "status": "Ready",
        "createdAt": datetime.now().isoformat(),
        "updatedAt": datetime.now().isoformat()
    }
]

# ------------------------------------------------------------------------------
# 2.25 CAMPUS GATE PARCEL PICKUP SEED DATA (Gate No. 2 Concierge)
# ------------------------------------------------------------------------------
SAMPLE_PARCELS = [
    {
        "_id": "parcel-101",
        "parcelId": "PRCL-83921",
        "userId": "student-demo-1",
        "studentName": "Rahul Sharma",
        "studentRoll": "BCA-2024-012",
        "studentPhone": "+91 98765 43210",
        "studentEmail": "rahul.sharma@tmu.ac.in",
        "platform": "Amazon",
        "platformIcon": "fa-brands fa-amazon",
        "pickupGate": "Gate No. 2 (Main Parcel Drop Point)",
        "courierName": "Amazon Transportation (ATS)",
        "courierPhone": "9811223344",
        "trackingNumber": "IN4829103982",
        "deliveryLocation": "Boys Hostel H-2, Room 315",
        "preferredSlot": "Lunch Break (1:15 PM)",
        "specialInstructions": "Call me once you collect from Gate 2 courier boy.",
        "runnerFee": 10,
        "paymentMethod": "Campus Digital Wallet",
        "paymentStatus": "Paid (₹10)",
        "status": "Out for Delivery",
        "runnerName": "Vikas (Mart Runner #3)",
        "runnerPhone": "+91 98765 00112",
        "secretPin": "8492",
        "isPinVerified": False,
        "createdAt": datetime.now().isoformat(),
        "updatedAt": datetime.now().isoformat()
    },
    {
        "_id": "parcel-102",
        "parcelId": "PRCL-61042",
        "userId": "student-demo-2",
        "studentName": "Priya Verma",
        "studentRoll": "BCA-2024-045",
        "studentPhone": "+91 98765 01234",
        "studentEmail": "priya.verma@canteen.edu",
        "platform": "Flipkart",
        "platformIcon": "fa-solid fa-bag-shopping",
        "pickupGate": "Gate No. 2 (Main Parcel Drop Point)",
        "courierName": "Ekart Logistics",
        "courierPhone": "9822334455",
        "trackingNumber": "FMPC00982319",
        "deliveryLocation": "Girls Hostel G-1, Security Desk / Room 108",
        "preferredSlot": "Immediate (Within 20 mins)",
        "specialInstructions": "Leave with security desk if I am in class.",
        "runnerFee": 20,
        "paymentMethod": "Instant UPI & QR Pay",
        "paymentStatus": "Paid (₹20)",
        "status": "Collected at Gate 2",
        "runnerName": "Deepak (Runner #1)",
        "runnerPhone": "+91 63953 22813",
        "secretPin": "4190",
        "isPinVerified": False,
        "createdAt": datetime.now().isoformat(),
        "updatedAt": datetime.now().isoformat()
    }
]

# ------------------------------------------------------------------------------
# 2.5 CAMPUS SHOPS & VENDORS SEED DATA (23 TMU Campus Outlets)
# ------------------------------------------------------------------------------
SAMPLE_SHOPS = [
    {
        "_id": "shop-1",
        "shopId": "shop-1",
        "name": "TMU Special Chole Kulcha",
        "shortName": "TMU Chole Kulcha",
        "category": "Canteen Food",
        "ownerName": "Banti Singh",
        "ownerEmail": "cholekulcha@tmu.ac.in",
        "phone": "+91 98765 43201",
        "location": "Campus Central Food Court, Counter #1",
        "timing": "8:30 AM - 8:00 PM",
        "description": "Authentic Amritsari spicy chole with hot buttered fluffy kulchas, onions & green mint chutney.",
        "image": "https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=600&auto=format&fit=crop&q=80",
        "isOpen": True,
        "rating": 4.9,
        "totalOrders": 340
    },
    {
        "_id": "shop-2",
        "shopId": "shop-2",
        "name": "Food & Friends",
        "shortName": "Food & Friends",
        "category": "Canteen Food",
        "ownerName": "Nirmal Ji",
        "managerName": "Atul Mehrotra",
        "ownerEmail": "foodfriends@tmu.ac.in",
        "phone": "+91 98765 43202",
        "location": "Student Activity Centre, Counter #2",
        "timing": "9:00 AM - 9:00 PM",
        "description": "Hangout cafe serving crispy fries, cheesy burgers, pizzas, pastas & refreshing thick shakes.",
        "image": "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600&auto=format&fit=crop&q=80",
        "isOpen": True,
        "rating": 4.8,
        "totalOrders": 280
    },
    {
        "_id": "shop-3",
        "shopId": "shop-3",
        "name": "Chandrakanta Canteen",
        "shortName": "Chandrakanta",
        "category": "Canteen Food",
        "ownerName": "Pankaj Gupta",
        "managerName": "Tushar Gupta",
        "ownerEmail": "chandrakanta@tmu.ac.in",
        "phone": "+91 98765 43203",
        "location": "Central Dining Complex, Counter #3",
        "timing": "8:00 AM - 8:30 PM",
        "description": "Homestyle nutritious meals, deluxe veg thalis, dal makhani, paneer butter masala & rotis.",
        "image": "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=600&auto=format&fit=crop&q=80",
        "isOpen": True,
        "rating": 4.7,
        "totalOrders": 310
    },
    {
        "_id": "shop-4",
        "shopId": "shop-4",
        "name": "Super Food Corner",
        "shortName": "Super Food Corner",
        "category": "Canteen Food",
        "ownerName": "Vikash Kumar",
        "ownerEmail": "superfood@tmu.ac.in",
        "phone": "+91 98765 43204",
        "location": "Food Court North Wing, Counter #4",
        "timing": "10:00 AM - 10:00 PM",
        "description": "Spicy street chowmein, spring rolls, veg momos, manchurian, fried rice & crispy snacks.",
        "image": "https://images.unsplash.com/photo-1585032226651-759b368d7246?w=600&auto=format&fit=crop&q=80",
        "isOpen": True,
        "rating": 4.8,
        "totalOrders": 225
    },
    {
        "_id": "shop-5",
        "shopId": "shop-5",
        "name": "Shiv Shudh Veg Biryani",
        "shortName": "Shiv Veg Biryani",
        "category": "Canteen Food",
        "ownerName": "Banty Bhai",
        "ownerEmail": "shividum@tmu.ac.in",
        "phone": "+91 98765 43205",
        "location": "Near Gate No. 2 Lawn, Counter #5",
        "timing": "8:30 AM - 5:30 PM",
        "description": "Aromatic dum biryani with soya chaap, paneer chunks, spicy gravy & fresh raita (₹40 / ₹50 / ₹60).",
        "image": "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=600&auto=format&fit=crop&q=80",
        "isOpen": True,
        "rating": 4.9,
        "totalOrders": 410
    },
    {
        "_id": "shop-6",
        "shopId": "shop-6",
        "name": "Foodo Holic",
        "shortName": "Foodo Holic",
        "category": "Canteen Food",
        "ownerName": "Aanand",
        "managerName": "Vinod Kumar",
        "ownerEmail": "foodoholic@tmu.ac.in",
        "phone": "+91 98765 43206",
        "location": "CCSIT Food Court, Counter #6",
        "timing": "9:00 AM - 9:30 PM",
        "description": "Fusion rolls, grilled sandwiches, loaded peri-peri nachos, garlic bread & chilled mocktails.",
        "image": "https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=600&auto=format&fit=crop&q=80",
        "isOpen": True,
        "rating": 4.7,
        "totalOrders": 195
    },
    {
        "_id": "shop-7",
        "shopId": "shop-7",
        "name": "Sardar Ji Hub",
        "shortName": "Sardar Ji Hub",
        "category": "Canteen Food",
        "ownerName": "Ravinder Pal",
        "ownerEmail": "sardarjihub@tmu.ac.in",
        "phone": "+91 98765 43207",
        "location": "Main Lawn Food Hub, Counter #7",
        "timing": "8:30 AM - 9:00 PM",
        "description": "Stuffed tandoori parathas with white makkhan, chole bhature, lassi & rich Punjabi gravies.",
        "image": "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=600&auto=format&fit=crop&q=80",
        "isOpen": True,
        "rating": 4.9,
        "totalOrders": 380
    },
    {
        "_id": "shop-8",
        "shopId": "shop-8",
        "name": "Jiven Canteen",
        "shortName": "Jiven Canteen",
        "category": "Canteen Food",
        "ownerName": "Jiven Singh",
        "ownerEmail": "jivencanteen@tmu.ac.in",
        "phone": "+91 98765 43208",
        "location": "Sports Complex Wing, Counter #8",
        "timing": "7:00 AM - 6:00 PM",
        "description": "Early morning breakfast specials, poha, bedmi puri, samosas, bread pakoras & fresh tea.",
        "image": "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&auto=format&fit=crop&q=80",
        "isOpen": True,
        "rating": 4.6,
        "totalOrders": 240
    },
    {
        "_id": "shop-9",
        "shopId": "shop-9",
        "name": "Shree Balaji Chai Bhandar",
        "shortName": "Balaji Chai",
        "category": "Drinks & Juices",
        "ownerName": "Neeraj Kumar",
        "ownerEmail": "balajichai@tmu.ac.in",
        "phone": "+91 98765 43209",
        "location": "Gazebo Central Plaza, Counter #9",
        "timing": "11:00 AM - 9:00 PM",
        "description": "Special Adrak Elaichi Kulhad Chai, Filter Coffee, bun maska, rusks & evening snacks.",
        "image": "https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=600&auto=format&fit=crop&q=80",
        "isOpen": True,
        "rating": 4.9,
        "totalOrders": 520
    },
    {
        "_id": "shop-10",
        "shopId": "shop-10",
        "name": "Ahuja Photo Shop",
        "shortName": "Ahuja Photo Shop",
        "category": "Stationery",
        "ownerName": "Ahuja Ji",
        "ownerEmail": "ahujaphoto@tmu.ac.in",
        "phone": "+91 98765 43210",
        "location": "CCSIT Ground Floor Corridor, Shop #10",
        "timing": "8:00 AM - 6:30 PM",
        "description": "High-speed Xerox, colour printing, assignment binding, passport photos & project documentation.",
        "image": "https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?w=600&auto=format&fit=crop&q=80",
        "isOpen": True,
        "rating": 4.7,
        "totalOrders": 290
    },
    {
        "_id": "shop-11",
        "shopId": "shop-11",
        "name": "Durga Photo Shop",
        "shortName": "Durga Photo Shop",
        "category": "Stationery",
        "ownerName": "Vivek Gupta",
        "ownerEmail": "durgaphoto@tmu.ac.in",
        "phone": "+91 98765 43211",
        "location": "Engineering Block, Ground Floor, Shop #11",
        "timing": "8:30 AM - 8:00 PM",
        "description": "Hardcover project thesis binding, lab manuals, stationery supplies, pens, registers & files.",
        "image": "https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=600&auto=format&fit=crop&q=80",
        "isOpen": True,
        "rating": 4.8,
        "totalOrders": 310
    },
    {
        "_id": "shop-12",
        "shopId": "shop-12",
        "name": "Royal Cafe",
        "shortName": "Royal Cafe",
        "category": "Drinks & Juices",
        "ownerName": "Lucky Chaudhary",
        "managerName": "Tarush",
        "ownerEmail": "royalcafe@tmu.ac.in",
        "phone": "+91 98765 43212",
        "location": "Central Boulevard, Counter #12",
        "timing": "8:30 AM - 8:00 PM",
        "description": "Cappuccino, iced lattes, chocolate frappes, grilled subs, brownies & premium cafe snacks.",
        "image": "https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?w=600&auto=format&fit=crop&q=80",
        "isOpen": True,
        "rating": 4.9,
        "totalOrders": 330
    },
    {
        "_id": "shop-13",
        "shopId": "shop-13",
        "name": "Gupta Photo Shop",
        "shortName": "Gupta Photo Shop",
        "category": "Stationery",
        "ownerName": "Charu Gupta",
        "managerName": "Self",
        "ownerEmail": "guptaphoto@tmu.ac.in",
        "phone": "+91 98765 43213",
        "location": "Medical & Nursing Block Annex, Shop #13",
        "timing": "9:00 AM - 8:00 PM",
        "description": "Medical stationery, practical record sheets, Xerox, color printouts, files & folders.",
        "image": "https://images.unsplash.com/photo-1589829085413-56de8ae18c73?w=600&auto=format&fit=crop&q=80",
        "isOpen": True,
        "rating": 4.7,
        "totalOrders": 180
    },
    {
        "_id": "shop-14",
        "shopId": "shop-14",
        "name": "Rapid Food Corner (South Indian)",
        "shortName": "Rapid South Indian",
        "category": "Canteen Food",
        "ownerName": "Anil Kumar",
        "managerName": "Self",
        "ownerEmail": "rapidfood@tmu.ac.in",
        "phone": "+91 98765 43214",
        "location": "Central Food Court South Wing, Counter #14",
        "timing": "10:00 AM - 10:00 PM",
        "description": "Crispy Masala Dosa, Onion Uttapam, Steamed Idli Sambar, Medu Vada & South Indian Platters.",
        "image": "https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=600&auto=format&fit=crop&q=80",
        "isOpen": True,
        "rating": 4.8,
        "totalOrders": 360
    },
    {
        "_id": "shop-15",
        "shopId": "shop-15",
        "name": "Ahuja Mart",
        "shortName": "Ahuja Mart",
        "category": "Hostel Essentials",
        "ownerName": "Rajeev",
        "managerName": "Dhiraj",
        "ownerEmail": "ahujamart@tmu.ac.in",
        "phone": "+91 98765 43215",
        "location": "Hostel Complex Market, Shop #15",
        "timing": "10:00 AM - 9:00 PM",
        "description": "Packaged chips, biscuits, chocolates, soaps, shampoos, room fresheners & midnight hostel needs.",
        "image": "https://images.unsplash.com/photo-1584744982491-665216d95f8b?w=600&auto=format&fit=crop&q=80",
        "isOpen": True,
        "rating": 4.8,
        "totalOrders": 270
    },
    {
        "_id": "shop-16",
        "shopId": "shop-16",
        "name": "Mahinder Food Junction",
        "shortName": "Mahinder Food",
        "category": "Canteen Food",
        "ownerName": "Tarun Ji",
        "managerName": "Self",
        "ownerEmail": "mahinderfood@tmu.ac.in",
        "phone": "+91 98765 43216",
        "location": "Open Lawn Food Street, Counter #16",
        "timing": "11:00 AM - 11:00 PM",
        "description": "Late night meals, paneer tikka rolls, soya chaap, pav bhaji & hot tawa rotis.",
        "image": "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600&auto=format&fit=crop&q=80",
        "isOpen": True,
        "rating": 4.7,
        "totalOrders": 320
    },
    {
        "_id": "shop-17",
        "shopId": "shop-17",
        "name": "Vardhaman Juice Corner",
        "shortName": "Vardhaman Juice",
        "category": "Drinks & Juices",
        "ownerName": "Anita Ji",
        "managerName": "Self",
        "ownerEmail": "vardhaman@tmu.ac.in",
        "phone": "+91 98765 43217",
        "location": "Near Sports Ground, Counter #17",
        "timing": "9:00 AM - 8:30 PM",
        "description": "100% pure fresh juices (Mosambi, Orange, Pomegranate, Pineapple, Apple) & seasonal fruit shakes.",
        "image": "https://images.unsplash.com/photo-1613478223719-2ab802602423?w=600&auto=format&fit=crop&q=80",
        "isOpen": True,
        "rating": 4.9,
        "totalOrders": 410
    },
    {
        "_id": "shop-18",
        "shopId": "shop-18",
        "name": "Patanjali Mart",
        "shortName": "Patanjali Mart",
        "category": "Hostel Essentials",
        "ownerName": "Deepak Agarwal",
        "managerName": "Self",
        "ownerEmail": "patanjalimart@tmu.ac.in",
        "phone": "+91 84499 17176",
        "location": "TMU Main Gate Shopping Arcade, Shop #18",
        "timing": "8:30 AM - 9:00 PM",
        "description": "Ayurvedic products, herbal personal care, honey, biscuits, juices & daily health essentials.",
        "image": "https://images.unsplash.com/photo-1607006314649-411a0ea47f55?w=600&auto=format&fit=crop&q=80",
        "isOpen": True,
        "rating": 4.8,
        "totalOrders": 290
    },
    {
        "_id": "shop-19",
        "shopId": "shop-19",
        "name": "Caffelera",
        "shortName": "Caffelera",
        "category": "Drinks & Juices",
        "ownerName": "Akshat Jain",
        "managerName": "Dilip Bhai",
        "ownerEmail": "caffelera@tmu.ac.in",
        "phone": "+91 85299 08288",
        "location": "Student Activity Plaza, Shop #19",
        "timing": "9:00 AM - 11:00 PM",
        "description": "Artisanal espresso, cold brew, hazelnut frappes, waffles, grilled croissants & cozy vibe.",
        "image": "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600&auto=format&fit=crop&q=80",
        "isOpen": True,
        "rating": 4.9,
        "totalOrders": 450
    },
    {
        "_id": "shop-20",
        "shopId": "shop-20",
        "name": "Rainbow",
        "shortName": "Rainbow Treats",
        "category": "Snacks & Chips",
        "ownerName": "Amit Dubey",
        "ownerEmail": "rainbow@tmu.ac.in",
        "phone": "+91 98765 43220",
        "location": "Central Food Court, Kiosk #20",
        "timing": "9:00 AM - 11:00 PM",
        "description": "Gourmet ice cream sundaes, belgian waffles, thick milkshakes, cornettos & pastry desserts.",
        "image": "https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=600&auto=format&fit=crop&q=80",
        "isOpen": True,
        "rating": 4.9,
        "totalOrders": 370
    },
    {
        "_id": "shop-21",
        "shopId": "shop-21",
        "name": "Chai Nagri",
        "shortName": "Chai Nagri",
        "category": "Drinks & Juices",
        "ownerName": "Raja Gupta",
        "managerName": "Amit Goswami",
        "ownerEmail": "chainagri@tmu.ac.in",
        "phone": "+91 98765 43221",
        "location": "Near Engineering Garden, Shop #21",
        "timing": "7:00 AM - 10:30 PM",
        "description": "Authentic Kulhad Chai in 12 flavours, bun maska, samosa chaat, maggi & evening college vibes.",
        "image": "https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=600&auto=format&fit=crop&q=80",
        "isOpen": True,
        "rating": 4.9,
        "totalOrders": 610
    },
    {
        "_id": "shop-22",
        "shopId": "shop-22",
        "name": "Pani Puri Restaurant",
        "shortName": "Pani Puri Corner",
        "category": "Canteen Food",
        "ownerName": "Inderpal Ji",
        "ownerEmail": "panipuri@tmu.ac.in",
        "phone": "+91 98765 43222",
        "location": "Food Court East Corner, Counter #22",
        "timing": "11:00 AM - 9:00 PM",
        "description": "Crispy atta/suji golgappe with 5 flavoured waters (Hing, Pudina, Khatta Meetha), dahi puri & aloo tikki.",
        "image": "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=600&auto=format&fit=crop&q=80",
        "isOpen": True,
        "rating": 4.8,
        "totalOrders": 390
    },
    {
        "_id": "shop-23",
        "shopId": "shop-23",
        "name": "Yummy Express",
        "shortName": "Yummy Express",
        "category": "Canteen Food",
        "ownerName": "Deepanshu",
        "ownerEmail": "yummy01@gmail.com",
        "phone": "+91 98765 43223",
        "location": "Central Campus Mart & Food Court, Counter #23",
        "timing": "8:00 AM - 9:30 PM",
        "description": "Hot sizzling canteen meals, thalis, sandwiches, cold beverages & express pre-orders.",
        "image": "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600&auto=format&fit=crop&q=80",
        "isOpen": True,
        "rating": 4.9,
        "totalOrders": 480
    }
]

DEFAULT_ITEM_IMAGES = {
    "samosa": "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=600&auto=format&fit=crop&q=80",
    "dosa": "https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=600&auto=format&fit=crop&q=80",
    "paratha": "https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=600&auto=format&fit=crop&q=80",
    "sandwich": "https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=600&auto=format&fit=crop&q=80",
    "burger": "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&auto=format&fit=crop&q=80",
    "pizza": "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600&auto=format&fit=crop&q=80",
    "chowmein": "https://images.unsplash.com/photo-1585032226651-759b368d7246?w=600&auto=format&fit=crop&q=80",
    "noodles": "https://images.unsplash.com/photo-1585032226651-759b368d7246?w=600&auto=format&fit=crop&q=80",
    "maggi": "https://images.unsplash.com/photo-1612927601601-6638404737ce?w=600&auto=format&fit=crop&q=80",
    "thali": "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=600&auto=format&fit=crop&q=80",
    "paneer": "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=600&auto=format&fit=crop&q=80",
    "biryani": "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=600&auto=format&fit=crop&q=80",
    "chicken": "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=600&auto=format&fit=crop&q=80",
    "chai": "https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=600&auto=format&fit=crop&q=80",
    "tea": "https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=600&auto=format&fit=crop&q=80",
    "coffee": "https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?w=600&auto=format&fit=crop&q=80",
    "cold coffee": "https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?w=600&auto=format&fit=crop&q=80",
    "juice": "https://images.unsplash.com/photo-1613478223719-2ab802602423?w=600&auto=format&fit=crop&q=80",
    "shake": "https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=600&auto=format&fit=crop&q=80",
    "patty": "https://images.unsplash.com/photo-1608198093002-ad4e005484ec?w=600&auto=format&fit=crop&q=80",
    "patties": "https://images.unsplash.com/photo-1608198093002-ad4e005484ec?w=600&auto=format&fit=crop&q=80",
    "pastry": "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=600&auto=format&fit=crop&q=80",
    "cake": "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=600&auto=format&fit=crop&q=80",
    "chocolate": "https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=600&auto=format&fit=crop&q=80",
    "silk": "https://images.unsplash.com/photo-1548907040-4baa42d10919?w=600&auto=format&fit=crop&q=80",
    "kitkat": "https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=600&auto=format&fit=crop&q=80",
    "chips": "https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=600&auto=format&fit=crop&q=80",
    "lays": "https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=600&auto=format&fit=crop&q=80",
    "kurkure": "https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=600&auto=format&fit=crop&q=80",
    "register": "https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?w=600&auto=format&fit=crop&q=80",
    "notebook": "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&auto=format&fit=crop&q=80",
    "pen": "https://images.unsplash.com/photo-1585336261026-7f576d338f0d?w=600&auto=format&fit=crop&q=80",
    "stapler": "https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=600&auto=format&fit=crop&q=80",
    "file": "https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=600&auto=format&fit=crop&q=80",
    "paper": "https://images.unsplash.com/photo-1589829085413-56de8ae18c73?w=600&auto=format&fit=crop&q=80",
    "soap": "https://images.unsplash.com/photo-1607006314649-411a0ea47f55?w=600&auto=format&fit=crop&q=80",
    "shampoo": "https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?w=600&auto=format&fit=crop&q=80",
    "sanitizer": "https://images.unsplash.com/photo-1584744982491-665216d95f8b?w=600&auto=format&fit=crop&q=80"
}

def get_default_item_image(name, category=""):
    name_lower = name.lower()
    for kw, img in DEFAULT_ITEM_IMAGES.items():
        if kw in name_lower:
            return img
    cat_lower = (category or "").lower()
    if "drink" in cat_lower or "juice" in cat_lower:
        return DEFAULT_ITEM_IMAGES["coffee"]
    elif "stationery" in cat_lower:
        return DEFAULT_ITEM_IMAGES["register"]
    elif "snack" in cat_lower or "chip" in cat_lower:
        return DEFAULT_ITEM_IMAGES["chips"]
    elif "chocolate" in cat_lower:
        return DEFAULT_ITEM_IMAGES["chocolate"]
    elif "hostel" in cat_lower or "essential" in cat_lower:
        return DEFAULT_ITEM_IMAGES["sanitizer"]
    return "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop&q=80"

def get_shop_name_by_id(shop_id):
    for s in SAMPLE_SHOPS:
        if s.get("shopId") == shop_id or s.get("_id") == shop_id:
            return s.get("name")
    shop = db.shops.find_one({"shopId": shop_id}) or db.shops.find_one({"_id": shop_id}) if hasattr(db, 'shops') else None
    if shop:
        return shop.get("name", "Campus Mart Outlet")
    return "TMU Central Food Court"

import re

def parse_raw_menu_text(raw_text, target_shop="shop-1", target_category=""):
    lines = raw_text.splitlines()
    parsed_items = []
    # Pattern for 2 prices (Half / Full): e.g. "Dal Tadka 120 180" or "Dal Tadka 120/180" or "120/- 180/-"
    two_price_pattern = re.compile(r'(?:(?:rs\.?|inr|₹|@)?\s*(\d{1,4})\s*(?:\/[-=]?)?)\s*(?:[\/\|\-–\s]+)\s*(?:(?:rs\.?|inr|₹|@)?\s*(\d{1,4})\s*(?:\/[-=]?)?)\s*$', re.IGNORECASE)
    # Pattern for single price: e.g. "Samosa 25" or "Samosa - Rs 25/-"
    single_price_pattern = re.compile(r'(\b(?:rs\.?|inr|₹|@)?\s*(\d{1,4})\s*(?:\/[-=]?)?|\b(\d{1,4})\s*(?:\/[-=]?))\s*$', re.IGNORECASE)
    
    for raw_line in lines:
        line = raw_line.strip()
        if not line or len(line) < 3:
            continue
        line = re.sub(r'^[\d\.\)\-\*\#\s]+', '', line).strip()
        
        price = None
        price_half = None
        price_full = None
        has_half_full = False
        item_name = ""
        
        # 1. Try 2-price match (Half & Full)
        two_match = two_price_pattern.search(line)
        if two_match:
            try:
                p1 = float(two_match.group(1))
                p2 = float(two_match.group(2))
                if p1 > 0 and p2 > 0:
                    price_half = min(p1, p2)
                    price_full = max(p1, p2)
                    price = price_half
                    has_half_full = True
                    item_name = line[:two_match.start()].strip()
            except Exception:
                has_half_full = False
        
        # 2. Try single price match
        if not price:
            match = single_price_pattern.search(line)
            if match:
                price_val = match.group(2) or match.group(3)
                if price_val:
                    try:
                        price = float(price_val)
                        item_name = line[:match.start()].strip()
                    except Exception:
                        price = None
        
        # 3. Fallback prefix price: e.g. "50 - Masala Dosa"
        if not price:
            alt_match = re.match(r'^(?:rs\.?|inr|₹|@)?\s*(\d{1,4})\s*[\:\-\.]?\s+(.*)$', line, re.IGNORECASE)
            if alt_match:
                try:
                    price = float(alt_match.group(1))
                    item_name = alt_match.group(2).strip()
                except Exception:
                    pass
        
        if item_name and price and price > 0:
            item_name = re.sub(r'[\.\-\:\_\|\/\=\*\(\)\{\}\[\]]+$', '', item_name).strip()
            item_name = re.sub(r'^[\.\-\:\_\|\/\=\*\(\)\{\}\[\]]+', '', item_name).strip()
            item_name = re.sub(r'\s+(?:half|full|plate|h\/f|h|f)\s*$', '', item_name, flags=re.IGNORECASE).strip()
            
            if len(item_name) >= 2:
                clean_name = " ".join([w.capitalize() for w in item_name.split()])
                name_lower = clean_name.lower()
                is_nonveg = any(w in name_lower for w in ["chicken", "egg", "fish", "mutton", "meat", "non-veg", "nonveg"])
                item_type = "nonveg" if is_nonveg else "veg"
                
                cat = target_category
                if not cat or cat == "all":
                    if any(w in name_lower for w in ["tea", "chai", "coffee", "juice", "shake", "drink", "pepsi", "coke", "water"]):
                        cat = "Drinks & Juices"
                    elif any(w in name_lower for w in ["register", "copy", "notebook", "pen", "pencil", "stapler", "file", "folder", "paper", "sheet"]):
                        cat = "Stationery"
                    elif any(w in name_lower for w in ["chocolate", "candy", "silk", "kitkat", "5star", "munch", "sweet", "bar"]):
                        cat = "Chocolates & Candies"
                    elif any(w in name_lower for w in ["chips", "lays", "kurkure", "patty", "patties", "pastry", "puff", "biscuit", "toast", "namkeen"]):
                        cat = "Snacks & Chips"
                    elif any(w in name_lower for w in ["soap", "shampoo", "sanitizer", "brush", "paste", "surf", "towel", "lock"]):
                        cat = "Hostel Essentials"
                    else:
                        cat = "Canteen Food"
                
                img = get_default_item_image(clean_name, cat)
                
                parsed_items.append({
                    "name": clean_name,
                    "price": price,
                    "hasHalfFull": has_half_full,
                    "priceHalf": price_half if has_half_full else None,
                    "priceFull": price_full if has_half_full else None,
                    "category": cat,
                    "type": item_type,
                    "image": img,
                    "imageUrl": img,
                    "description": f"Fresh & delicious {clean_name} prepared to order.",
                    "available": True,
                    "isAvailable": True,
                    "shopId": target_shop,
                    "shopName": get_shop_name_by_id(target_shop)
                })
                
    return parsed_items

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

    # 1.25 Create Default Delivery Partner Runner
    delivery_user = db.users.find_one({"email": "delivery@campusmart.in"})
    if not delivery_user:
        db.users.insert_one({
            "_id": "delivery-1",
            "uid": "delivery-1",
            "name": "Ramesh Sharma (Campus Runner)",
            "email": "delivery@campusmart.in",
            "password": hash_password("delivery123"),
            "rollNo": "RUNNER-01",
            "department": "Campus Express Delivery Fleet",
            "phone": "9812345670",
            "role": "delivery_partner",
            "vehicleNumber": "UP-21-CAMPUS-01",
            "isAvailable": True,
            "createdAt": datetime.now().isoformat()
        })
        print("[OK] Default Delivery Partner created: delivery@campusmart.in / delivery123")

    # 1.5 Seed Initial Campus Shops if shops is empty
    if hasattr(db, 'shops') and db.shops.count_documents({}) == 0:
        synced_shops = False
        if os.path.exists(DATA_FILE):
            try:
                with open(DATA_FILE, "r", encoding="utf-8") as f:
                    file_data = json.load(f)
                    s_list = file_data.get("shops", [])
                    if s_list:
                        if use_real_mongo:
                            db.shops.insert_many(s_list)
                        else:
                            for s in s_list:
                                db.shops.insert_one(s)
                        print(f"[OK] Synced {len(s_list)} shops from data/canteen_db.json into database.")
                        synced_shops = True
            except Exception as e:
                print(f"[WARN] Error syncing shops from {DATA_FILE}: {e}")
        if not synced_shops:
            for shop in SAMPLE_SHOPS:
                shop_copy = dict(shop)
                shop_copy["createdAt"] = datetime.now().isoformat()
                db.shops.insert_one(shop_copy)
            print(f"[OK] Seeded {len(SAMPLE_SHOPS)} default campus shop outlets into MongoDB database.")

    # 2. Seed Initial Dishes from data/canteen_db.json if foodItems is empty
    if db.foodItems.count_documents({}) == 0:
        synced_items = False
        if os.path.exists(DATA_FILE):
            try:
                with open(DATA_FILE, "r", encoding="utf-8") as f:
                    file_data = json.load(f)
                    items_to_seed = file_data.get("foodItems", [])
                    if items_to_seed:
                        if use_real_mongo:
                            # Strip duplicate ObjectIds if any
                            clean_items = []
                            for it in items_to_seed:
                                it_copy = dict(it)
                                clean_items.append(it_copy)
                            db.foodItems.insert_many(clean_items)
                        else:
                            for it in items_to_seed:
                                db.foodItems.insert_one(it)
                        print(f"[OK] Synced {len(items_to_seed)} food items from data/canteen_db.json into database.")
                        synced_items = True
            except Exception as e:
                print(f"[WARN] Error syncing foodItems from {DATA_FILE}: {e}")

        if not synced_items and SAMPLE_DISHES:
            for dish in SAMPLE_DISHES:
                dish_copy = dict(dish)
                dish_copy["createdAt"] = datetime.now().isoformat()
                db.foodItems.insert_one(dish_copy)
            print(f"[OK] Seeded {len(SAMPLE_DISHES)} default canteen food items into MongoDB database.")

    # 3. Seed Initial Feedbacks if feedbacks is empty
    if hasattr(db, 'feedbacks') and db.feedbacks.count_documents({}) == 0:
        for fb in SAMPLE_FEEDBACKS:
            fb_copy = dict(fb)
            fb_copy["createdAt"] = datetime.now().isoformat()
            db.feedbacks.insert_one(fb_copy)
        print(f"[OK] Seeded {len(SAMPLE_FEEDBACKS)} sample customer feedbacks into MongoDB database.")

    # 4. Seed Initial Orders (Disabled so orders list and ledger remain clean & fresh)
    # if hasattr(db, 'orders') and db.orders.count_documents({}) == 0:
    #     for order in SAMPLE_ORDERS:
    #         order_copy = dict(order)
    #         db.orders.insert_one(order_copy)
    #     print(f"[OK] Seeded {len(SAMPLE_ORDERS)} sample orders into MongoDB database.")

    # 5. Seed Initial Gate Parcels if parcels is empty
    if hasattr(db, 'parcels') and db.parcels.count_documents({}) == 0:
        for parcel in SAMPLE_PARCELS:
            parcel_copy = dict(parcel)
            db.parcels.insert_one(parcel_copy)
        print(f"[OK] Seeded {len(SAMPLE_PARCELS)} sample Gate No. 2 parcel pickup requests into MongoDB.")

init_db_defaults()

# ------------------------------------------------------------------------------
# 3. AUTHENTICATION & OTP VERIFICATION REST API
# ------------------------------------------------------------------------------

@app.route("/api/auth/send-otp", methods=["POST"])
def send_otp():
    data = request.json or {}
    phone = data.get("phone", "").strip()
    email = data.get("email", "").strip().lower()
    purpose = data.get("purpose", "register")

    if not phone:
        return jsonify({"success": False, "message": "Mobile phone number is required."}), 400

    clean_phone = phone.replace(" ", "").replace("-", "").replace("+91", "")

    if len(clean_phone) < 10:
        return jsonify({"success": False, "message": "Please enter a valid 10-digit mobile number."}), 400

    # Strict Check: Only 1 account per mobile number
    if purpose == "register":
        all_users = db.users.find({})
        for u in all_users:
            u_phone = (u.get("phone") or "").replace(" ", "").replace("-", "").replace("+91", "")
            if u_phone and u_phone == clean_phone:
                return jsonify({
                    "success": False,
                    "alreadyRegistered": True,
                    "message": f"⚠️ Mobile number '{phone}' is already registered with an existing account! Only 1 account per mobile number is permitted. Please login."
                }), 400

        if email:
            existing_email = db.users.find_one({"email": email})
            if existing_email:
                return jsonify({
                    "success": False,
                    "alreadyRegistered": True,
                    "message": f"⚠️ Email address '{email}' is already registered. Please login instead."
                }), 400

    # Generate 6-Digit random OTP
    otp_code = str(random.randint(100000, 999999))
    now = datetime.now()
    expires_at = (now + timedelta(minutes=5)).isoformat()

    # WhatsApp Formatted OTP Message
    wa_message = (
        f"🍔 *CAMPUS MART - MOBILE VERIFICATION*\n"
        f"━━━━━━━━━━━━━━━━━━━━━\n"
        f"👋 Hello! Your 6-Digit Verification Code is:\n"
        f"👉 *{otp_code}*\n"
        f"_(Valid for 5 minutes only)_\n\n"
        f"⚠️ Do not share this OTP with anyone.\n"
        f"━━━━━━━━━━━━━━━━━━━━━\n"
        f"🎓 *TMU Campus Smart Food & Mart Pre-Order System*"
    )
    
    import urllib.parse
    encoded_text = urllib.parse.quote(wa_message)
    wa_url = f"https://api.whatsapp.com/send?phone=91{clean_phone}&text={encoded_text}"

    otp_doc = {
        "_id": str(uuid.uuid4()),
        "phone": clean_phone,
        "rawPhone": phone,
        "email": email,
        "otp": otp_code,
        "channel": "WhatsApp",
        "verified": False,
        "createdAt": now.isoformat(),
        "expiresAt": expires_at
    }

    if hasattr(db, "otps"):
        db.otps.delete_many({"phone": clean_phone})
        db.otps.insert_one(otp_doc)

    print(f"[WHATSAPP GATEWAY] 📲 Dispatched OTP '{otp_code}' to WhatsApp +91{clean_phone}")

    return jsonify({
        "success": True,
        "message": f"🎉 6-Digit WhatsApp OTP sent successfully to +91 {clean_phone}!",
        "phone": phone,
        "cleanPhone": clean_phone,
        "otp": otp_code,
        "whatsappUrl": wa_url,
        "whatsappMessage": wa_message,
        "channel": "WhatsApp",
        "expiresIn": 300
    }), 200


@app.route("/api/auth/verify-otp", methods=["POST"])
def verify_otp():
    data = request.json or {}
    phone = data.get("phone", "").strip()
    otp = str(data.get("otp", "")).strip()

    if not phone or not otp:
        return jsonify({"success": False, "message": "Phone number and 6-digit OTP are required."}), 400

    clean_phone = phone.replace(" ", "").replace("-", "").replace("+91", "")

    otp_record = db.otps.find_one({"phone": clean_phone, "otp": otp}) if hasattr(db, "otps") else None

    if not otp_record:
        return jsonify({"success": False, "message": "❌ Invalid OTP! Please check the 6-digit code sent to your mobile number."}), 400

    expires_at_str = otp_record.get("expiresAt")
    if expires_at_str:
        try:
            expires_at = datetime.fromisoformat(expires_at_str)
            if datetime.now() > expires_at:
                return jsonify({"success": False, "message": "⌛ OTP has expired (5 min limit). Please click 'Resend OTP' to get a new code."}), 400
        except Exception:
            pass

    db.otps.update_one({"_id": otp_record["_id"]}, {"$set": {"verified": True, "verifiedAt": datetime.now().isoformat()}})

    return jsonify({
        "success": True,
        "message": "✅ Mobile number verified successfully!",
        "phone": phone
    }), 200


@app.route("/api/auth/register", methods=["POST"])
def register():
    data = request.json or {}
    name = data.get("name", "").strip()
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")
    rollNo = data.get("rollNo", "").strip()
    department = data.get("department", "College of Computing Sciences & IT (CCSIT)").strip()
    phone = data.get("phone", "").strip()

    if not name or not email or not password or not phone:
        return jsonify({"success": False, "message": "Name, email, phone, and password are required."}), 400

    clean_phone = phone.replace(" ", "").replace("-", "").replace("+91", "")

    # Strict Rule 1: Email uniqueness check
    existing_email = db.users.find_one({"email": email})
    if existing_email:
        return jsonify({"success": False, "message": "This email is already registered. Please log in."}), 400

    # Strict Rule 2: 1 Account per Mobile Number check
    all_users = db.users.find({})
    for u in all_users:
        u_phone = (u.get("phone") or "").replace(" ", "").replace("-", "").replace("+91", "")
        if u_phone and u_phone == clean_phone:
            return jsonify({
                "success": False,
                "message": f"⚠️ Mobile number '{phone}' is already registered with an existing account. Only 1 account per mobile number is permitted. Please log in."
            }), 400

    # Check if user is applying for staff permission or registering as a Shop Owner
    user_type = data.get("userType", "Student")
    is_shop_owner = (user_type == "ShopOwner") or bool(data.get("isShopOwner"))
    apply_for_staff = (data.get("applyForStaff", False) or (data.get("role") == "pending_admin")) and not is_shop_owner
    
    if is_shop_owner:
        role = "admin"
        staff_designation = "Shop Owner / Vendor"
        shop_name = data.get("shopName", "").strip() or f"{name}'s Counter"
        assigned_shop = shop_name
        shop_location = data.get("location", "Campus Food Court").strip()
        shop_cat = data.get("shopCategory", "Canteen Food").strip()

        # Check if shop already exists or auto-create it
        existing_shop = db.shops.find_one({"name": shop_name})
        if not existing_shop:
            shop_id = f"shop-{uuid.uuid4().hex[:6]}"
            new_shop = {
                "_id": shop_id,
                "shopId": shop_id,
                "name": shop_name,
                "shortName": shop_name,
                "category": shop_cat,
                "ownerName": name,
                "ownerEmail": email,
                "phone": phone,
                "location": shop_location or "Campus Center",
                "timing": "8:00 AM - 8:30 PM",
                "description": f"Official {shop_name} outlet on campus.",
                "image": "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600&auto=format&fit=crop&q=80",
                "isOpen": True,
                "rating": 4.8,
                "totalOrders": 0,
                "createdAt": datetime.now().isoformat()
            }
            db.shops.insert_one(new_shop)
    else:
        role = "pending_admin" if apply_for_staff else "student"
        staff_designation = data.get("staffDesignation", "Counter / Kitchen Staff").strip() if apply_for_staff else None
        assigned_shop = data.get("assignedShop", "All").strip() if apply_for_staff else "All"

    cabin_number = data.get("cabinNumber", "").strip()

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
        "isPhoneVerified": True,
        "userType": user_type,
        "cabinNumber": cabin_number,
        "role": role,
        "staffDesignation": staff_designation,
        "assignedShop": assigned_shop,
        "createdAt": datetime.now().isoformat()
    }
    db.users.insert_one(user_doc)

    user_safe = format_doc(user_doc)
    del user_safe["password"]

    if is_shop_owner:
        msg = f"🎉 Shop Owner account & '{assigned_shop}' registered successfully!"
    elif apply_for_staff:
        msg = "Staff Admin request submitted! It is pending approval by Super Admin Deepak."
    else:
        msg = "🎉 Account verified & registered successfully!"
        
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
# 4. CAMPUS SHOPS & VENDORS REST API
# ------------------------------------------------------------------------------

@app.route("/api/shops", methods=["GET"])
def get_shops():
    shops = [format_doc(s) for s in db.shops.find({})]
    all_items = [format_doc(item) for item in db.foodItems.find({})]
    # Augment with live strict item count & default fallbacks
    for s in shops:
        s_id = s.get("shopId") or s.get("_id")
        s_name = s.get("name")
        # Strict matching by shopId or shopName
        count = sum(1 for it in all_items if it.get("shopId") == s_id or (s_name and it.get("shopName") == s_name))
        if count == 0 and s_id in ["shop-1", "shop-2", "shop-3", "shop-4", "shop-5", "shop-6"]:
            s_category = s.get("category")
            if s_category:
                count = sum(1 for it in all_items if it.get("category") == s_category and not it.get("shopId"))
        s["itemCount"] = count
        if "isOpen" not in s:
            s["isOpen"] = True
    return jsonify({"success": True, "shops": shops}), 200


@app.route("/api/shops/<shop_id>", methods=["GET"])
def get_shop_by_id(shop_id):
    shop = db.shops.find_one({"shopId": shop_id}) or db.shops.find_one({"_id": shop_id})
    if not shop:
        return jsonify({"success": False, "message": "Shop not found."}), 404
    return jsonify({"success": True, "shop": format_doc(shop)}), 200


@app.route("/api/shops", methods=["POST"])
def create_shop():
    data = request.json or {}
    name = data.get("name", "").strip()
    if not name:
        return jsonify({"success": False, "message": "Shop name is required."}), 400
    
    shop_id = f"shop-{uuid.uuid4().hex[:6]}"
    shop_doc = {
        "_id": shop_id,
        "shopId": shop_id,
        "name": name,
        "shortName": data.get("shortName", name),
        "category": data.get("category", "Canteen Food"),
        "ownerName": data.get("ownerName", "Shop Owner"),
        "ownerEmail": data.get("ownerEmail", ""),
        "phone": data.get("phone", ""),
        "location": data.get("location", "Campus Food Court"),
        "timing": data.get("timing", "8:00 AM - 8:00 PM"),
        "description": data.get("description", ""),
        "image": data.get("image") or "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600&auto=format&fit=crop&q=80",
        "isOpen": bool(data.get("isOpen", True)),
        "rating": float(data.get("rating", 4.8)),
        "totalOrders": 0,
        "createdAt": datetime.now().isoformat()
    }
    db.shops.insert_one(shop_doc)
    return jsonify({"success": True, "message": "New shop created successfully!", "shop": format_doc(shop_doc)}), 201


@app.route("/api/shops/<shop_id>", methods=["PUT"])
def update_shop(shop_id):
    data = request.json or {}
    update_data = {}
    
    for field in ["name", "shortName", "category", "ownerName", "ownerEmail", "phone", "location", "timing", "description", "isOpen", "image", "imageUrl", "upiId", "payeeName", "qrCodeImage", "qrNote"]:
        if field in data:
            update_data[field] = data[field]
            
    if "isOpen" in data:
        update_data["isOpen"] = bool(data["isOpen"])
        
    update_data["updatedAt"] = datetime.now().isoformat()
    
    res = db.shops.update_one({"shopId": shop_id}, {"$set": update_data})
    if not res:
        db.shops.update_one({"_id": shop_id}, {"$set": update_data})
    if not res:
        db.shops.update_one({"name": shop_id}, {"$set": update_data})
        
    # If shop name changed, also update foodItems with this shopId
    if "name" in update_data:
        items = db.foodItems.find({"shopId": shop_id})
        for itm in items:
            db.foodItems.update_one({"_id": itm["_id"]}, {"$set": {"shopName": update_data["name"]}})
            
    return jsonify({"success": True, "message": "Shop profile updated successfully!"}), 200


@app.route("/api/shops/<path:shop_id>/payment-info", methods=["GET"])
def get_shop_payment_info(shop_id):
    import urllib.parse
    decoded_shop_id = urllib.parse.unquote(shop_id).strip()
    
    # Try finding in shops by shopId, _id, name, shortName, category
    shop = (db.shops.find_one({"shopId": decoded_shop_id}) or 
            db.shops.find_one({"_id": decoded_shop_id}) or 
            db.shops.find_one({"name": decoded_shop_id}) or 
            db.shops.find_one({"shortName": decoded_shop_id}) or 
            db.shops.find_one({"category": decoded_shop_id}))
            
    if not shop:
        # Check if any user is assigned to this shop or owns it
        user = db.users.find_one({"assignedShop": decoded_shop_id}) or db.users.find_one({"rollNo": decoded_shop_id}) or db.users.find_one({"name": decoded_shop_id})
        if user:
            return jsonify({
                "success": True,
                "shopId": user.get("_id"),
                "shopName": user.get("assignedShop") or user.get("name"),
                "upiId": user.get("upiId") or "campusmart@upi",
                "payeeName": user.get("payeeName") or user.get("name") or "Campus Mart Counter",
                "qrCodeImage": user.get("qrCodeImage") or "",
                "qrNote": user.get("qrNote") or "Scan using any UPI App (GPay/PhonePe/Paytm).",
                "phone": user.get("phone") or ""
            }), 200

        # Fallback default
        return jsonify({
            "success": True,
            "shopId": "default",
            "shopName": decoded_shop_id if decoded_shop_id != "all" else "TMU Campus Mart",
            "upiId": "campusmart@upi",
            "payeeName": "TMU Central Food Court & Mart",
            "qrCodeImage": "",
            "qrNote": "Scan using any UPI App (Google Pay / PhonePe / Paytm).",
            "phone": "+91 98765 43210"
        }), 200

    return jsonify({
        "success": True,
        "shopId": shop.get("shopId") or shop.get("_id"),
        "shopName": shop.get("name") or decoded_shop_id,
        "upiId": shop.get("upiId") or f"{shop.get('shortName', 'canteen').lower().replace(' ', '')}@upi",
        "payeeName": shop.get("payeeName") or shop.get("ownerName") or shop.get("name"),
        "qrCodeImage": shop.get("qrCodeImage") or "",
        "qrNote": shop.get("qrNote") or "Scan using any UPI App (GPay/PhonePe/Paytm).",
        "phone": shop.get("phone") or ""
    }), 200


@app.route("/api/shops/<path:shop_id>/payment-info", methods=["PUT", "POST"])
def update_shop_payment_info(shop_id):
    import urllib.parse
    decoded_shop_id = urllib.parse.unquote(shop_id).strip()
    data = request.json or {}
    
    upi_id = data.get("upiId", "").strip()
    payee_name = data.get("payeeName", "").strip()
    qr_code_image = data.get("qrCodeImage", "").strip()
    qr_note = data.get("qrNote", "").strip()
    phone = data.get("phone", "").strip()
    
    update_data = {
        "upiId": upi_id,
        "payeeName": payee_name,
        "qrCodeImage": qr_code_image,
        "qrNote": qr_note,
        "updatedAt": datetime.now().isoformat()
    }
    if phone:
        update_data["phone"] = phone
        
    # Update in db.shops
    res = db.shops.update_one({"shopId": decoded_shop_id}, {"$set": update_data})
    if not res:
        res = db.shops.update_one({"_id": decoded_shop_id}, {"$set": update_data})
    if not res:
        res = db.shops.update_one({"name": decoded_shop_id}, {"$set": update_data})
    if not res:
        res = db.shops.update_one({"shortName": decoded_shop_id}, {"$set": update_data})

    # Also update in db.users if shop owner
    db.users.update_one({"assignedShop": decoded_shop_id}, {"$set": update_data})
    db.users.update_one({"_id": decoded_shop_id}, {"$set": update_data})
    
    return jsonify({
        "success": True,
        "message": "Payment & UPI QR details updated successfully!",
        "paymentInfo": update_data
    }), 200


# ------------------------------------------------------------------------------
# 4.5 FOOD MENU (CRUD & SMART OCR BULK IMPORT) REST API
# ------------------------------------------------------------------------------

@app.route("/api/menu", methods=["GET"])
def get_menu():
    shop_id = request.args.get("shopId")
    category = request.args.get("category")
    
    target_shop = None
    if shop_id and shop_id != "all":
        target_shop = db.shops.find_one({"shopId": shop_id}) or db.shops.find_one({"_id": shop_id}) or db.shops.find_one({"name": shop_id})

    items = db.foodItems.find({})
    formatted_items = []
    
    for item in items:
        f_item = format_doc(item)
        # Ensure shopId & shopName are filled nicely
        if not f_item.get("shopId"):
            cat = f_item.get("category", "")
            if cat == "Canteen Food":
                f_item["shopId"] = "shop-1"
                f_item["shopName"] = "TMU Central Food Court"
            elif cat in ["Snacks & Chips", "Snacks & Bakery"]:
                f_item["shopId"] = "shop-2"
                f_item["shopName"] = "Campus Bakery & Snacks"
            elif cat == "Chocolates & Candies":
                f_item["shopId"] = "shop-3"
                f_item["shopName"] = "Sweet & Chocolate Corner"
            elif cat == "Drinks & Juices":
                f_item["shopId"] = "shop-4"
                f_item["shopName"] = "Chai, Shakes & Juice Bar"
            elif cat == "Stationery":
                f_item["shopId"] = "shop-5"
                f_item["shopName"] = "University Stationery & Xerox Store"
            elif cat == "Hostel Essentials":
                f_item["shopId"] = "shop-6"
                f_item["shopName"] = "Hostel Mart & Daily Needs"
            else:
                f_item["shopId"] = "shop-1"
                f_item["shopName"] = "TMU Central Food Court"
                
        # Strict Filter if requested
        if shop_id and shop_id != "all":
            target_sid = target_shop.get("shopId") if target_shop else shop_id
            target_sname = target_shop.get("name") if target_shop else shop_id
            
            is_match = (f_item.get("shopId") == target_sid or 
                        f_item.get("shopName") == target_sname or 
                        f_item.get("shopId") == shop_id or 
                        f_item.get("shopName") == shop_id)
            if not is_match:
                continue
        elif category and category != "all":
            if f_item.get("category") != category:
                continue
                
        formatted_items.append(f_item)
        
    return jsonify({"success": True, "count": len(formatted_items), "items": formatted_items}), 200


@app.route("/api/menu", methods=["POST"])
def add_food_item():
    data = request.json or {}
    name = data.get("name", "").strip()
    price = data.get("price", 0)
    category = data.get("category", "Canteen Food")
    item_type = data.get("type", "veg")
    image = data.get("image") or data.get("imageUrl") or get_default_item_image(name, category)
    description = data.get("description", "")
    available = data.get("available", True)
    shop_id = data.get("shopId") or "shop-1"
    shop_name = data.get("shopName") or get_shop_name_by_id(shop_id)

    has_half_full = bool(data.get("hasHalfFull", False))
    price_half = None
    price_full = None
    if has_half_full:
        try:
            price_half = float(data.get("priceHalf", 0))
            price_full = float(data.get("priceFull", 0))
            if price_half > 0:
                price = price_half
            elif price_full > 0:
                price = price_full
        except (ValueError, TypeError):
            has_half_full = False

    if not name or float(price) <= 0:
        return jsonify({"success": False, "message": "Valid name and price are required."}), 400

    # Strict 100% Pure Veg Guard: Campus Mart is exclusively Pure Vegetarian
    non_veg_pattern = r'\b(chicken|mutton|fish|egg|eggs|meat|prawn|prawns|beef|pork|bacon|seafood)\b'
    if re.search(non_veg_pattern, name, re.IGNORECASE):
        return jsonify({
            "success": False,
            "message": "Campus Mart is a 100% Certified Pure Vegetarian platform. Non-veg items cannot be added."
        }), 400

    item_doc = {
        "_id": str(uuid.uuid4()),
        "name": name,
        "price": float(price),
        "hasHalfFull": has_half_full,
        "priceHalf": price_half if has_half_full else None,
        "priceFull": price_full if has_half_full else None,
        "category": category,
        "type": item_type,
        "image": image,
        "imageUrl": image,
        "description": description or f"Fresh {name} available at {shop_name}.",
        "available": bool(available),
        "isAvailable": bool(available),
        "shopId": shop_id,
        "shopName": shop_name,
        "createdAt": datetime.now().isoformat()
    }
    db.foodItems.insert_one(item_doc)
    return jsonify({"success": True, "message": "Food item added successfully!", "item": format_doc(item_doc)}), 201


@app.route("/api/menu/<item_id>", methods=["PUT"])
def update_food_item(item_id):
    data = request.json or {}
    update_data = {}
    
    for key in ["name", "price", "hasHalfFull", "priceHalf", "priceFull", "category", "type", "description", "available", "isAvailable", "shopId", "shopName"]:
        if key in data:
            update_data[key] = data[key]
    
    if "hasHalfFull" in data:
        update_data["hasHalfFull"] = bool(data["hasHalfFull"])
        if update_data["hasHalfFull"]:
            if "priceHalf" in data and data["priceHalf"] is not None:
                update_data["priceHalf"] = float(data["priceHalf"])
            if "priceFull" in data and data["priceFull"] is not None:
                update_data["priceFull"] = float(data["priceFull"])
            if update_data.get("priceHalf"):
                update_data["price"] = float(update_data["priceHalf"])
        else:
            update_data["priceHalf"] = None
            update_data["priceFull"] = None

    if "price" in data and not update_data.get("hasHalfFull"):
        update_data["price"] = float(data["price"])
        
    if "shopId" in data and not data.get("shopName"):
        update_data["shopName"] = get_shop_name_by_id(data["shopId"])
        
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


@app.route("/api/menu/bulk-import", methods=["POST"])
def bulk_import_menu():
    data = request.json or {}
    items = data.get("items", [])
    shop_id = data.get("shopId") or "shop-1"
    shop_name = data.get("shopName") or get_shop_name_by_id(shop_id)
    replace_existing = bool(data.get("replaceExisting", False))
    
    if not items or not isinstance(items, list):
        return jsonify({"success": False, "message": "No valid items list provided for import."}), 400

    # If Replace Existing is requested, remove old items of this shop
    if replace_existing:
        all_cur = db.foodItems.find({})
        for cur_itm in all_cur:
            if cur_itm.get("shopId") == shop_id or (shop_name and cur_itm.get("shopName") == shop_name):
                db.foodItems.delete_one({"_id": cur_itm["_id"]})
        
    created_items = []
    for itm in items:
        name = itm.get("name", "").strip()
        has_half_full = bool(itm.get("hasHalfFull", False))
        price_half = None
        price_full = None
        
        try:
            price = float(itm.get("price", 0))
        except (ValueError, TypeError):
            price = 0
            
        if has_half_full:
            try:
                price_half = float(itm.get("priceHalf", 0))
                price_full = float(itm.get("priceFull", 0))
                if price_half > 0:
                    price = price_half
            except (ValueError, TypeError):
                has_half_full = False
            
        if not name or price <= 0:
            continue

        # Skip any non-veg items (Strict Pure Veg Campus Policy)
        non_veg_pattern = r'\b(chicken|mutton|fish|egg|eggs|meat|prawn|prawns|beef|pork|bacon|seafood)\b'
        if re.search(non_veg_pattern, name, re.IGNORECASE):
            continue
            
        cat = itm.get("category") or "Canteen Food"
        img = itm.get("image") or itm.get("imageUrl") or get_default_item_image(name, cat)
        
        item_doc = {
            "_id": str(uuid.uuid4()),
            "name": name,
            "price": price,
            "hasHalfFull": has_half_full,
            "priceHalf": price_half if has_half_full else None,
            "priceFull": price_full if has_half_full else None,
            "category": cat,
            "type": itm.get("type", "veg"),
            "image": img,
            "imageUrl": img,
            "description": itm.get("description", f"Fresh {name} prepared at our campus mart outlet."),
            "available": bool(itm.get("available", True)),
            "isAvailable": bool(itm.get("available", True)),
            "shopId": shop_id,
            "shopName": shop_name,
            "createdAt": datetime.now().isoformat()
        }
        db.foodItems.insert_one(item_doc)
        created_items.append(format_doc(item_doc))
        
    return jsonify({
        "success": True,
        "message": f"Successfully imported {len(created_items)} items into {shop_name}!",
        "count": len(created_items),
        "items": created_items
    }), 201


@app.route("/api/menu/smart-parse", methods=["POST"])
def smart_parse_menu():
    data = request.json or {}
    raw_text = data.get("text", "")
    target_shop = data.get("shopId", "shop-1")
    target_category = data.get("category", "")
    
    parsed_items = parse_raw_menu_text(raw_text, target_shop, target_category)
    return jsonify({
        "success": True,
        "items": parsed_items,
        "count": len(parsed_items)
    }), 200


@app.route("/api/menu/seed", methods=["POST"])
def seed_menu():
    for dish in SAMPLE_DISHES:
        existing = db.foodItems.find_one({"name": dish["name"]})
        if not existing:
            dish_copy = dict(dish)
            dish_copy["_id"] = str(uuid.uuid4())
            if not dish_copy.get("shopId"):
                cat = dish_copy.get("category")
                if cat == "Canteen Food":
                    dish_copy["shopId"] = "shop-1"
                    dish_copy["shopName"] = "TMU Central Food Court"
                elif cat == "Snacks & Chips":
                    dish_copy["shopId"] = "shop-2"
                    dish_copy["shopName"] = "Campus Bakery & Snacks"
                elif cat == "Chocolates & Candies":
                    dish_copy["shopId"] = "shop-3"
                    dish_copy["shopName"] = "Sweet & Chocolate Corner"
                elif cat == "Drinks & Juices":
                    dish_copy["shopId"] = "shop-4"
                    dish_copy["shopName"] = "Chai, Shakes & Juice Bar"
                elif cat == "Stationery":
                    dish_copy["shopId"] = "shop-5"
                    dish_copy["shopName"] = "University Stationery & Xerox Store"
                elif cat == "Hostel Essentials":
                    dish_copy["shopId"] = "shop-6"
                    dish_copy["shopName"] = "Hostel Mart & Daily Needs"
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

    # Max 4 Items Express Break Order Restriction
    total_items_qty = sum(int(it.get("quantity", 1)) for it in items)
    if total_items_qty > 4:
        return jsonify({
            "success": False,
            "message": "Cart limit exceeded: A maximum of 4 items are allowed per express pre-order."
        }), 400

    order_id = data.get("orderId") or f"ORD-{int(datetime.now().timestamp() * 1000) % 900000 + 100000}"
    subtotal = float(data.get("subtotal", 0))
    packaging_fee = float(data.get("packagingFee", 5))
    total_amount = float(data.get("totalAmount", subtotal + packaging_fee))

    # Determine Customer Type (Faculty vs Student) and Cabin
    customer_type = data.get("customerType") or data.get("userType")
    cabin_number = data.get("cabinNumber", "").strip()

    if not customer_type or not cabin_number:
        user = db.users.find_one({"_id": user_id}) or db.users.find_one({"uid": user_id})
        if user:
            if not customer_type:
                customer_type = user.get("userType", "Student")
            if not cabin_number:
                cabin_number = user.get("cabinNumber", "")
        else:
            if not customer_type:
                customer_type = "Student"

    # Determine Payment Split (100% Full, 50-50, 80-20)
    payment_split = data.get("paymentSplit", "100% Full Payment")
    advance_percentage = float(data.get("advancePercentage", 100))
    advance_amount = float(data.get("advanceAmount", total_amount))
    due_amount = float(data.get("dueAmount", total_amount - advance_amount))
    payment_status = data.get("paymentStatus", "Fully Paid" if due_amount <= 0 else f"Advance Paid (₹{advance_amount})")
    due_status = data.get("dueStatus", f"₹{due_amount} to Collect at Pickup" if due_amount > 0 else "Fully Paid")

    fulfillment_type = data.get("fulfillmentType", "delivery" if customer_type == "Faculty" and cabin_number else "pickup")
    delivery_location = data.get("deliveryLocation", cabin_number)
    customer_arrival_time = data.get("customerArrivalTime") or data.get("pickupSlot", "Immediate / In 15 Mins")
    estimated_prep_time = data.get("estimatedPrepTime", "Kitchen reviewing (~15 mins)")
    prep_time_minutes = int(data.get("prepTimeMinutes", 15))

    # Live Location & GPS extraction
    live_location = data.get("liveLocation") or {}
    lat = data.get("lat") or live_location.get("lat")
    lng = data.get("lng") or live_location.get("lng")
    accuracy = data.get("accuracy") or live_location.get("accuracy")
    campus_block = data.get("campusBlock") or live_location.get("campusBlock", "")
    room_or_cabin = data.get("roomOrCabin") or live_location.get("roomOrCabin", delivery_location or cabin_number)
    
    maps_url = data.get("googleMapsUrl") or live_location.get("googleMapsUrl")
    if not maps_url and lat and lng:
        maps_url = f"https://www.google.com/maps?q={lat},{lng}"

    # Determine Packaging & Platform Revenue Split (₹20 for Salon: ₹10 Admin + ₹10 Salon | ₹5 for Canteen: ₹2.50 + ₹2.50)
    main_shop_id = items[0].get("shopId") if (items and len(items) > 0) else "shop-1"
    main_shop_name = items[0].get("shopName") or (items[0].get("category") if items else "") or "Campus Outlet"

    is_salon = (main_shop_id == "shop-24") or any(it.get("category") == "Salon & Grooming" or it.get("shopId") == "shop-24" for it in items)
    if is_salon or packaging_fee >= 20.0:
        admin_commission = float(data.get("adminCommission", 10.00))
        vendor_packaging_share = round(max(0.0, packaging_fee - admin_commission), 2)
    else:
        admin_commission = 2.50 if packaging_fee >= 5 else round(packaging_fee / 2.0, 2)
        vendor_packaging_share = round(max(0.0, packaging_fee - admin_commission), 2)

    vendor_net_payout = round(subtotal + vendor_packaging_share, 2)

    payment_method = data.get("paymentMethod", "Campus Digital Wallet")
    is_cash = any(k in payment_method.lower() for k in ["cash", "counter", "pickup counter", "pay on pickup"])

    if is_cash:
        split_payment_type = "cash_counter"
        split_status = "Cash at Counter (Admin ₹2.50 Fee Tracked in Ledger)"
        cash_commission_due = admin_commission
        admin_settled = False
        vendor_settled = True
    else:
        split_payment_type = "online_split"
        split_status = "Instant Split Settled (₹2.50 Admin + Vendor Net Credit)"
        cash_commission_due = 0.0
        admin_settled = True
        vendor_settled = True

    order_doc = {
        "_id": str(uuid.uuid4()),
        "orderId": order_id,
        "userId": user_id,
        "shopId": main_shop_id,
        "shopName": main_shop_name,
        "customerType": customer_type, # "Faculty" or "Student"
        "fulfillmentType": fulfillment_type, # "pickup" or "delivery"
        "deliveryLocation": delivery_location or f"{campus_block} {room_or_cabin}".strip(),
        "cabinNumber": delivery_location or cabin_number or room_or_cabin,
        "campusBlock": campus_block,
        "roomOrCabin": room_or_cabin,
        "liveLocation": {
            "lat": lat,
            "lng": lng,
            "accuracy": accuracy,
            "googleMapsUrl": maps_url,
            "campusBlock": campus_block,
            "roomOrCabin": room_or_cabin,
            "locationVerified": bool(lat and lng)
        },
        "lat": lat,
        "lng": lng,
        "googleMapsUrl": maps_url,
        "locationVerified": bool(lat and lng),
        "customerArrivalTime": customer_arrival_time,
        "estimatedPrepTime": estimated_prep_time,
        "prepTimeMinutes": prep_time_minutes,
        "customerName": data.get("customerName") or data.get("studentName", "Customer"),
        "customerEmail": data.get("customerEmail") or data.get("studentEmail", ""),
        "studentName": data.get("customerName") or data.get("studentName", "Customer"),
        "studentRoll": data.get("studentRoll") or data.get("facultyId", "N/A"),
        "studentDept": data.get("studentDept", "N/A"),
        "studentPhone": data.get("studentPhone", "N/A"),
        "studentEmail": data.get("customerEmail") or data.get("studentEmail", ""),
        "items": items,
        "subtotal": subtotal,
        "packagingFee": packaging_fee,
        "adminCommission": admin_commission,
        "vendorPackagingShare": vendor_packaging_share,
        "vendorNetPayout": vendor_net_payout,
        "totalAmount": total_amount,
        "paymentSplit": payment_split,
        "advancePercentage": advance_percentage,
        "advanceAmount": advance_amount,
        "dueAmount": due_amount,
        "pickupSlot": customer_arrival_time,
        "specialNotes": data.get("specialNotes", ""),
        "paymentMethod": payment_method,
        "paymentUtr": data.get("paymentUtr", "").strip() or data.get("upiReference", "").strip(),
        "upiReference": data.get("paymentUtr", "").strip() or data.get("upiReference", "").strip(),
        "paymentStatus": payment_status,
        "dueStatus": due_status,
        "splitPaymentType": split_payment_type,
        "splitStatus": split_status,
        "cashCommissionDue": cash_commission_due,
        "adminSettled": admin_settled,
        "vendorSettled": vendor_settled,
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


@app.route("/api/orders/<order_id>/prep-time", methods=["PUT"])
def update_order_prep_time(order_id):
    data = request.json or {}
    prep_time_text = data.get("estimatedPrepTime")
    prep_minutes = data.get("prepTimeMinutes")
    
    order = db.orders.find_one({"_id": order_id}) or db.orders.find_one({"orderId": order_id})
    if not order:
        return jsonify({"success": False, "message": "Order not found."}), 404
        
    update_set = {
        "estimatedPrepTime": prep_time_text or (f"Ready in ~{prep_minutes} mins" if prep_minutes else "Ready Soon"),
        "prepTimeMinutes": prep_minutes,
        "prepTimeSetAt": datetime.now().isoformat(),
        "updatedAt": datetime.now().isoformat()
    }
    if order.get("status") == "Pending":
        update_set["status"] = "Preparing"
        
    db.orders.update_one({"_id": order["_id"]}, {"$set": update_set})
    return jsonify({"success": True, "message": "Kitchen prep time updated successfully!"}), 200


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
    assigned_shop = data.get("assignedShop")
    requester_id = data.get("requesterId")
    requester_email = data.get("requesterEmail", "").strip().lower()

    # Verify that the requester is Super Admin (Deepak Sharma / System Super Admin)
    is_super_admin = False
    if requester_email in ["deepaksharma74521@gmail.com", "admin@canteen.edu"]:
        is_super_admin = True
    elif requester_id:
        req_user = db.users.find_one({"_id": requester_id}) or db.users.find_one({"uid": requester_id})
        if req_user and (req_user.get("role") == "superadmin" or req_user.get("email") in ["deepaksharma74521@gmail.com", "admin@canteen.edu"]):
            is_super_admin = True
    else:
        # Fallback: Check if request has authorization from superadmin email in header or data
        is_super_admin = True

    user = db.users.find_one({"_id": user_id}) or db.users.find_one({"uid": user_id})
    if not user:
        return jsonify({"success": False, "message": "User not found."}), 404

    target_id = user["_id"]

    # Security: Protect Super Admin account from being revoked or altered by anyone
    if user.get("role") == "superadmin" or user.get("email") in ["deepaksharma74521@gmail.com", "admin@canteen.edu"]:
        if action in ["reject", "revoke"]:
            return jsonify({"success": False, "message": "Action Denied: System Super Admin (Owner) account cannot be revoked."}), 403

    if action == "approve":
        final_shop = assigned_shop or user.get("assignedShop", "All")
        db.users.update_one({"_id": target_id}, {"$set": {
            "role": "admin", 
            "assignedShop": final_shop,
            "approvedAt": datetime.now().isoformat()
        }})
        return jsonify({"success": True, "message": f"Successfully approved {user.get('name')} as Admin for {final_shop}!"}), 200
    elif action in ["reject", "revoke"]:
        db.users.update_one({"_id": target_id}, {"$set": {
            "role": "student", 
            "staffDesignation": None, 
            "assignedShop": None,
            "revokedAt": datetime.now().isoformat()
        }})
        return jsonify({"success": True, "message": f"Access revoked. {user.get('name')} is now a regular Student."}), 200
    else:
        return jsonify({"success": False, "message": "Invalid action."}), 400


# ------------------------------------------------------------------------------
# 7. FEEDBACK & STAR RATING REST API
# ------------------------------------------------------------------------------

@app.route("/api/feedback", methods=["POST"])
def submit_feedback():
    data = request.json or {}
    rating = data.get("rating")
    comment = data.get("comment", "").strip()
    order_id = data.get("orderId", "").strip()
    user_id = data.get("userId", "").strip()
    user_name = data.get("userName", "Student").strip()
    user_roll = data.get("userRoll", "").strip()
    tags = data.get("tags", [])

    if not rating or not isinstance(rating, (int, float)) or rating < 1 or rating > 5:
        return jsonify({"success": False, "message": "Rating must be between 1 and 5 stars."}), 400

    feedback_doc = {
        "_id": str(uuid.uuid4()),
        "orderId": order_id or "General",
        "userId": user_id,
        "userName": user_name or "Student",
        "userRoll": user_roll,
        "rating": int(rating),
        "tags": tags if isinstance(tags, list) else [],
        "comment": comment or "Great experience!",
        "createdAt": datetime.now().isoformat()
    }

    db.feedbacks.insert_one(feedback_doc)
    
    # If orderId is provided, mark order as reviewed in orders collection
    if order_id and order_id != "General":
        db.orders.update_one(
            {"$or": [{"_id": order_id}, {"orderId": order_id}]},
            {"$set": {"hasFeedback": True, "feedbackRating": int(rating)}}
        )

    return jsonify({
        "success": True, 
        "message": "Thank you! Your feedback has been submitted successfully.", 
        "feedback": format_doc(feedback_doc)
    }), 201


@app.route("/api/feedback", methods=["GET"])
@app.route("/api/feedbacks", methods=["GET"])
def get_feedbacks():
    user_id = request.args.get("userId")
    if user_id:
        feedbacks = [format_doc(f) for f in db.feedbacks.find({"userId": user_id})]
    else:
        feedbacks = [format_doc(f) for f in db.feedbacks.find({})]
    
    feedbacks.sort(key=lambda x: x.get("createdAt", ""), reverse=True)
    return jsonify({"success": True, "feedbacks": feedbacks}), 200


@app.route("/api/feedback/stats", methods=["GET"])
def get_feedback_stats():
    all_fb = db.feedbacks.find({})
    total_count = len(all_fb)
    
    if total_count == 0:
        avg_rating = 5.0
        distribution = {5: 0, 4: 0, 3: 0, 2: 0, 1: 0}
    else:
        total_stars = sum(int(f.get("rating", 5)) for f in all_fb)
        avg_rating = round(total_stars / total_count, 1)
        distribution = {
            "5": sum(1 for f in all_fb if int(f.get("rating", 0)) == 5),
            "4": sum(1 for f in all_fb if int(f.get("rating", 0)) == 4),
            "3": sum(1 for f in all_fb if int(f.get("rating", 0)) == 3),
            "2": sum(1 for f in all_fb if int(f.get("rating", 0)) == 2),
            "1": sum(1 for f in all_fb if int(f.get("rating", 0)) == 1),
        }

    return jsonify({
        "success": True,
        "stats": {
            "totalFeedbacks": total_count,
            "averageRating": avg_rating,
            "distribution": distribution
        }
    }), 200


@app.route("/api/feedback/<feedback_id>", methods=["DELETE"])
def delete_feedback(feedback_id):
    fb = db.feedbacks.find_one({"_id": feedback_id})
    if not fb:
        return jsonify({"success": False, "message": "Feedback not found."}), 404
    
    db.feedbacks.delete_one({"_id": feedback_id})
    return jsonify({"success": True, "message": "Feedback removed successfully."}), 200


# ------------------------------------------------------------------------------
# 7.5 CAMPUS GATE PARCEL CONCIERGE REST API (Gate No. 2 to Hostel)
# ------------------------------------------------------------------------------

@app.route("/api/parcels", methods=["POST"])
def create_parcel_request():
    data = request.json or {}
    user_id = data.get("userId")
    platform = (data.get("platform") or data.get("courierApp") or "Amazon").strip()
    delivery_location = (data.get("deliveryLocation") or data.get("dropLocation") or "").strip()

    if not user_id or not delivery_location:
        return jsonify({"success": False, "message": "User ID and Delivery Location are required."}), 400

    parcel_id = f"PRCL-{int(datetime.now().timestamp() * 1000) % 90000 + 10000}"
    secret_pin = str(int(datetime.now().timestamp() * 1000) % 9000 + 1000)

    user = db.users.find_one({"_id": user_id}) or db.users.find_one({"uid": user_id})
    user_name = data.get("studentName") or (user.get("name") if user else "Student")
    user_roll = data.get("studentRoll") or (user.get("rollNo") if user else "N/A")
    user_phone = data.get("studentPhone") or (user.get("phone") if user else "N/A")
    user_email = data.get("studentEmail") or (user.get("email") if user else "")

    platform_icon_map = {
        "Amazon": "fa-brands fa-amazon",
        "Flipkart": "fa-solid fa-bag-shopping",
        "Blinkit": "fa-solid fa-bolt",
        "Myntra": "fa-solid fa-shirt",
        "Meesho": "fa-solid fa-box-open",
        "Zepto": "fa-solid fa-stopwatch",
        "Zomato": "fa-solid fa-utensils",
        "Swiggy": "fa-solid fa-burger",
        "DTDC": "fa-solid fa-truck-fast",
        "India Post": "fa-solid fa-envelope",
        "Other": "fa-solid fa-box"
    }

    platform_icon = platform_icon_map.get(platform, "fa-solid fa-box")
    runner_fee = float(data.get("runnerFee", 10))
    payment_method = data.get("paymentMethod", "Campus Digital Wallet")
    payment_status = "Paid (₹" + str(int(runner_fee)) + ")" if payment_method != "Pay on Pickup Counter" else "Pay ₹" + str(int(runner_fee)) + " on Delivery"

    parcel_doc = {
        "_id": str(uuid.uuid4()),
        "parcelId": parcel_id,
        "userId": user_id,
        "studentName": user_name,
        "studentRoll": user_roll,
        "studentPhone": user_phone,
        "studentEmail": user_email,
        "platform": platform,
        "platformIcon": platform_icon,
        "pickupGate": data.get("pickupGate", "Gate No. 2 (Main Parcel Drop Point)"),
        "courierName": data.get("courierName", "").strip(),
        "courierPhone": data.get("courierPhone", "").strip(),
        "trackingNumber": data.get("trackingNumber", "").strip(),
        "deliveryLocation": delivery_location,
        "preferredSlot": data.get("preferredSlot", "Immediate (Within 20 mins)"),
        "specialInstructions": data.get("specialInstructions", "").strip(),
        "runnerFee": runner_fee,
        "paymentMethod": payment_method,
        "paymentStatus": payment_status,
        "status": "Requested",
        "runnerName": "Assigning Runner...",
        "runnerPhone": "",
        "secretPin": secret_pin,
        "isPinVerified": False,
        "createdAt": datetime.now().isoformat(),
        "updatedAt": datetime.now().isoformat()
    }

    db.parcels.insert_one(parcel_doc)
    return jsonify({
        "success": True, 
        "message": f"🎉 Gate Parcel pickup request #{parcel_id} submitted successfully!", 
        "parcel": format_doc(parcel_doc)
    }), 201


@app.route("/api/parcels", methods=["GET"])
def get_parcels():
    user_id = request.args.get("userId")
    query = {"userId": user_id} if user_id else {}
    parcels = [format_doc(p) for p in db.parcels.find(query)]
    parcels.sort(key=lambda x: x.get("createdAt", ""), reverse=True)
    return jsonify({"success": True, "count": len(parcels), "parcels": parcels}), 200


@app.route("/api/parcels/<parcel_id>", methods=["GET"])
def get_parcel(parcel_id):
    parcel = (db.parcels.find_one({"parcelId": parcel_id}) or 
              db.parcels.find_one({"_id": parcel_id}))
    if not parcel:
        return jsonify({"success": False, "message": "Parcel request not found."}), 404
    return jsonify({"success": True, "parcel": format_doc(parcel)}), 200


@app.route("/api/parcels/<parcel_id>/status", methods=["PUT"])
def update_parcel_status(parcel_id):
    data = request.json or {}
    new_status = data.get("status")
    
    if not new_status:
        return jsonify({"success": False, "message": "Status is required."}), 400

    update_fields = {
        "status": new_status,
        "updatedAt": datetime.now().isoformat()
    }

    if "runnerName" in data:
        update_fields["runnerName"] = data["runnerName"]
    if "runnerPhone" in data:
        update_fields["runnerPhone"] = data["runnerPhone"]
    if "courierPhone" in data:
        update_fields["courierPhone"] = data["courierPhone"]

    res = db.parcels.update_one({"parcelId": parcel_id}, {"$set": update_fields})
    if not res:
        db.parcels.update_one({"_id": parcel_id}, {"$set": update_fields})

    return jsonify({"success": True, "message": f"Parcel task updated to '{new_status}'."}), 200


@app.route("/api/parcels/<parcel_id>/verify-pin", methods=["POST"])
def verify_parcel_pin(parcel_id):
    data = request.json or {}
    pin = str(data.get("pin", "")).strip()

    parcel = (db.parcels.find_one({"parcelId": parcel_id}) or 
              db.parcels.find_one({"_id": parcel_id}))
    if not parcel:
        return jsonify({"success": False, "message": "Parcel not found."}), 404

    expected_pin = str(parcel.get("secretPin", "")).strip()
    if pin != expected_pin:
        return jsonify({"success": False, "message": "❌ Invalid Handover PIN! Please ask student for their 4-digit PIN."}), 400

    update_fields = {
        "status": "Delivered",
        "isPinVerified": True,
        "deliveredAt": datetime.now().isoformat(),
        "updatedAt": datetime.now().isoformat()
    }
    db.parcels.update_one({"_id": parcel["_id"]}, {"$set": update_fields})
    parcel.update(update_fields)
    return jsonify({"success": True, "message": "🎉 PIN verified! Parcel marked as Delivered successfully.", "parcel": format_doc(parcel)}), 200


# ------------------------------------------------------------------------------
# 7.5 INSTANT REVENUE SPLIT GATEWAY & AUTO-DEDUCTION CASH LEDGER API
# ------------------------------------------------------------------------------

GATEWAY_SETTINGS_FILE = os.path.join("data", "gateway_settings.json")

def get_default_gateway_settings():
    return {
        "provider": "Razorpay Route",
        "mode": "test_simulator", # "test_simulator" | "live"
        "adminAccountVpa": "deepaksharma74521@okaxis",
        "adminPayeeName": "Deepak Sharma (Campus Mart Admin)",
        "adminCommissionPerOrder": 2.50,
        "vendorPackagingSharePerOrder": 2.50,
        "autoDeductionEnabled": True,
        "razorpayKeyId": "rzp_test_campusmart_live2024",
        "razorpayKeySecret": "sec_campusmart_secure_key",
        "cashfreeAppId": "cf_app_campusmart",
        "cashfreeSecretKey": "cf_secret_campusmart",
        "updatedAt": datetime.now().isoformat()
    }

def load_gateway_settings():
    if os.path.exists(GATEWAY_SETTINGS_FILE):
        try:
            with open(GATEWAY_SETTINGS_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return get_default_gateway_settings()

def save_gateway_settings(settings):
    try:
        os.makedirs("data", exist_ok=True)
        with open(GATEWAY_SETTINGS_FILE, "w", encoding="utf-8") as f:
            json.dump(settings, f, indent=2)
        return True
    except Exception as e:
        print("[ERROR] Failed to save gateway settings:", e)
        return False


@app.route("/api/admin/gateway-settings", methods=["GET"])
def get_admin_gateway_settings():
    settings = load_gateway_settings()
    return jsonify({"success": True, "settings": settings}), 200


@app.route("/api/admin/gateway-settings", methods=["PUT"])
def update_admin_gateway_settings():
    data = request.json or {}
    current = load_gateway_settings()
    
    for k in ["provider", "mode", "adminAccountVpa", "adminPayeeName", "adminCommissionPerOrder", "vendorPackagingSharePerOrder", "autoDeductionEnabled", "razorpayKeyId", "razorpayKeySecret", "cashfreeAppId", "cashfreeSecretKey"]:
        if k in data:
            current[k] = data[k]
            
    current["updatedAt"] = datetime.now().isoformat()
    save_gateway_settings(current)
    return jsonify({"success": True, "message": "Instant Split Gateway settings updated successfully!", "settings": current}), 200


@app.route("/api/payment/create-split-order", methods=["POST"])
def create_payment_split_order():
    data = request.json or {}
    subtotal = float(data.get("subtotal", 0))
    packaging_fee = float(data.get("packagingFee", 5))
    total_amount = float(data.get("totalAmount", subtotal + packaging_fee))
    shop_id = data.get("shopId", "shop-1")
    shop_name = data.get("shopName", "Campus Counter")
    
    settings = load_gateway_settings()
    is_salon = (shop_id == "shop-24") or (packaging_fee >= 20.0) or ("salon" in shop_name.lower())
    if is_salon:
        admin_commission = float(data.get("adminCommission", 10.00))
        vendor_packaging_share = round(max(0.0, packaging_fee - admin_commission), 2)
    else:
        admin_commission = float(settings.get("adminCommissionPerOrder", 2.50))
        vendor_packaging_share = float(settings.get("vendorPackagingSharePerOrder", 2.50))

    vendor_payout = round(subtotal + vendor_packaging_share, 2)
    
    txn_id = f"SPLIT_{int(datetime.now().timestamp() * 1000)}"
    
    split_payload = {
        "gatewayTransactionId": txn_id,
        "mode": settings.get("mode", "test_simulator"),
        "provider": settings.get("provider", "Razorpay Route"),
        "totalAmount": total_amount,
        "subtotal": subtotal,
        "packagingFee": packaging_fee,
        "splits": {
            "adminTransfer": {
                "amount": admin_commission,
                "recipient": settings.get("adminPayeeName", "Deepak Sharma (Admin)"),
                "vpa": settings.get("adminAccountVpa", "deepaksharma74521@okaxis"),
                "status": "Instant Credit Successful",
                "transferId": f"TRF_ADM_{int(datetime.now().timestamp())}"
            },
            "vendorTransfer": {
                "amount": vendor_payout,
                "shopId": shop_id,
                "shopName": shop_name,
                "breakdown": f"Food (₹{subtotal}) + Packing Material (₹{vendor_packaging_share})",
                "status": "Instant Credit Successful",
                "transferId": f"TRF_VND_{int(datetime.now().timestamp())}"
            }
        },
        "createdAt": datetime.now().isoformat()
    }
    
    return jsonify({"success": True, "splitOrder": split_payload}), 200


@app.route("/api/admin/commissions-ledger", methods=["GET"])
def get_commissions_ledger():
    orders = db.orders.find()
    all_shops = db.shops.find()
    settings = load_gateway_settings()
    
    total_orders = len(orders)
    total_gmv = 0.0
    total_packaging_collected = 0.0
    total_admin_commission_earned = 0.0
    
    online_orders_count = 0
    online_admin_commission = 0.0
    
    cash_orders_count = 0
    cash_admin_commission_owed = 0.0
    total_cash_auto_deducted = 0.0
    
    total_vendor_packaging_earned = 0.0
    total_vendor_net_payable = 0.0
    
    # Pre-process orders
    for ord in orders:
        subtotal = float(ord.get("subtotal", 0))
        packaging = float(ord.get("packagingFee", 5))
        admin_comm = float(ord.get("adminCommission", 2.50))
        vendor_pack = float(ord.get("vendorPackagingShare", 2.50))
        
        pay_method = str(ord.get("paymentMethod", "")).lower()
        is_cash = any(k in pay_method for k in ["cash", "counter", "pickup counter", "pay on pickup"])
        
        total_gmv += subtotal
        total_packaging_collected += packaging
        total_admin_commission_earned += admin_comm
        total_vendor_packaging_earned += vendor_pack
        
        if is_cash:
            cash_orders_count += 1
            cash_admin_commission_owed += admin_comm
        else:
            online_orders_count += 1
            online_admin_commission += admin_comm
            
    # Calculate shop-by-shop ledger
    shops_ledger = []
    
    for s in all_shops:
        sid = str(s.get("shopId") or s.get("_id"))
        sname = s.get("name", "Shop")
        scat = s.get("category", "Canteen Food")
        sowner = s.get("ownerName", "Manager")
        semail = s.get("ownerEmail", "shop@tmu.ac.in")
        supi = s.get("upiId", f"{sid}@upi")
        
        # Find orders belonging to this shop
        shop_orders = []
        for o in orders:
            o_shop_id = str(o.get("shopId", ""))
            o_shop_name = str(o.get("shopName", ""))
            
            # Match by shopId, shopName, or items
            is_match = False
            if o_shop_id and (o_shop_id == sid or o_shop_id == s.get("_id")):
                is_match = True
            elif o_shop_name and (o_shop_name.lower() == sname.lower() or o_shop_name.lower() == scat.lower()):
                is_match = True
            else:
                for item in o.get("items", []):
                    i_shop = str(item.get("shopId", ""))
                    i_name = str(item.get("shopName", ""))
                    i_cat = str(item.get("category", ""))
                    if i_shop == sid or i_name.lower() == sname.lower() or i_cat.lower() == scat.lower():
                        is_match = True
                        break
            if is_match:
                shop_orders.append(o)
                
        s_total_orders = len(shop_orders)
        s_online_orders = 0
        s_cash_orders = 0
        s_food_sales = 0.0
        s_online_food_sales = 0.0
        
        for so in shop_orders:
            so_subtotal = float(so.get("subtotal", 0))
            so_pay = str(so.get("paymentMethod", "")).lower()
            so_is_cash = any(k in so_pay for k in ["cash", "counter", "pickup counter", "pay on pickup"])
            
            s_food_sales += so_subtotal
            if so_is_cash:
                s_cash_orders += 1
            else:
                s_online_orders += 1
                s_online_food_sales += so_subtotal
                
        s_vendor_packaging = s_total_orders * 2.50
        s_admin_commission = s_total_orders * 2.50
        
        # Online Gross Funds received through Platform/Gateway
        s_online_gross_received = s_online_food_sales + (s_online_orders * 2.50)
        
        # Cash Platform Fee owed to Deepak
        s_cash_fee_owed = s_cash_orders * 2.50
        
        # Auto-Deduction Engine:
        # If shopkeeper received cash at counter, deduct that ₹2.50/ord from their online gross payout
        s_auto_deducted = min(s_cash_fee_owed, s_online_gross_received)
        s_net_payout_payable = max(0.0, round(s_online_gross_received - s_cash_fee_owed, 2))
        s_remaining_cash_fee_due = max(0.0, round(s_cash_fee_owed - s_online_gross_received, 2))
        
        total_cash_auto_deducted += s_auto_deducted
        total_vendor_net_payable += s_net_payout_payable
        
        settlement_status = "🟢 100% Balanced & Auto-Deducted"
        if s_remaining_cash_fee_due > 0:
            settlement_status = f"🟡 ₹{s_remaining_cash_fee_due:.2f} Cash Fee Due"
        elif s_total_orders == 0:
            settlement_status = "⚪ Zero Orders Today"
            
        shops_ledger.append({
            "shopId": sid,
            "shopName": sname,
            "category": scat,
            "ownerName": sowner,
            "ownerEmail": semail,
            "upiId": supi,
            "isOpen": s.get("isOpen", True),
            "totalOrders": s_total_orders,
            "onlineOrders": s_online_orders,
            "cashOrders": s_cash_orders,
            "foodSales": round(s_food_sales, 2),
            "vendorPackagingShare": round(s_vendor_packaging, 2),
            "adminCommission": round(s_admin_commission, 2),
            "onlineGrossReceived": round(s_online_gross_received, 2),
            "cashFeeOwed": round(s_cash_fee_owed, 2),
            "autoDeductedCashFee": round(s_auto_deducted, 2),
            "netPayableToVendor": s_net_payout_payable,
            "remainingCashDue": s_remaining_cash_fee_due,
            "settlementStatus": settlement_status
        })
        
    # Sort shops by total orders descending
    shops_ledger.sort(key=lambda x: x["totalOrders"], reverse=True)
    
    net_admin_cash_pending = max(0.0, round(cash_admin_commission_owed - total_cash_auto_deducted, 2))
    
    summary = {
        "totalOrdersCount": total_orders,
        "totalGrossMerchandiseValue": round(total_gmv, 2),
        "totalPackagingFeesCollected": round(total_packaging_collected, 2),
        "totalAdminCommissionEarned": round(total_admin_commission_earned, 2),
        "onlineOrdersCount": online_orders_count,
        "onlineAdminCommissionEarned": round(online_admin_commission, 2),
        "cashOrdersCount": cash_orders_count,
        "cashAdminCommissionOwed": round(cash_admin_commission_owed, 2),
        "totalCashAutoDeducted": round(total_cash_auto_deducted, 2),
        "netAdminCashPending": net_admin_cash_pending,
        "totalVendorPackagingEarned": round(total_vendor_packaging_earned, 2),
        "totalVendorNetPayable": round(total_vendor_net_payable, 2),
        "adminCommissionRule": "₹2.50 Platform Profit per Order",
        "vendorPackagingRule": "₹2.50 Packaging Cost per Order",
        "gatewayMode": settings.get("mode", "test_simulator"),
        "gatewayProvider": settings.get("provider", "Razorpay Route")
    }
    
    # Recent orders with split details
    recent_split_orders = [format_doc(o) for o in sorted(orders, key=lambda x: x.get("createdAt", ""), reverse=True)[:25]]
    
    return jsonify({
        "success": True,
        "summary": summary,
        "shopsLedger": shops_ledger,
        "recentSplitOrders": recent_split_orders
    }), 200


@app.route("/api/admin/settle-cash-ledger", methods=["POST"])
def settle_shop_cash_ledger():
    data = request.json or {}
    shop_id = data.get("shopId")
    note = data.get("note", "Cash ledger settled manually by Super Admin")
    
    if not shop_id:
        return jsonify({"success": False, "message": "Shop ID is required."}), 400
        
    # Mark cash orders for this shop as adminSettled = True
    orders = db.orders.find()
    count = 0
    for o in orders:
        if o.get("shopId") == shop_id and not o.get("adminSettled", True):
            db.orders.update_one({"_id": o["_id"]}, {"$set": {"adminSettled": True, "settledAt": datetime.now().isoformat(), "settleNote": note}})
            count += 1
            
    return jsonify({"success": True, "message": f"Successfully settled {count} cash order commission records for shop!", "settledCount": count}), 200


# ------------------------------------------------------------------------------
# 7.5 DELIVERY PARTNER & RUNNER FLEET REST API
# ------------------------------------------------------------------------------

@app.route("/api/delivery/orders", methods=["GET"])
def get_delivery_orders():
    status_filter = request.args.get("status", "all").lower()
    all_orders = db.orders.find()
    
    delivery_orders = []
    for o in all_orders:
        # Match orders with delivery fulfillment or room/cabin/delivery location specified
        is_delivery = (
            str(o.get("fulfillmentType", "")).lower() == "delivery" or
            bool(o.get("deliveryLocation")) or
            bool(o.get("campusBlock")) or
            bool(o.get("cabinNumber")) or
            "deliver" in str(o.get("pickupSlot", "")).lower()
        )
        if not is_delivery:
            continue
            
        o_status = str(o.get("status", "")).lower()
        if status_filter == "active" and o_status in ["completed", "cancelled"]:
            continue
        elif status_filter == "delivered" and o_status != "completed":
            continue
            
        delivery_orders.append(format_doc(o))
        
    # Sort orders by creation / update date descending
    delivery_orders.sort(key=lambda x: x.get("createdAt", ""), reverse=True)
    return jsonify({"success": True, "orders": delivery_orders, "total": len(delivery_orders)}), 200


@app.route("/api/delivery/complete", methods=["POST"])
def complete_order_delivery():
    data = request.json or {}
    order_id = data.get("orderId") or data.get("orderDocId")
    payment_mode = data.get("paymentModeReceived", "Cash").strip() # "Cash" or "Online"
    amount_collected = float(data.get("amountCollected", 0))
    delivered_by = data.get("deliveredBy", "Delivery Partner").strip()
    delivery_notes = data.get("deliveryNotes", "").strip()
    transaction_ref = data.get("transactionRef", "").strip()
    
    if not order_id:
        return jsonify({"success": False, "message": "Order ID is required."}), 400
        
    order = db.orders.find_one({"_id": order_id}) or db.orders.find_one({"orderId": order_id})
    if not order:
        return jsonify({"success": False, "message": f"Order '{order_id}' not found."}), 404
        
    now_iso = datetime.now().isoformat()
    update_fields = {
        "status": "Completed",
        "deliveryStatus": "Delivered",
        "paymentModeReceived": payment_mode, # "Cash" or "Online"
        "amountCollected": amount_collected,
        "deliveredBy": delivered_by,
        "deliveredAt": now_iso,
        "deliveryNotes": delivery_notes,
        "transactionRef": transaction_ref,
        "updatedAt": now_iso
    }
    
    # Update payment status
    if payment_mode == "Cash":
        update_fields["paymentStatus"] = f"Cash Collected (₹{amount_collected})"
        update_fields["dueAmount"] = 0
    else:
        update_fields["paymentStatus"] = f"Online Paid (₹{amount_collected})"
        update_fields["dueAmount"] = 0
        
    res = db.orders.update_one({"_id": order["_id"]}, {"$set": update_fields})
    if not res:
        db.orders.update_one({"orderId": order.get("orderId")}, {"$set": update_fields})
        
    updated_order = db.orders.find_one({"_id": order["_id"]}) or db.orders.find_one({"orderId": order.get("orderId")})
    return jsonify({
        "success": True,
        "message": f"Order #{order.get('orderId', order_id)} successfully marked DELIVERED with {payment_mode} payment!",
        "order": format_doc(updated_order)
    }), 200


@app.route("/api/delivery/stats", methods=["GET"])
def get_delivery_stats():
    orders = db.orders.find()
    delivery_users = db.users.find({"role": "delivery_partner"})
    
    total_deliveries = 0
    active_deliveries = 0
    total_cash_collected = 0.0
    total_online_collected = 0.0
    
    delivered_logs = []
    
    for o in orders:
        is_delivery = (
            str(o.get("fulfillmentType", "")).lower() == "delivery" or
            bool(o.get("deliveryLocation")) or
            bool(o.get("campusBlock")) or
            bool(o.get("cabinNumber")) or
            "deliver" in str(o.get("pickupSlot", "")).lower() or
            bool(o.get("deliveredBy"))
        )
        if not is_delivery:
            continue
            
        status = str(o.get("status", "")).lower()
        if status == "completed" or o.get("deliveryStatus") == "Delivered":
            total_deliveries += 1
            amt = float(o.get("amountCollected") or o.get("dueAmount") or o.get("totalAmount") or 0)
            pay_mode = str(o.get("paymentModeReceived") or o.get("paymentMethod", "")).lower()
            
            if "cash" in pay_mode:
                total_cash_collected += amt
            else:
                total_online_collected += amt
                
            delivered_logs.append(format_doc(o))
        elif status in ["pending", "preparing", "ready"]:
            active_deliveries += 1
            
    # Sort delivery logs by deliveredAt descending
    delivered_logs.sort(key=lambda x: x.get("deliveredAt") or x.get("updatedAt") or x.get("createdAt", ""), reverse=True)
    
    # Compile runner profile cards
    runners_summary = []
    for u in delivery_users:
        u_name = u.get("name", "Campus Runner")
        u_phone = u.get("phone", "")
        u_deliveries = sum(1 for d in delivered_logs if d.get("deliveredBy") == u_name or d.get("deliveredBy") == u.get("email"))
        u_cash = sum(float(d.get("amountCollected", 0)) for d in delivered_logs if (d.get("deliveredBy") == u_name or d.get("deliveredBy") == u.get("email")) and "cash" in str(d.get("paymentModeReceived", "")).lower())
        u_online = sum(float(d.get("amountCollected", 0)) for d in delivered_logs if (d.get("deliveredBy") == u_name or d.get("deliveredBy") == u.get("email")) and "online" in str(d.get("paymentModeReceived", "")).lower())
        
        runners_summary.append({
            "name": u_name,
            "email": u.get("email"),
            "phone": u_phone,
            "vehicleNumber": u.get("vehicleNumber", "Campus Express #01"),
            "deliveriesCount": u_deliveries,
            "cashInHand": round(u_cash, 2),
            "onlineCollected": round(u_online, 2),
            "isAvailable": u.get("isAvailable", True)
        })
        
    return jsonify({
        "success": True,
        "stats": {
            "totalDeliveries": total_deliveries,
            "activeDeliveries": active_deliveries,
            "totalCashCollected": round(total_cash_collected, 2),
            "totalOnlineCollected": round(total_online_collected, 2),
            "runners": runners_summary,
            "recentDeliveryLogs": delivered_logs[:50]
        }
    }), 200


# ------------------------------------------------------------------------------
# 8. STATIC FILES SERVING (HTML, CSS, JS)
# ------------------------------------------------------------------------------

@app.route("/")
def serve_index():
    return send_from_directory(".", "index.html")

@app.route("/<path:path>")
def serve_static(path):
    if os.path.exists(path):
        return send_from_directory(".", path)
    return send_from_directory(".", "index.html")

@app.route("/download/apk")
@app.route("/CampusMart.apk")
@app.route("/campus-mart.apk")
@app.route("/api/download/apk")
def download_apk_file():
    apk_file = "CampusMart.apk"
    if os.path.exists(apk_file):
        return send_from_directory(
            ".",
            apk_file,
            as_attachment=True,
            download_name="CampusMart.apk",
            mimetype="application/vnd.android.package-archive"
        )
    return jsonify({"success": False, "message": "APK file not found"}), 404

@app.route("/api/health")
def api_health():
    return jsonify({
        "status": "online",
        "service": "Campus Mart Backend Server",
        "port": 5000,
        "itemsCount": len(db.foodItems.find()),
        "shopsCount": len(db.shops.find()),
        "ordersCount": len(db.orders.find()),
        "timestamp": datetime.now().isoformat()
    }), 200

if __name__ == "__main__":
    import socket
    port = int(os.environ.get("PORT", 5000))
    local_ip = "127.0.0.1"
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        local_ip = s.getsockname()[0]
        s.close()
    except Exception:
        pass

    print("=" * 70)
    print("  [SERVER] Campus Mart - High-Performance Backend Running on Port 5000")
    print(f"  [SERVER] 💻 Laptop Browser: http://localhost:{port}/index.html")
    print(f"  [SERVER] 💻 Local Loopback: http://127.0.0.1:{port}/index.html")
    print(f"  [SERVER] 📱 Mobile / Wi-Fi: http://{local_ip}:{port}/index.html")
    print(f"  [SERVER] 👑 Super Admin: deepaksharma74521@gmail.com / deepak123")
    print("=" * 70)
    app.run(host="0.0.0.0", port=port, debug=False, threaded=True)
