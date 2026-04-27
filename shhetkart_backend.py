# ============================================================
#  SHHETKART — Python FastAPI Backend
#  Full REST API | MySQL + SQLAlchemy | JWT Auth
#  Run: uvicorn main:app --reload --port 8000
# ============================================================

# ── requirements.txt (pip install -r requirements.txt) ──────
# fastapi==0.111.0
# uvicorn[standard]==0.29.0
# sqlalchemy==2.0.29
# pymysql==1.1.0
# python-jose[cryptography]==3.3.0
# passlib[bcrypt]==1.7.4
# python-multipart==0.0.9
# pydantic[email]==2.7.0
# python-dotenv==1.0.1
# ------------------------------------------------------------

# ── .env file ───────────────────────────────────────────────
# DB_HOST=localhost
# DB_PORT=3306
# DB_NAME=shhetkart
# DB_USER=root
# DB_PASS=yourpassword
# SECRET_KEY=your-super-secret-jwt-key-change-this
# ACCESS_TOKEN_EXPIRE_MINUTES=10080
# ------------------------------------------------------------

import os, math
from datetime import datetime, timedelta
from typing import Optional, List
from dotenv import load_dotenv

from fastapi import FastAPI, Depends, HTTPException, status, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, Session

from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel, EmailStr

load_dotenv()

# ─────────────────────────────────────────────
#  DB CONNECTION
# ─────────────────────────────────────────────
DB_URL = (
    f"mysql+pymysql://{os.getenv('DB_USER')}:{os.getenv('DB_PASS')}"
    f"@{os.getenv('DB_HOST')}:{os.getenv('DB_PORT')}/{os.getenv('DB_NAME')}"
    f"?charset=utf8mb4"
)
engine       = create_engine(DB_URL, pool_pre_ping=True, pool_size=10)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ─────────────────────────────────────────────
#  AUTH CONFIG
# ─────────────────────────────────────────────
SECRET_KEY   = os.getenv("SECRET_KEY", "changeme-shhetkart-secret")
ALGORITHM    = "HS256"
TOKEN_EXPIRE = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 10080))

pwd_ctx   = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2    = OAuth2PasswordBearer(tokenUrl="/admin/login")
cust_oauth = OAuth2PasswordBearer(tokenUrl="/auth/login", auto_error=False)

def hash_password(plain: str) -> str:
    return pwd_ctx.hash(plain)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_ctx.verify(plain, hashed)

def create_token(data: dict, role: str = "customer") -> str:
    payload = data.copy()
    payload.update({"exp": datetime.utcnow() + timedelta(minutes=TOKEN_EXPIRE), "role": role})
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

# ─────────────────────────────────────────────
#  DEPENDENCIES
# ─────────────────────────────────────────────
def get_current_admin(token: str = Depends(oauth2), db: Session = Depends(get_db)):
    payload = decode_token(token)
    if payload.get("role") not in ("superadmin", "manager", "support"):
        raise HTTPException(status_code=403, detail="Admin access required")
    admin = db.execute(text("SELECT * FROM admin_users WHERE id=:id AND is_active=1"),
                       {"id": payload["sub"]}).fetchone()
    if not admin:
        raise HTTPException(status_code=401, detail="Admin not found")
    return admin

def get_superadmin(admin=Depends(get_current_admin)):
    if admin.role != "superadmin":
        raise HTTPException(status_code=403, detail="Superadmin only")
    return admin

def get_current_customer(token: str = Depends(cust_oauth), db: Session = Depends(get_db)):
    if not token:
        raise HTTPException(status_code=401, detail="Login required")
    payload = decode_token(token)
    cust = db.execute(text("SELECT * FROM customers WHERE id=:id AND is_active=1"),
                      {"id": payload["sub"]}).fetchone()
    if not cust:
        raise HTTPException(status_code=401, detail="Customer not found")
    return cust

# ─────────────────────────────────────────────
#  PYDANTIC SCHEMAS
# ─────────────────────────────────────────────
class AdminLogin(BaseModel):
    email: str
    password: str

class CustomerRegister(BaseModel):
    full_name: str
    phone: str
    email: Optional[EmailStr] = None
    password: str

