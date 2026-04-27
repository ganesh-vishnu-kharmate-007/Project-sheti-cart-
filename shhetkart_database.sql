-- ============================================================
--  SHHETKART — Complete MySQL Database Schema
--  Farm-to-Society Grocery App | Owner: Full Control
--  Version: 1.0
-- ============================================================

CREATE DATABASE IF NOT EXISTS shhetkart CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE shhetkart;

-- ============================================================
-- 1. ADMIN / OWNER TABLE
-- ============================================================
CREATE TABLE admin_users (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    name          VARCHAR(100) NOT NULL,
    email         VARCHAR(150) UNIQUE NOT NULL,
    phone         VARCHAR(15) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role          ENUM('superadmin','manager','support') DEFAULT 'manager',
    is_active     BOOLEAN DEFAULT TRUE,
    created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login    DATETIME
);

-- ============================================================
-- 2. CUSTOMERS TABLE
-- ============================================================
CREATE TABLE customers (
    id               INT AUTO_INCREMENT PRIMARY KEY,
    full_name        VARCHAR(150) NOT NULL,
    phone            VARCHAR(15) UNIQUE NOT NULL,
    email            VARCHAR(150) UNIQUE,
    password_hash    VARCHAR(255),
    profile_image    VARCHAR(300),
    otp_code         VARCHAR(6),
    otp_expires_at   DATETIME,
    is_verified      BOOLEAN DEFAULT FALSE,
    is_active        BOOLEAN DEFAULT TRUE,
    referral_code    VARCHAR(20) UNIQUE,
    referred_by      INT,
    wallet_balance   DECIMAL(10,2) DEFAULT 0.00,
    total_orders     INT DEFAULT 0,
    total_spent      DECIMAL(10,2) DEFAULT 0.00,
    created_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at       DATETIME ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (referred_by) REFERENCES customers(id) ON DELETE SET NULL
);

