# Campus Mart – Smart Food & Daily Essentials Pre-Order System (MongoDB Backend)

A modern, responsive, mobile-first web-based food & essentials pre-ordering application designed for college campuses. Built with pure **HTML5, CSS3, Vanilla JavaScript, Python Flask REST API, and MongoDB Database**.

---

## 📁 Complete Folder Structure

```text
campus-mart/
│
├── server.py               # Python Flask REST API & MongoDB Database Server
├── requirements.txt        # Python backend dependencies (flask, flask-cors, pymongo)
│
├── index.html              # Welcome / Landing page with mart highlights
├── login.html              # Student & Staff login with role-based routing
├── register.html           # Student registration form (Roll No, Dept, etc.)
├── menu.html               # Interactive food & essentials catalog with live search & filters
├── cart.html               # Shopping cart, slot selector & pre-order placement
├── orders.html             # Student pre-order history & live status tracker
├── profile.html            # Student profile details & order activity summary
├── admin.html              # Campus Mart staff dashboard (CRUD menu, order tracking, staff approval)
│
├── css/
│   └── style.css           # Complete responsive stylesheet & modern UI system
│
├── js/
│   ├── api.js              # Centralized REST API client for MongoDB Backend
│   ├── auth.js             # Authentication, auth guard & navbar updater
│   ├── menu.js             # Menu & catalog loader, search, category filter & cart logic
│   ├── cart.js             # Cart management, total calculations & order placing
│   ├── orders.js           # Live status tracker (auto-polling) & order cancellation
│   ├── profile.js          # Profile view, editing & student statistics
│   └── admin.js            # Admin analytics, products CRUD, live order updater & staff approval
│
├── data/
│   └── canteen_db.json     # Local persistent document store (auto-created if standalone MongoDB offline)
│
└── README.md               # Project documentation, setup guide & BCA report
```

---

## 🚀 How to Run the App (1-Step Quickstart)

### Step 1: Install Python Dependencies
Open your terminal / command prompt in this project folder and run:
```bash
pip install -r requirements.txt
```
*(Dependencies: `flask`, `flask-cors`, `pymongo`)*

### Step 2: Start the MongoDB Backend Server
Run the python server:
```bash
python server.py
```

You will see:
```text
======================================================================
  [SERVER] Campus Mart - MongoDB Backend Server Running
  [SERVER] Local Web App URL: http://localhost:5000/index.html
  [SERVER] Super Admin: deepaksharma74521@gmail.com / deepak123
======================================================================
```