class CustomerLogin(BaseModel):
    phone: str
    password: str

class AddressCreate(BaseModel):
    label: str = "Home"
    flat_no: Optional[str]
    building_name: Optional[str]
    society_name: Optional[str]
    street: Optional[str]
    area: str
    city: str = "Pune"
    pincode: str
    landmark: Optional[str]
    latitude: Optional[float]
    longitude: Optional[float]
    is_default: bool = False

class CartItem(BaseModel):
    product_id: int
    quantity: int

class PlaceOrder(BaseModel):
    address_id: int
    payment_method: str = "cod"
    coupon_code: Optional[str] = None
    customer_note: Optional[str] = None

class ProductCreate(BaseModel):
    category_id: int
    name: str
    name_marathi: Optional[str]
    slug: str
    description: Optional[str]
    unit: str
    mrp: float
    selling_price: float
    bulk_price: Optional[float]
    bulk_min_qty: int = 10
    stock_qty: int = 0
    low_stock_alert: int = 10
    image_url: Optional[str]
    is_organic: bool = False
    is_featured: bool = False
    farmer_name: Optional[str]
    farmer_location: Optional[str]

class StockUpdate(BaseModel):
    qty_change: int
    change_type: str
    note: Optional[str]

class OrderStatusUpdate(BaseModel):
    order_status: str
    admin_note: Optional[str]
    delivery_agent_id: Optional[int]