-- ============================================================
-- 3. CUSTOMER ADDRESSES
-- ============================================================
CREATE TABLE customer_addresses (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    customer_id   INT NOT NULL,
    label         ENUM('Home','Work','Society','Other') DEFAULT 'Home',
    flat_no       VARCHAR(50),
    building_name VARCHAR(150),
    society_name  VARCHAR(200),
    street        VARCHAR(300),
    area          VARCHAR(150),
    city          VARCHAR(100) DEFAULT 'Pune',
    pincode       VARCHAR(10) NOT NULL,
    landmark      VARCHAR(200),
    latitude      DECIMAL(10,8),
    longitude     DECIMAL(11,8),
    is_default    BOOLEAN DEFAULT FALSE,
    created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

-- ============================================================
-- 4. CATEGORIES
-- ============================================================
CREATE TABLE categories (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,
    name_marathi VARCHAR(100),
    slug        VARCHAR(100) UNIQUE NOT NULL,
    image_url   VARCHAR(300),
    icon_emoji  VARCHAR(10),
    sort_order  INT DEFAULT 0,
    is_active   BOOLEAN DEFAULT TRUE,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO categories (name, name_marathi, slug, icon_emoji, sort_order) VALUES
('Grains & Cereals',  'धान्य',         'grains-cereals',  '🌾', 1),
('Vegetables',        'भाजीपाला',      'vegetables',      '🥦', 2),
('Pulses & Lentils',  'डाळी',          'pulses-lentils',  '🫘', 3),
('Flours & Atta',     'पीठ',           'flours-atta',     '🌿', 4),
('Dairy & Eggs',      'दूध डेअरी',     'dairy-eggs',      '🥛', 5),
('Oils & Ghee',       'तेल तूप',       'oils-ghee',       '🫙', 6),
('Spices',            'मसाले',         'spices',          '🌶️', 7),
('Seasonal Special',  'मोसमी विशेष',  'seasonal-special','⭐', 8);

-- ============================================================
-- 5. PRODUCTS
-- ============================================================
CREATE TABLE products (
    id               INT AUTO_INCREMENT PRIMARY KEY,
    category_id      INT NOT NULL,
    name             VARCHAR(200) NOT NULL,
    name_marathi     VARCHAR(200),
    slug             VARCHAR(200) UNIQUE NOT NULL,
    description      TEXT,
    description_marathi TEXT,
    brand            VARCHAR(100) DEFAULT 'ShhetKart Farm',
    sku              VARCHAR(100) UNIQUE,
    unit             VARCHAR(50) NOT NULL,           -- '1 kg', '500 g', '1 litre'
    weight_grams     INT,                            -- for sorting/comparison
    mrp              DECIMAL(10,2) NOT NULL,
    selling_price    DECIMAL(10,2) NOT NULL,
    bulk_price       DECIMAL(10,2),                  -- for societies ordering 10kg+
    bulk_min_qty     INT DEFAULT 10,
    stock_qty        INT DEFAULT 0,
    low_stock_alert  INT DEFAULT 10,
    image_url        VARCHAR(300),
    image_url_2      VARCHAR(300),
    is_organic       BOOLEAN DEFAULT FALSE,
    is_featured      BOOLEAN DEFAULT FALSE,
    is_active        BOOLEAN DEFAULT TRUE,
    farmer_name      VARCHAR(150),
    farmer_location  VARCHAR(200),
    rating           DECIMAL(3,2) DEFAULT 0.00,
    review_count     INT DEFAULT 0,
    total_sold       INT DEFAULT 0,
    created_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at       DATETIME ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id)
);

-- Seed Products
INSERT INTO products (category_id, name, name_marathi, slug, unit, mrp, selling_price, bulk_price, stock_qty, is_organic, is_featured, farmer_location) VALUES
(1, 'Gahu (Wheat)',          'गहू',          'gahu-wheat-1kg',     '1 kg',  42,  38,  32, 500, TRUE,  TRUE,  'Solapur, Maharashtra'),
(1, 'Bajri (Pearl Millet)',  'बाजरी',        'bajri-1kg',          '1 kg',  55,  50,  44, 300, TRUE,  TRUE,  'Nashik, Maharashtra'),
(1, 'Jwari (Sorghum)',       'ज्वारी',       'jwari-sorghum-1kg',  '1 kg',  48,  44,  38, 400, TRUE,  TRUE,  'Aurangabad, Maharashtra'),
(1, 'Tandool (Rice)',        'तांदूळ',       'tandool-rice-1kg',   '1 kg',  65,  58,  50, 600, FALSE, TRUE,  'Kolhapur, Maharashtra'),
(1, 'Makai (Corn)',          'मका',          'makai-corn-1kg',     '1 kg',  35,  30,  25, 200, FALSE, FALSE, 'Pune, Maharashtra'),
(3, 'Tur Dal',               'तूर डाळ',     'tur-dal-1kg',        '1 kg',  135, 125, 110, 300, FALSE, TRUE,  'Latur, Maharashtra'),
(3, 'Harbhara (Chickpea)',   'हरभरा',        'harbhara-1kg',       '1 kg',  90,  82,  72, 250, TRUE,  FALSE, 'Ahmednagar, Maharashtra'),
(3, 'Moong Dal',             'मूग डाळ',     'moong-dal-500g',     '500 g', 75,  68,  60, 180, FALSE, FALSE, 'Satara, Maharashtra'),
(4, 'Gahu Atta (Wheat Flour)','गहू पीठ',    'gahu-atta-2kg',      '2 kg',  90,  82,  70, 400, TRUE,  TRUE,  'Solapur, Maharashtra'),
(4, 'Jwari Pith',            'ज्वारी पीठ',  'jwari-pith-1kg',     '1 kg',  55,  50,  44, 220, TRUE,  FALSE, 'Aurangabad, Maharashtra'),
(6, 'Groundnut Oil',         'शेंगदाणा तेल','groundnut-oil-1l',   '1 litre',180, 165, 150, 150, FALSE, FALSE, 'Pune, Maharashtra'),
(6, 'Pure Cow Ghee',         'गाईचे तूप',   'cow-ghee-500g',      '500 g', 350, 320, 290, 80,  TRUE,  TRUE,  'Satara, Maharashtra');

-- ============================================================
-- 6. INVENTORY LOG (Owner tracks all stock changes)
-- ============================================================
CREATE TABLE inventory_log (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    product_id   INT NOT NULL,
    admin_id     INT,
    change_type  ENUM('restock','sale','adjustment','damage','return') NOT NULL,
    qty_before   INT NOT NULL,
    qty_changed  INT NOT NULL,
    qty_after    INT NOT NULL,
    note         VARCHAR(300),
    created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (admin_id) REFERENCES admin_users(id) ON DELETE SET NULL
);

-- ============================================================
-- 7. CART
-- ============================================================
CREATE TABLE cart (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    customer_id INT NOT NULL,
    product_id  INT NOT NULL,
    quantity    INT NOT NULL DEFAULT 1,
    added_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_cart_item (customer_id, product_id),
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id)  REFERENCES products(id) ON DELETE CASCADE
);