### Step 3: Open in Browser
Open your web browser and go to:
👉 **[http://localhost:5000](http://localhost:5000)** (or `http://localhost:5000/index.html`)

---

## 🔑 Default Login Credentials

| Role | Email | Password | Access Page |
|---|---|---|---|
| **Super Admin (Owner)** | `deepaksharma74521@gmail.com` | `deepak123` | [admin.html](http://localhost:5000/admin.html) |
| **Mart Admin** | `admin@canteen.edu` | `admin123` | [admin.html](http://localhost:5000/admin.html) |
| **New Student** | *(Self-register via register page)* | *(Your password)* | [menu.html](http://localhost:5000/menu.html) |

---

## 🗄️ MongoDB Database Architecture

The backend supports two flexible modes:
1. **Local MongoDB Server (`mongod`)**: If MongoDB Community Server is installed and running at `mongodb://localhost:27017`, `server.py` automatically connects and creates the `campus_canteen` database.
2. **Built-in Persistent Document Store (`data/canteen_db.json`)**: If MongoDB is not installed, `server.py` automatically acts as a zero-config, persistent document database maintaining strict MongoDB NoSQL schema collections!

### Collections Schema:

#### 1. `users` Collection
- `_id`: String (UUID)
- `name`: Full Name of student or staff
- `email`: College email address (unique)
- `password`: Secure SHA-256 hashed password
- `rollNo`: Student Roll Number / Staff ID
- `department`: Academic department (e.g. BCA, B.Tech)
- `phone`: Mobile contact number
- `role`: `"student"` or `"admin"`
- `createdAt`: ISO 8601 Timestamp

#### 2. `foodItems` Collection
- `_id`: String (UUID)
- `name`: Dish title (e.g., "Masala Dosa")
- `category`: `"Breakfast"`, `"Lunch"`, `"Snacks"`, or `"Beverages"`
- `price`: Item cost in INR (₹)
- `type`: `"veg"` or `"nonveg"`
- `available`: `true` (in stock) / `false` (sold out)
- `imageUrl`: Image link
- `description`: Short appetizing details
- `createdAt`: ISO 8601 Timestamp

#### 3. `orders` Collection
- `_id`: String (UUID)
- `orderId`: Readable tracking ID (e.g., `ORD-739210`)
- `userId`: Reference to student ID
- `customerName`: Student name
- `studentRoll`: Student roll number
- `studentDept`: Academic department
- `studentPhone`: Mobile phone
- `items`: Array of items `[{ id, name, price, quantity, type }]`
- `subtotal`: Sum of food costs
- `packagingFee`: Fixed takeaway packaging fee (₹5)
- `totalAmount`: Final payable amount
- `pickupSlot`: Time slot selected (e.g., `"Lunch Break (1:15 PM)"`)
- `specialNotes`: Dietary instructions
- `paymentMethod`: `"Pay on Pickup Counter"` or `"Campus Wallet"`
- `paymentStatus`: `"Pending"` or `"Paid"`
- `status`: `"Pending"`, `"Preparing"`, `"Ready"`, `"Completed"`, or `"Cancelled"`
- `createdAt`: Timestamp
- `updatedAt`: Timestamp

---

## 🌐 REST API Documentation

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Register a new student account |
| `POST` | `/api/auth/login` | Authenticate student or admin and return user profile |
| `GET` | `/api/menu` | Fetch all food items from MongoDB database |
| `POST` | `/api/menu` | Admin: Add a new dish to the menu |
| `PUT` | `/api/menu/<id>` | Admin: Update dish details or toggle in/out of stock |
| `DELETE` | `/api/menu/<id>` | Admin: Delete a food item |
| `POST` | `/api/menu/seed` | Admin: 1-Click seed 11 default Indian canteen dishes |
| `POST` | `/api/orders` | Student: Create a new canteen pre-order |
| `GET` | `/api/orders` | Fetch orders (filter by `?userId=<id>` or get all for Admin) |
| `PUT` | `/api/orders/<id>/status` | Update order status (`Pending` ➔ `Preparing` ➔ `Ready` ➔ `Completed` ➔ `Cancelled`) |
| `GET` | `/api/profile/<userId>` | Fetch student profile details |
| `PUT` | `/api/profile/<userId>` | Update student profile information |
| `GET` | `/api/admin/stats` | Calculate live metrics (total orders, revenue, active cooking items) |

---

## 🍲 Sample Dishes Included

1. **Masala Dosa** — ₹50 | Breakfast | Veg
2. **Veg Cheese Sandwich** — ₹45 | Snacks | Veg
3. **Chicken Biryani Box** — ₹120 | Lunch | Non-Veg
4. **Paneer Butter Masala Thali** — ₹95 | Lunch | Veg
5. **Crispy Samosa (2 Pcs)** — ₹25 | Snacks | Veg
6. **Cold Coffee with Ice Cream** — ₹50 | Beverages | Veg
7. **Chole Bhature** — ₹65 | Breakfast | Veg
8. **Egg Roll / Frankie** — ₹55 | Snacks | Non-Veg
9. **Fresh Mango Lassi** — ₹40 | Beverages | Veg
10. **Veg Hakka Noodles** — ₹70 | Lunch | Veg
11. **Masala Chai (Hot Tea)** — ₹15 | Beverages | Veg

---

## 🎓 BCA 2nd-Year Viva & Demonstration Guide

### 1. Project Overview
- **Name**: Campus Mart – Smart Food & Essentials Pre-Order System
- **Architecture**: Client-Server RESTful Architecture with NoSQL Document Database.
- **Frontend**: HTML5, CSS3 (Modern Flexbox, CSS Grid, CSS Variables), Vanilla JavaScript (Fetch API).
- **Backend**: Python Flask REST API with PyMongo / MongoDB Document Engine.

### 2. Viva Questions & Answers:
1. **Why use MongoDB instead of SQL for this project?**
   - *Answer:* MongoDB is a document-oriented NoSQL database. Canteen orders have nested arrays of food items with varying quantities and options. Storing orders as JSON documents is more natural and flexible than multi-table SQL joins.
2. **How does the frontend communicate with MongoDB?**
   - *Answer:* The frontend Vanilla JavaScript uses standard asynchronous `fetch()` HTTP requests via our `api.js` client to communicate with the Flask REST endpoints (`/api/auth`, `/api/menu`, `/api/orders`), which execute MongoDB queries via PyMongo.
3. **How does real-time status tracking work?**
   - *Answer:* On `orders.html`, the client initiates a periodic poll every 4 seconds to check the status in MongoDB and automatically updates the 4-stage visual progress tracker (`Pending` ➔ `Preparing` ➔ `Ready for Pickup` ➔ `Completed`).
4. **How are passwords stored securely?**
   - *Answer:* Passwords are never saved in plaintext; they are hashed using the standard SHA-256 cryptographic hashing algorithm before being saved into the MongoDB `users` collection.