# ─────────────────────────────────────────────
#  APP
# ─────────────────────────────────────────────
app = FastAPI(
    title="ShhetKart API",
    description="Farm-to-Society Grocery App — Pune | Owner Full Control",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # In production: set your frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─────────────────────────────────────────────
#  HELPERS
# ─────────────────────────────────────────────
def row_to_dict(row):
    if row is None:
        return None
    return dict(row._mapping)

def rows_to_list(rows):
    return [dict(r._mapping) for r in rows]

def generate_order_number(db: Session) -> str:
    today = datetime.now().strftime("%Y%m%d")
    count = db.execute(text("SELECT COUNT(*) as c FROM orders WHERE DATE(created_at)=CURDATE()")).fetchone().c
    return f"SHKT-{today}-{str(count+1).zfill(4)}"

# ═══════════════════════════════════════════════════════════════
#  ① AUTH — ADMIN LOGIN
# ═══════════════════════════════════════════════════════════════
@app.post("/admin/login", tags=["Admin Auth"])
def admin_login(body: AdminLogin, db: Session = Depends(get_db)):
    admin = db.execute(text("SELECT * FROM admin_users WHERE email=:e AND is_active=1"),
                       {"e": body.email}).fetchone()
    if not admin or not verify_password(body.password, admin.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    db.execute(text("UPDATE admin_users SET last_login=NOW() WHERE id=:id"), {"id": admin.id})
    db.commit()
    token = create_token({"sub": str(admin.id)}, role=admin.role)
    return {"access_token": token, "token_type": "bearer",
            "admin": {"id": admin.id, "name": admin.name, "role": admin.role}}

# ═══════════════════════════════════════════════════════════════
#  ② AUTH — CUSTOMER REGISTER / LOGIN
# ═══════════════════════════════════════════════════════════════
@app.post("/auth/register", tags=["Customer Auth"])
def customer_register(body: CustomerRegister, db: Session = Depends(get_db)):
    existing = db.execute(text("SELECT id FROM customers WHERE phone=:p"), {"p": body.phone}).fetchone()
    if existing:
        raise HTTPException(status_code=400, detail="Phone already registered")
    hashed = hash_password(body.password)
    import random, string
    ref_code = "SHKT" + "".join(random.choices(string.ascii_uppercase + string.digits, k=6))
    db.execute(text("""
        INSERT INTO customers (full_name, phone, email, password_hash, referral_code, is_verified)
        VALUES (:n, :p, :e, :h, :r, 1)
    """), {"n": body.full_name, "p": body.phone, "e": body.email, "h": hashed, "r": ref_code})
    db.commit()
    cust = db.execute(text("SELECT * FROM customers WHERE phone=:p"), {"p": body.phone}).fetchone()
    token = create_token({"sub": str(cust.id)}, role="customer")
    return {"access_token": token, "token_type": "bearer",
            "customer": {"id": cust.id, "name": cust.full_name, "phone": cust.phone}}

@app.post("/auth/login", tags=["Customer Auth"])
def customer_login(body: CustomerLogin, db: Session = Depends(get_db)):
    cust = db.execute(text("SELECT * FROM customers WHERE phone=:p AND is_active=1"),
                      {"p": body.phone}).fetchone()
    if not cust or not verify_password(body.password, cust.password_hash):
        raise HTTPException(status_code=401, detail="Invalid phone or password")
    token = create_token({"sub": str(cust.id)}, role="customer")
    return {"access_token": token, "token_type": "bearer",
            "customer": {"id": cust.id, "name": cust.full_name, "phone": cust.phone,
                         "wallet_balance": float(cust.wallet_balance)}}

# ═══════════════════════════════════════════════════════════════
#  ③ PRODUCTS — PUBLIC (no auth needed)
# ═══════════════════════════════════════════════════════════════
@app.get("/products", tags=["Products"])
def list_products(
    category_id: Optional[int] = None,
    search: Optional[str] = None,
    is_featured: Optional[bool] = None,
    is_organic: Optional[bool] = None,
    sort_by: str = "created_at",
    page: int = 1, limit: int = 20,
    db: Session = Depends(get_db)
):
    where = ["p.is_active = 1"]
    params = {}
    if category_id:
        where.append("p.category_id = :cat"); params["cat"] = category_id
    if search:
        where.append("(p.name LIKE :s OR p.name_marathi LIKE :s)"); params["s"] = f"%{search}%"
    if is_featured is not None:
        where.append("p.is_featured = :feat"); params["feat"] = int(is_featured)
    if is_organic is not None:
        where.append("p.is_organic = :org"); params["org"] = int(is_organic)

    order_map = {"price_asc": "p.selling_price ASC", "price_desc": "p.selling_price DESC",
                 "popular": "p.total_sold DESC", "rating": "p.rating DESC",
                 "created_at": "p.created_at DESC"}
    order_clause = order_map.get(sort_by, "p.created_at DESC")
    where_clause = " AND ".join(where)
    offset = (page - 1) * limit

    total = db.execute(text(f"SELECT COUNT(*) as c FROM products p WHERE {where_clause}"), params).fetchone().c
    rows  = db.execute(text(f"""
        SELECT p.*, c.name as category_name, c.icon_emoji
        FROM products p JOIN categories c ON p.category_id = c.id
        WHERE {where_clause} ORDER BY {order_clause} LIMIT :lim OFFSET :off
    """), {**params, "lim": limit, "off": offset}).fetchall()

    return {"total": total, "page": page, "pages": math.ceil(total/limit),
            "products": rows_to_list(rows)}

@app.get("/products/{slug}", tags=["Products"])
def get_product(slug: str, db: Session = Depends(get_db)):
    row = db.execute(text("""
        SELECT p.*, c.name as category_name, c.icon_emoji
        FROM products p JOIN categories c ON p.category_id = c.id
        WHERE p.slug = :slug AND p.is_active = 1
    """), {"slug": slug}).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Product not found")
    product = row_to_dict(row)
    reviews = db.execute(text("""
        SELECT r.*, c.full_name FROM reviews r
        JOIN customers c ON r.customer_id = c.id
        WHERE r.product_id = :pid AND r.is_approved = 1
        ORDER BY r.created_at DESC LIMIT 10
    """), {"pid": product["id"]}).fetchall()
    product["reviews"] = rows_to_list(reviews)
    return product

@app.get("/categories", tags=["Products"])
def list_categories(db: Session = Depends(get_db)):
    rows = db.execute(text("SELECT * FROM categories WHERE is_active=1 ORDER BY sort_order")).fetchall()
    return rows_to_list(rows)

# ═══════════════════════════════════════════════════════════════
#  ④ CART
# ═══════════════════════════════════════════════════════════════
@app.get("/cart", tags=["Cart"])
def get_cart(cust=Depends(get_current_customer), db: Session = Depends(get_db)):
    items = db.execute(text("""
        SELECT c.id, c.quantity, p.id as product_id, p.name, p.name_marathi,
               p.selling_price, p.mrp, p.unit, p.image_url, p.stock_qty,
               p.bulk_price, p.bulk_min_qty,
               (c.quantity * p.selling_price) as item_total
        FROM cart c JOIN products p ON c.product_id = p.id
        WHERE c.customer_id = :cid AND p.is_active = 1
    """), {"cid": cust.id}).fetchall()
    items_list = rows_to_list(items)
    subtotal = sum(float(i["item_total"]) for i in items_list)
    delivery_charge = 0 if subtotal >= 500 else 40
    return {"items": items_list, "subtotal": round(subtotal, 2),
            "delivery_charge": delivery_charge,
            "total": round(subtotal + delivery_charge, 2),
            "item_count": len(items_list)}

@app.post("/cart", tags=["Cart"])
def update_cart(body: CartItem, cust=Depends(get_current_customer), db: Session = Depends(get_db)):
    product = db.execute(text("SELECT * FROM products WHERE id=:id AND is_active=1"),
                         {"id": body.product_id}).fetchone()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    if body.quantity > product.stock_qty:
        raise HTTPException(status_code=400, detail=f"Only {product.stock_qty} in stock")
    if body.quantity <= 0:
        db.execute(text("DELETE FROM cart WHERE customer_id=:c AND product_id=:p"),
                   {"c": cust.id, "p": body.product_id})
    else:
        db.execute(text("""
            INSERT INTO cart (customer_id, product_id, quantity) VALUES (:c, :p, :q)
            ON DUPLICATE KEY UPDATE quantity = :q, updated_at = NOW()
        """), {"c": cust.id, "p": body.product_id, "q": body.quantity})
    db.commit()
    return {"message": "Cart updated"}

@app.delete("/cart", tags=["Cart"])
def clear_cart(cust=Depends(get_current_customer), db: Session = Depends(get_db)):
    db.execute(text("DELETE FROM cart WHERE customer_id=:c"), {"c": cust.id})
    db.commit()
    return {"message": "Cart cleared"}

# ═══════════════════════════════════════════════════════════════
#  ⑤ ADDRESSES
# ═══════════════════════════════════════════════════════════════
@app.get("/addresses", tags=["Addresses"])
def get_addresses(cust=Depends(get_current_customer), db: Session = Depends(get_db)):
    rows = db.execute(text("SELECT * FROM customer_addresses WHERE customer_id=:c ORDER BY is_default DESC"),
                      {"c": cust.id}).fetchall()
    return rows_to_list(rows)

@app.post("/addresses", tags=["Addresses"])
def add_address(body: AddressCreate, cust=Depends(get_current_customer), db: Session = Depends(get_db)):
    if body.is_default:
        db.execute(text("UPDATE customer_addresses SET is_default=0 WHERE customer_id=:c"), {"c": cust.id})
    db.execute(text("""
        INSERT INTO customer_addresses
        (customer_id, label, flat_no, building_name, society_name, street, area, city, pincode, landmark, latitude, longitude, is_default)
        VALUES (:cid,:lab,:flat,:bld,:soc,:str,:area,:city,:pin,:land,:lat,:lng,:def)
    """), {"cid": cust.id, "lab": body.label, "flat": body.flat_no, "bld": body.building_name,
           "soc": body.society_name, "str": body.street, "area": body.area, "city": body.city,
           "pin": body.pincode, "land": body.landmark, "lat": body.latitude, "lng": body.longitude,
           "def": int(body.is_default)})
    db.commit()
    return {"message": "Address saved"}

# ═══════════════════════════════════════════════════════════════
#  ⑥ ORDERS — CUSTOMER
# ═══════════════════════════════════════════════════════════════
@app.post("/orders", tags=["Orders"])
def place_order(body: PlaceOrder, cust=Depends(get_current_customer), db: Session = Depends(get_db)):
    # Fetch cart
    cart_items = db.execute(text("""
        SELECT c.quantity, p.id, p.name, p.unit, p.selling_price, p.stock_qty,
               p.bulk_price, p.bulk_min_qty
        FROM cart c JOIN products p ON c.product_id = p.id
        WHERE c.customer_id = :cid AND p.is_active = 1
    """), {"cid": cust.id}).fetchall()
    if not cart_items:
        raise HTTPException(status_code=400, detail="Cart is empty")

    # Validate stock
    for item in cart_items:
        if item.quantity > item.stock_qty:
            raise HTTPException(status_code=400, detail=f"{item.name} has insufficient stock")

    # Calculate totals
    subtotal = 0
    for item in cart_items:
        price = float(item.bulk_price) if (item.bulk_price and item.quantity >= item.bulk_min_qty) else float(item.selling_price)
        subtotal += price * item.quantity

    discount = 0
    coupon_id = None
    if body.coupon_code:
        coupon = db.execute(text("""
            SELECT * FROM coupons WHERE code=:code AND is_active=1
            AND (valid_until IS NULL OR valid_until >= NOW())
            AND (usage_limit IS NULL OR used_count < usage_limit)
            AND min_order_amount <= :amt
        """), {"code": body.coupon_code, "amt": subtotal}).fetchone()
        if coupon:
            coupon_id = coupon.id
            if coupon.discount_type == "percent":
                discount = min(subtotal * float(coupon.discount_value) / 100,
                               float(coupon.max_discount) if coupon.max_discount else 9999)
            else:
                discount = float(coupon.discount_value)

    delivery_charge = 0 if (subtotal - discount) >= 500 else 40
    total = round(subtotal - discount + delivery_charge, 2)

    order_number = generate_order_number(db)
    is_bulk = subtotal > 2000

    # Insert order
    result = db.execute(text("""
        INSERT INTO orders
        (order_number, customer_id, address_id, coupon_id, subtotal, discount_amount,
         delivery_charge, total_amount, payment_method, is_bulk_order, customer_note)
        VALUES (:on,:cid,:aid,:coup,:sub,:disc,:del,:tot,:pay,:bulk,:note)
    """), {"on": order_number, "cid": cust.id, "aid": body.address_id, "coup": coupon_id,
           "sub": subtotal, "disc": discount, "del": delivery_charge, "tot": total,
           "pay": body.payment_method, "bulk": int(is_bulk), "note": body.customer_note})
    order_id = result.lastrowid

    # Insert order items & deduct stock
    for item in cart_items:
        price = float(item.bulk_price) if (item.bulk_price and item.quantity >= item.bulk_min_qty) else float(item.selling_price)
        line_total = round(price * item.quantity, 2)
        db.execute(text("""
            INSERT INTO order_items (order_id, product_id, product_name, unit, quantity, unit_price, total_price)
            VALUES (:oid,:pid,:pn,:u,:q,:up,:tp)
        """), {"oid": order_id, "pid": item.id, "pn": item.name, "u": item.unit,
               "q": item.quantity, "up": price, "tp": line_total})
        # Deduct stock
        db.execute(text("UPDATE products SET stock_qty = stock_qty - :q, total_sold = total_sold + :q WHERE id=:pid"),
                   {"q": item.quantity, "pid": item.id})
        # Log inventory
        prod = db.execute(text("SELECT stock_qty FROM products WHERE id=:id"), {"id": item.id}).fetchone()
        db.execute(text("""
            INSERT INTO inventory_log (product_id, change_type, qty_before, qty_changed, qty_after, note)
            VALUES (:pid,'sale',:qb,:qc,:qa,:n)
        """), {"pid": item.id, "qb": prod.stock_qty + item.quantity,
               "qc": -item.quantity, "qa": prod.stock_qty, "n": f"Order {order_number}"})

    # Update customer stats
    db.execute(text("UPDATE customers SET total_orders=total_orders+1, total_spent=total_spent+:t WHERE id=:c"),
               {"t": total, "c": cust.id})
    # Update coupon usage
    if coupon_id:
        db.execute(text("UPDATE coupons SET used_count=used_count+1 WHERE id=:id"), {"id": coupon_id})
    # Clear cart
    db.execute(text("DELETE FROM cart WHERE customer_id=:c"), {"c": cust.id})
    db.commit()

    return {"message": "Order placed!", "order_number": order_number,
            "order_id": order_id, "total": total, "payment_method": body.payment_method}

@app.get("/orders", tags=["Orders"])
def my_orders(page: int = 1, limit: int = 10,
              cust=Depends(get_current_customer), db: Session = Depends(get_db)):
    offset = (page - 1) * limit
    total = db.execute(text("SELECT COUNT(*) as c FROM orders WHERE customer_id=:c"), {"c": cust.id}).fetchone().c
    rows = db.execute(text("""
        SELECT o.*, a.society_name, a.area, a.city
        FROM orders o JOIN customer_addresses a ON o.address_id = a.id
        WHERE o.customer_id = :c ORDER BY o.created_at DESC LIMIT :lim OFFSET :off
    """), {"c": cust.id, "lim": limit, "off": offset}).fetchall()
    orders = rows_to_list(rows)
    for order in orders:
        order["items"] = rows_to_list(db.execute(text(
            "SELECT * FROM order_items WHERE order_id=:oid"), {"oid": order["id"]}).fetchall())
    return {"total": total, "orders": orders}

# ═══════════════════════════════════════════════════════════════
#  ⑦ ADMIN — DASHBOARD (Owner Only)
# ═══════════════════════════════════════════════════════════════
@app.get("/admin/dashboard", tags=["Admin Dashboard"])
def owner_dashboard(admin=Depends(get_current_admin), db: Session = Depends(get_db)):
    stats = {}

    # Today's numbers
    today = db.execute(text("""
        SELECT COUNT(*) as orders, COALESCE(SUM(total_amount),0) as revenue
        FROM orders WHERE DATE(created_at) = CURDATE() AND order_status != 'cancelled'
    """)).fetchone()
    stats["today_orders"]  = today.orders
    stats["today_revenue"] = float(today.revenue)

    # Total numbers
    totals = db.execute(text("""
        SELECT
            (SELECT COUNT(*) FROM customers WHERE is_active=1) as total_customers,
            (SELECT COUNT(*) FROM orders) as total_orders,
            (SELECT COALESCE(SUM(total_amount),0) FROM orders WHERE order_status='delivered') as total_revenue,
            (SELECT COUNT(*) FROM orders WHERE order_status='placed') as pending_orders,
            (SELECT COUNT(*) FROM products WHERE stock_qty <= low_stock_alert AND is_active=1) as low_stock_count
    """)).fetchone()
    stats.update(dict(totals._mapping))

    # Revenue last 7 days
    revenue_chart = db.execute(text("""
        SELECT DATE(created_at) as date, COUNT(*) as orders, SUM(total_amount) as revenue
        FROM orders WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        AND order_status != 'cancelled'
        GROUP BY DATE(created_at) ORDER BY date
    """)).fetchall()
    stats["revenue_chart"] = rows_to_list(revenue_chart)

    # Top 5 products
    top_products = db.execute(text("""
        SELECT p.name, SUM(oi.quantity) as units_sold, SUM(oi.total_price) as revenue
        FROM order_items oi JOIN products p ON oi.product_id = p.id
        JOIN orders o ON oi.order_id = o.id WHERE o.order_status = 'delivered'
        GROUP BY p.id ORDER BY revenue DESC LIMIT 5
    """)).fetchall()
    stats["top_products"] = rows_to_list(top_products)

    # Recent orders
    recent_orders = db.execute(text("""
        SELECT o.order_number, o.total_amount, o.order_status, o.created_at,
               c.full_name, c.phone
        FROM orders o JOIN customers c ON o.customer_id = c.id
        ORDER BY o.created_at DESC LIMIT 10
    """)).fetchall()
    stats["recent_orders"] = rows_to_list(recent_orders)

    return stats

# ═══════════════════════════════════════════════════════════════
#  ⑧ ADMIN — ALL CUSTOMERS
# ═══════════════════════════════════════════════════════════════
@app.get("/admin/customers", tags=["Admin Customers"])
def all_customers(page: int = 1, limit: int = 20, search: Optional[str] = None,
                  admin=Depends(get_current_admin), db: Session = Depends(get_db)):
    where = "WHERE 1=1"
    params = {}
    if search:
        where += " AND (full_name LIKE :s OR phone LIKE :s OR email LIKE :s)"
        params["s"] = f"%{search}%"
    total = db.execute(text(f"SELECT COUNT(*) as c FROM customers {where}"), params).fetchone().c
    rows = db.execute(text(f"""
        SELECT * FROM v_customer_summary {where}
        ORDER BY joined_on DESC LIMIT :lim OFFSET :off
    """), {**params, "lim": limit, "off": (page-1)*limit}).fetchall()
    return {"total": total, "customers": rows_to_list(rows)}

@app.get("/admin/customers/{customer_id}", tags=["Admin Customers"])
def customer_detail(customer_id: int, admin=Depends(get_current_admin), db: Session = Depends(get_db)):
    cust = row_to_dict(db.execute(text("SELECT * FROM customers WHERE id=:id"), {"id": customer_id}).fetchone())
    if not cust:
        raise HTTPException(status_code=404, detail="Customer not found")
    cust.pop("password_hash", None)
    cust["addresses"] = rows_to_list(db.execute(text(
        "SELECT * FROM customer_addresses WHERE customer_id=:id"), {"id": customer_id}).fetchall())
    cust["orders"] = rows_to_list(db.execute(text(
        "SELECT * FROM orders WHERE customer_id=:id ORDER BY created_at DESC LIMIT 20"), {"id": customer_id}).fetchall())
    return cust

@app.patch("/admin/customers/{customer_id}/block", tags=["Admin Customers"])
def block_customer(customer_id: int, admin=Depends(get_superadmin), db: Session = Depends(get_db)):
    db.execute(text("UPDATE customers SET is_active = NOT is_active WHERE id=:id"), {"id": customer_id})
    db.commit()
    return {"message": "Customer status toggled"}

# ═══════════════════════════════════════════════════════════════
#  ⑨ ADMIN — ALL ORDERS
# ═══════════════════════════════════════════════════════════════
@app.get("/admin/orders", tags=["Admin Orders"])
def all_orders(page: int = 1, limit: int = 20,
               status: Optional[str] = None, search: Optional[str] = None,
               admin=Depends(get_current_admin), db: Session = Depends(get_db)):
    where = ["1=1"]
    params = {}
    if status:
        where.append("o.order_status = :status"); params["status"] = status
    if search:
        where.append("(o.order_number LIKE :s OR c.phone LIKE :s OR c.full_name LIKE :s)")
        params["s"] = f"%{search}%"
    w = " AND ".join(where)
    total = db.execute(text(f"""
        SELECT COUNT(*) as c FROM orders o JOIN customers c ON o.customer_id=c.id WHERE {w}
    """), params).fetchone().c
    rows = db.execute(text(f"""
        SELECT o.*, c.full_name, c.phone, a.society_name, a.area, a.city
        FROM orders o JOIN customers c ON o.customer_id=c.id
        JOIN customer_addresses a ON o.address_id=a.id
        WHERE {w} ORDER BY o.created_at DESC LIMIT :lim OFFSET :off
    """), {**params, "lim": limit, "off": (page-1)*limit}).fetchall()
    return {"total": total, "orders": rows_to_list(rows)}

@app.patch("/admin/orders/{order_id}/status", tags=["Admin Orders"])
def update_order_status(order_id: int, body: OrderStatusUpdate,
                        admin=Depends(get_current_admin), db: Session = Depends(get_db)):
    valid_statuses = ['placed','confirmed','packed','out_for_delivery','delivered','cancelled','returned']
    if body.order_status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Use: {valid_statuses}")
    update_fields = "order_status=:status, updated_at=NOW()"
    params = {"status": body.order_status, "oid": order_id}
    if body.admin_note:
        update_fields += ", admin_note=:note"; params["note"] = body.admin_note
    if body.delivery_agent_id:
        update_fields += ", delivery_agent_id=:agent"; params["agent"] = body.delivery_agent_id
    if body.order_status == "delivered":
        update_fields += ", delivered_at=NOW(), payment_status='paid'"; params["status"] = "delivered"
    db.execute(text(f"UPDATE orders SET {update_fields} WHERE id=:oid"), params)
    db.commit()
    return {"message": f"Order status updated to {body.order_status}"}

# ═══════════════════════════════════════════════════════════════
#  ⑩ ADMIN — PRODUCT MANAGEMENT
# ═══════════════════════════════════════════════════════════════
@app.post("/admin/products", tags=["Admin Products"])
def create_product(body: ProductCreate, admin=Depends(get_current_admin), db: Session = Depends(get_db)):
    db.execute(text("""
        INSERT INTO products
        (category_id,name,name_marathi,slug,description,unit,mrp,selling_price,bulk_price,
         bulk_min_qty,stock_qty,low_stock_alert,image_url,is_organic,is_featured,farmer_name,farmer_location)
        VALUES(:cat,:nm,:nmm,:slug,:desc,:unit,:mrp,:sp,:bp,:bmq,:sq,:lsa,:img,:org,:feat,:fn,:fl)
    """), {"cat": body.category_id, "nm": body.name, "nmm": body.name_marathi, "slug": body.slug,
           "desc": body.description, "unit": body.unit, "mrp": body.mrp, "sp": body.selling_price,
           "bp": body.bulk_price, "bmq": body.bulk_min_qty, "sq": body.stock_qty,
           "lsa": body.low_stock_alert, "img": body.image_url, "org": int(body.is_organic),
           "feat": int(body.is_featured), "fn": body.farmer_name, "fl": body.farmer_location})
    db.commit()
    return {"message": "Product created"}

@app.patch("/admin/products/{product_id}/stock", tags=["Admin Products"])
def update_stock(product_id: int, body: StockUpdate,
                 admin=Depends(get_current_admin), db: Session = Depends(get_db)):
    prod = db.execute(text("SELECT * FROM products WHERE id=:id"), {"id": product_id}).fetchone()
    if not prod:
        raise HTTPException(status_code=404, detail="Product not found")
    new_qty = prod.stock_qty + body.qty_change
    if new_qty < 0:
        raise HTTPException(status_code=400, detail="Stock cannot go negative")
    db.execute(text("UPDATE products SET stock_qty=:q WHERE id=:id"), {"q": new_qty, "id": product_id})
    db.execute(text("""
        INSERT INTO inventory_log (product_id, admin_id, change_type, qty_before, qty_changed, qty_after, note)
        VALUES (:pid,:aid,:ct,:qb,:qc,:qa,:n)
    """), {"pid": product_id, "aid": admin.id, "ct": body.change_type,
           "qb": prod.stock_qty, "qc": body.qty_change, "qa": new_qty, "n": body.note})
    db.commit()
    return {"message": "Stock updated", "new_stock": new_qty}

@app.get("/admin/inventory/low-stock", tags=["Admin Products"])
def low_stock_alert(admin=Depends(get_current_admin), db: Session = Depends(get_db)):
    rows = db.execute(text("SELECT * FROM v_low_stock")).fetchall()
    return rows_to_list(rows)

# ═══════════════════════════════════════════════════════════════
#  ⑪ ADMIN — ANALYTICS
# ═══════════════════════════════════════════════════════════════
@app.get("/admin/analytics/revenue", tags=["Admin Analytics"])
def revenue_analytics(days: int = 30, admin=Depends(get_current_admin), db: Session = Depends(get_db)):
    rows = db.execute(text("""
        SELECT DATE(created_at) as date, COUNT(*) as orders,
               SUM(total_amount) as revenue, AVG(total_amount) as avg_order_value
        FROM orders WHERE created_at >= DATE_SUB(NOW(), INTERVAL :days DAY)
        AND order_status != 'cancelled'
        GROUP BY DATE(created_at) ORDER BY date
    """), {"days": days}).fetchall()
    return rows_to_list(rows)

@app.get("/admin/analytics/top-products", tags=["Admin Analytics"])
def top_products_analytics(limit: int = 10, admin=Depends(get_current_admin), db: Session = Depends(get_db)):
    rows = db.execute(text("SELECT * FROM v_top_products LIMIT :lim"), {"lim": limit}).fetchall()
    return rows_to_list(rows)

# ═══════════════════════════════════════════════════════════════
#  ⑫ BANNERS (homepage)
# ═══════════════════════════════════════════════════════════════
@app.get("/banners", tags=["Banners"])
def get_banners(db: Session = Depends(get_db)):
    rows = db.execute(text("SELECT * FROM banners WHERE is_active=1 ORDER BY sort_order")).fetchall()
    return rows_to_list(rows)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