-- ============================================================
-- 8. COUPONS
-- ============================================================
CREATE TABLE coupons (
    id               INT AUTO_INCREMENT PRIMARY KEY,
    code             VARCHAR(30) UNIQUE NOT NULL,
    description      VARCHAR(300),
    discount_type    ENUM('percent','flat') NOT NULL,
    discount_value   DECIMAL(10,2) NOT NULL,
    min_order_amount DECIMAL(10,2) DEFAULT 0,
    max_discount     DECIMAL(10,2),
    usage_limit      INT DEFAULT 1,
    used_count       INT DEFAULT 0,
    valid_from       DATETIME,
    valid_until      DATETIME,
    is_active        BOOLEAN DEFAULT TRUE,
    created_at       DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 9. ORDERS
-- ============================================================
CREATE TABLE orders (
    id                  INT AUTO_INCREMENT PRIMARY KEY,
    order_number        VARCHAR(30) UNIQUE NOT NULL,  -- SHKT-20240001
    customer_id         INT NOT NULL,
    address_id          INT NOT NULL,
    coupon_id           INT,
    subtotal            DECIMAL(10,2) NOT NULL,
    discount_amount     DECIMAL(10,2) DEFAULT 0,
    delivery_charge     DECIMAL(10,2) DEFAULT 0,
    tax_amount          DECIMAL(10,2) DEFAULT 0,
    total_amount        DECIMAL(10,2) NOT NULL,
    payment_method      ENUM('cod','upi','card','wallet','netbanking') DEFAULT 'cod',
    payment_status      ENUM('pending','paid','failed','refunded') DEFAULT 'pending',
    payment_id          VARCHAR(200),
    order_status        ENUM('placed','confirmed','packed','out_for_delivery','delivered','cancelled','returned') DEFAULT 'placed',
    delivery_agent_id   INT,
    estimated_delivery  DATETIME,
    delivered_at        DATETIME,
    cancellation_reason VARCHAR(300),
    customer_note       VARCHAR(500),
    admin_note          VARCHAR(500),
    is_bulk_order       BOOLEAN DEFAULT FALSE,
    created_at          DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id)       REFERENCES customers(id),
    FOREIGN KEY (address_id)        REFERENCES customer_addresses(id),
    FOREIGN KEY (coupon_id)         REFERENCES coupons(id) ON DELETE SET NULL,
    FOREIGN KEY (delivery_agent_id) REFERENCES delivery_agents(id) ON DELETE SET NULL
);

-- ============================================================
-- 10. ORDER ITEMS
-- ============================================================
CREATE TABLE order_items (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    order_id     INT NOT NULL,
    product_id   INT NOT NULL,
    product_name VARCHAR(200) NOT NULL,  -- snapshot at time of order
    unit         VARCHAR(50)  NOT NULL,
    quantity     INT NOT NULL,
    unit_price   DECIMAL(10,2) NOT NULL,
    total_price  DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (order_id)   REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id)
);

-- ============================================================
-- 11. DELIVERY AGENTS
-- ============================================================
CREATE TABLE delivery_agents (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    full_name     VARCHAR(150) NOT NULL,
    phone         VARCHAR(15) UNIQUE NOT NULL,
    email         VARCHAR(150),
    password_hash VARCHAR(255) NOT NULL,
    vehicle_type  ENUM('bike','cycle','auto') DEFAULT 'bike',
    vehicle_no    VARCHAR(20),
    is_available  BOOLEAN DEFAULT TRUE,
    is_active     BOOLEAN DEFAULT TRUE,
    rating        DECIMAL(3,2) DEFAULT 5.00,
    total_deliveries INT DEFAULT 0,
    created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 12. PAYMENTS
-- ============================================================
CREATE TABLE payments (
    id               INT AUTO_INCREMENT PRIMARY KEY,
    order_id         INT NOT NULL,
    customer_id      INT NOT NULL,
    amount           DECIMAL(10,2) NOT NULL,
    method           ENUM('cod','upi','card','wallet','netbanking'),
    gateway          VARCHAR(50),       -- razorpay, paytm, etc
    gateway_order_id VARCHAR(200),
    gateway_pay_id   VARCHAR(200),
    status           ENUM('initiated','success','failed','refunded') DEFAULT 'initiated',
    refund_amount    DECIMAL(10,2),
    refund_at        DATETIME,
    created_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id)    REFERENCES orders(id),
    FOREIGN KEY (customer_id) REFERENCES customers(id)
);

-- ============================================================
-- 13. REVIEWS
-- ============================================================
CREATE TABLE reviews (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    product_id  INT NOT NULL,
    customer_id INT NOT NULL,
    order_id    INT NOT NULL,
    rating      TINYINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    title       VARCHAR(200),
    body        TEXT,
    is_approved BOOLEAN DEFAULT FALSE,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY one_review_per_order (customer_id, product_id, order_id),
    FOREIGN KEY (product_id)  REFERENCES products(id),
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    FOREIGN KEY (order_id)    REFERENCES orders(id)
);

-- ============================================================
-- 14. NOTIFICATIONS
-- ============================================================
CREATE TABLE notifications (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    customer_id INT,        -- NULL = broadcast to all
    title       VARCHAR(200) NOT NULL,
    body        TEXT NOT NULL,
    type        ENUM('order','promo','restock','system') DEFAULT 'system',
    is_read     BOOLEAN DEFAULT FALSE,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

-- ============================================================
-- 15. BANNERS (Homepage Banners — Owner Controlled)
-- ============================================================
CREATE TABLE banners (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    title      VARCHAR(200),
    image_url  VARCHAR(300) NOT NULL,
    link_url   VARCHAR(300),
    sort_order INT DEFAULT 0,
    is_active  BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- USEFUL VIEWS FOR OWNER DASHBOARD
-- ============================================================

-- Daily Revenue View
CREATE VIEW v_daily_revenue AS
SELECT
    DATE(created_at)        AS order_date,
    COUNT(*)                AS total_orders,
    SUM(total_amount)       AS revenue,
    AVG(total_amount)       AS avg_order_value,
    SUM(CASE WHEN order_status = 'delivered' THEN total_amount ELSE 0 END) AS confirmed_revenue
FROM orders
WHERE order_status NOT IN ('cancelled')
GROUP BY DATE(created_at);

-- Top Products View
CREATE VIEW v_top_products AS
SELECT
    p.id, p.name, p.name_marathi, p.selling_price, p.stock_qty,
    SUM(oi.quantity)    AS total_units_sold,
    SUM(oi.total_price) AS total_revenue
FROM products p
JOIN order_items oi ON p.id = oi.product_id
JOIN orders o ON oi.order_id = o.id
WHERE o.order_status = 'delivered'
GROUP BY p.id
ORDER BY total_revenue DESC;

-- Customer Summary View
CREATE VIEW v_customer_summary AS
SELECT
    c.id, c.full_name, c.phone, c.email,
    c.wallet_balance, c.total_orders, c.total_spent,
    c.created_at AS joined_on,
    MAX(o.created_at) AS last_order_date
FROM customers c
LEFT JOIN orders o ON c.id = o.customer_id
GROUP BY c.id;

-- Low Stock Alert View
CREATE VIEW v_low_stock AS
SELECT id, name, name_marathi, stock_qty, low_stock_alert, unit
FROM products
WHERE stock_qty <= low_stock_alert AND is_active = TRUE
ORDER BY stock_qty ASC;

-- ============================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================
CREATE INDEX idx_orders_customer    ON orders(customer_id);
CREATE INDEX idx_orders_status      ON orders(order_status);
CREATE INDEX idx_orders_created     ON orders(created_at);
CREATE INDEX idx_products_category  ON products(category_id);
CREATE INDEX idx_products_active    ON products(is_active);
CREATE INDEX idx_cart_customer      ON cart(customer_id);
CREATE INDEX idx_customers_phone    ON customers(phone);

-- ============================================================
-- DEFAULT SUPERADMIN (Change password after first login!)
-- Password: admin@shhetkart123 (bcrypt hash below is placeholder)
-- ============================================================
INSERT INTO admin_users (name, email, phone, password_hash, role) VALUES
('ShhetKart Owner', 'owner@shhetkart.com', '9999999999',
 '$2b$12$PLACEHOLDER_HASH_CHANGE_THIS_IMMEDIATELY', 'superadmin');
