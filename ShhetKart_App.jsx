import { useState, useEffect, useCallback } from "react";

// ─── CONFIG ─────────────────────────────────────────────────
const API = "http://localhost:8000"; // Change to your deployed API URL

const fetchAPI = async (path, opts = {}, token = null) => {
  const headers = { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
  const res = await fetch(`${API}${path}`, { ...opts, headers: { ...headers, ...opts.headers } });
  if (!res.ok) { const e = await res.json(); throw new Error(e.detail || "Error"); }
  return res.json();
};

// ─── MOCK DATA (works offline while API is being set up) ────
const MOCK_CATEGORIES = [
  { id: 1, name: "Grains & Cereals", name_marathi: "धान्य", icon_emoji: "🌾" },
  { id: 2, name: "Vegetables", name_marathi: "भाजीपाला", icon_emoji: "🥦" },
  { id: 3, name: "Pulses & Lentils", name_marathi: "डाळी", icon_emoji: "🫘" },
  { id: 4, name: "Flours & Atta", name_marathi: "पीठ", icon_emoji: "🌿" },
  { id: 5, name: "Dairy & Eggs", name_marathi: "दूध डेअरी", icon_emoji: "🥛" },
  { id: 6, name: "Oils & Ghee", name_marathi: "तेल तूप", icon_emoji: "🫙" },
];
const MOCK_PRODUCTS = [
  { id: 1, name: "Gahu (Wheat)", name_marathi: "गहू", slug: "gahu", category_id: 1, unit: "1 kg", mrp: 42, selling_price: 38, bulk_price: 32, stock_qty: 500, is_organic: true, is_featured: true, farmer_location: "Solapur", rating: 4.8, review_count: 124, icon: "🌾" },
  { id: 2, name: "Bajri (Pearl Millet)", name_marathi: "बाजरी", slug: "bajri", category_id: 1, unit: "1 kg", mrp: 55, selling_price: 50, bulk_price: 44, stock_qty: 300, is_organic: true, is_featured: true, farmer_location: "Nashik", rating: 4.7, review_count: 89, icon: "🌾" },
  { id: 3, name: "Jwari (Sorghum)", name_marathi: "ज्वारी", slug: "jwari", category_id: 1, unit: "1 kg", mrp: 48, selling_price: 44, bulk_price: 38, stock_qty: 400, is_organic: true, is_featured: true, farmer_location: "Aurangabad", rating: 4.6, review_count: 67, icon: "🌿" },
  { id: 4, name: "Tandool (Rice)", name_marathi: "तांदूळ", slug: "tandool", category_id: 1, unit: "1 kg", mrp: 65, selling_price: 58, bulk_price: 50, stock_qty: 600, is_organic: false, is_featured: true, farmer_location: "Kolhapur", rating: 4.9, review_count: 210, icon: "🍚" },
  { id: 5, name: "Tur Dal", name_marathi: "तूर डाळ", slug: "tur-dal", category_id: 3, unit: "1 kg", mrp: 135, selling_price: 125, bulk_price: 110, stock_qty: 300, is_organic: false, is_featured: true, farmer_location: "Latur", rating: 4.8, review_count: 156, icon: "🫘" },
  { id: 6, name: "Harbhara (Chickpea)", name_marathi: "हरभरा", slug: "harbhara", category_id: 3, unit: "1 kg", mrp: 90, selling_price: 82, bulk_price: 72, stock_qty: 250, is_organic: true, is_featured: false, farmer_location: "Ahmednagar", rating: 4.5, review_count: 43, icon: "🟡" },
  { id: 7, name: "Gahu Atta", name_marathi: "गहू पीठ", slug: "gahu-atta", category_id: 4, unit: "2 kg", mrp: 90, selling_price: 82, bulk_price: 70, stock_qty: 400, is_organic: true, is_featured: true, farmer_location: "Solapur", rating: 4.9, review_count: 312, icon: "🌿" },
  { id: 8, name: "Pure Cow Ghee", name_marathi: "गाईचे तूप", slug: "cow-ghee", category_id: 6, unit: "500 g", mrp: 350, selling_price: 320, bulk_price: 290, stock_qty: 80, is_organic: true, is_featured: true, farmer_location: "Satara", rating: 5.0, review_count: 88, icon: "🫙" },
];

// ─── ICONS ──────────────────────────────────────────────────
const Icon = {
  search: "🔍", cart: "🛒", user: "👤", home: "🏠", orders: "📦",
  back: "←", plus: "+", minus: "−", close: "✕", check: "✓",
  organic: "🌿", star: "⭐", location: "📍", truck: "🚚", farmer: "👨‍🌾",
  menu: "☰", logout: "🚪", heart: "❤️", bulkbag: "🛍️"
};

// ─── MAIN APP ────────────────────────────────────────────────
export default function ShhetKartApp() {
  const [screen, setScreen] = useState("home"); // home | product | cart | orders | login | register
  const [token, setToken] = useState(() => localStorage.getItem("shkt_token"));
  const [customer, setCustomer] = useState(() => { try { return JSON.parse(localStorage.getItem("shkt_customer")); } catch { return null; } });
  const [cart, setCart] = useState({});
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [toast, setToast] = useState(null);
  const [products] = useState(MOCK_PRODUCTS);
  const [categories] = useState(MOCK_CATEGORIES);

  const showToast = useCallback((msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2500);
  }, []);

  const addToCart = (product, qty = 1) => {
    setCart(prev => {
      const current = prev[product.id]?.qty || 0;
      const newQty = current + qty;
      if (newQty <= 0) { const n = { ...prev }; delete n[product.id]; return n; }
      return { ...prev, [product.id]: { product, qty: newQty } };
    });
    showToast(`Added to cart 🛒`);
  };

  const setCartQty = (product, qty) => {
    if (qty <= 0) { setCart(prev => { const n = { ...prev }; delete n[product.id]; return n; }); return; }
    setCart(prev => ({ ...prev, [product.id]: { product, qty } }));
  };

  const cartCount = Object.values(cart).reduce((s, i) => s + i.qty, 0);
  const cartTotal = Object.values(cart).reduce((s, i) => s + i.qty * i.product.selling_price, 0);
  const deliveryCharge = cartTotal >= 500 ? 0 : (cartCount > 0 ? 40 : 0);

  const filteredProducts = products.filter(p => {
    const matchCat = !selectedCategory || p.category_id === selectedCategory;
    const matchSearch = !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.name_marathi.includes(searchQuery);
    return matchCat && matchSearch;
  });

  const handleLogout = () => {
    localStorage.removeItem("shkt_token");
    localStorage.removeItem("shkt_customer");
    setToken(null); setCustomer(null); setCart({});
    setScreen("home"); showToast("Logged out");
  };

  return (
    <div style={styles.app}>
      {/* ── TOAST ── */}
      {toast && (
        <div style={{ ...styles.toast, background: toast.type === "error" ? "#ef4444" : "#22c55e" }}>
          {toast.msg}
        </div>
      )}

      {/* ── SCREENS ── */}
      {screen === "home" && (
        <HomeScreen products={filteredProducts} categories={categories} cart={cart}
          cartCount={cartCount} cartTotal={cartTotal} selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory} searchQuery={searchQuery}
          setSearchQuery={setSearchQuery} addToCart={addToCart} setCartQty={setCartQty}
          onProductClick={p => { setSelectedProduct(p); setScreen("product"); }}
          onCartClick={() => setScreen("cart")}
          onLoginClick={() => setScreen(customer ? "profile" : "login")}
          customer={customer} onOrdersClick={() => setScreen("orders")} />
      )}
      {screen === "product" && selectedProduct && (
        <ProductScreen product={selectedProduct} cart={cart}
          addToCart={addToCart} setCartQty={setCartQty}
          onBack={() => setScreen("home")}
          onCartClick={() => setScreen("cart")} cartCount={cartCount} />
      )}
      {screen === "cart" && (
        <CartScreen cart={cart} cartTotal={cartTotal} deliveryCharge={deliveryCharge}
          setCartQty={setCartQty} onBack={() => setScreen("home")}
          onCheckout={() => { if (!customer) { setScreen("login"); } else { showToast("Order placed! 🎉", "success"); setCart({}); setScreen("orders"); } }}
          customer={customer} />
      )}
      {screen === "login" && (
        <LoginScreen onBack={() => setScreen("home")}
          onLogin={(cust, tok) => { setCustomer(cust); setToken(tok); localStorage.setItem("shkt_token", tok); localStorage.setItem("shkt_customer", JSON.stringify(cust)); setScreen("home"); showToast(`Welcome back, ${cust.name}! 🌾`); }}
          onRegisterClick={() => setScreen("register")}
          showToast={showToast} />
      )}
      {screen === "register" && (
        <RegisterScreen onBack={() => setScreen("login")}
          onRegister={(cust, tok) => { setCustomer(cust); setToken(tok); localStorage.setItem("shkt_token", tok); localStorage.setItem("shkt_customer", JSON.stringify(cust)); setScreen("home"); showToast(`Welcome to ShhetKart, ${cust.name}! 🌾`); }}
          showToast={showToast} />
      )}
      {screen === "orders" && (
        <OrdersScreen onBack={() => setScreen("home")} customer={customer}
          onLoginClick={() => setScreen("login")} />
      )}
      {screen === "profile" && customer && (
        <ProfileScreen customer={customer} onBack={() => setScreen("home")}
          onLogout={handleLogout} onOrdersClick={() => setScreen("orders")} />
      )}

      {/* ── BOTTOM NAV ── */}
      <BottomNav screen={screen} setScreen={setScreen} cartCount={cartCount} customer={customer} />
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// HOME SCREEN
// ══════════════════════════════════════════════════════════════
function HomeScreen({ products, categories, cart, cartCount, cartTotal, selectedCategory,
  setSelectedCategory, searchQuery, setSearchQuery, addToCart, setCartQty,
  onProductClick, onCartClick, onLoginClick, customer, onOrdersClick }) {
  return (
    <div style={styles.screen}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <div style={styles.logo}>🌾 ShhetKart</div>
          <div style={styles.subtitle}>शेतातून थेट तुमच्या दारी · Farm to Door</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {cartCount > 0 && (
            <button style={styles.cartBtn} onClick={onCartClick}>
              {Icon.cart} {cartCount}
              <span style={styles.cartBadge}>₹{cartTotal}</span>
            </button>
          )}
          <button style={styles.iconBtn} onClick={onLoginClick}>
            {customer ? `👤 ${customer.name?.split(" ")[0]}` : Icon.user}
          </button>
        </div>
      </div>

      {/* Hero Banner */}
      <div style={styles.heroBanner}>
        <div style={styles.heroText}>
          <div style={styles.heroTitle}>Fresh From Pune's Farms</div>
          <div style={styles.heroSub}>Gahu · Bajri · Jwari & more</div>
          <div style={styles.heroTag}>🚚 Free delivery above ₹500</div>
        </div>
        <div style={styles.heroEmoji}>🌾</div>
      </div>

      {/* Search */}
      <div style={styles.searchWrap}>
        <span style={styles.searchIcon}>{Icon.search}</span>
        <input style={styles.searchInput} placeholder="Search gahu, bajri, jwari..."
          value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
        {searchQuery && <button style={styles.clearBtn} onClick={() => setSearchQuery("")}>{Icon.close}</button>}
      </div>

      <div style={styles.scrollContent}>
        {/* Categories */}
        <div style={styles.sectionTitle}>Shop by Category</div>
        <div style={styles.catRow}>
          <button style={{ ...styles.catChip, ...(selectedCategory === null ? styles.catActive : {}) }}
            onClick={() => setSelectedCategory(null)}>All</button>
          {categories.map(c => (
            <button key={c.id}
              style={{ ...styles.catChip, ...(selectedCategory === c.id ? styles.catActive : {}) }}
              onClick={() => setSelectedCategory(selectedCategory === c.id ? null : c.id)}>
              {c.icon_emoji} {c.name}
            </button>
          ))}
        </div>

        {/* Featured */}
        {!selectedCategory && !searchQuery && (
          <>
            <div style={styles.sectionTitle}>⭐ Best Sellers</div>
            <div style={styles.productGrid}>
              {products.filter(p => p.is_featured).slice(0, 4).map(p => (
                <ProductCard key={p.id} product={p} cart={cart} addToCart={addToCart}
                  setCartQty={setCartQty} onClick={() => onProductClick(p)} />
              ))}
            </div>
            <div style={styles.sectionTitle}>🌿 Organic Products</div>
          </>
        )}

        {/* All Products */}
        {(selectedCategory || searchQuery) && (
          <div style={styles.sectionTitle}>
            {searchQuery ? `Results for "${searchQuery}"` : categories.find(c => c.id === selectedCategory)?.name}
          </div>
        )}
        <div style={styles.productGrid}>
          {filteredProducts(products, selectedCategory, searchQuery).map(p => (
            <ProductCard key={p.id} product={p} cart={cart} addToCart={addToCart}
              setCartQty={setCartQty} onClick={() => onProductClick(p)} />
          ))}
        </div>

        {/* Bulk Order Banner */}
        <div style={styles.bulkBanner}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>🏘️ Society Bulk Orders</div>
            <div style={{ fontSize: 12, opacity: 0.85, marginTop: 4 }}>Order 10kg+ and save up to 20%</div>
          </div>
          <button style={styles.bulkBtn}>Order Now</button>
        </div>

        <div style={{ height: 80 }} />
      </div>
    </div>
  );
}

function filteredProducts(products, cat, search) {
  return products.filter(p => {
    const matchCat = !cat || p.category_id === cat;
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.name_marathi.includes(search);
    return matchCat && matchSearch;
  });
}

// ══════════════════════════════════════════════════════════════
// PRODUCT CARD
// ══════════════════════════════════════════════════════════════
function ProductCard({ product, cart, addToCart, setCartQty, onClick }) {
  const cartItem = cart[product.id];
  const discount = Math.round(((product.mrp - product.selling_price) / product.mrp) * 100);
  return (
    <div style={styles.productCard}>
      <div style={styles.productImageWrap} onClick={onClick}>
        <div style={styles.productEmoji}>{product.icon || "🌾"}</div>
        {product.is_organic && <div style={styles.organicBadge}>🌿 Organic</div>}
        {discount > 0 && <div style={styles.discountBadge}>{discount}% OFF</div>}
      </div>
      <div style={styles.productInfo} onClick={onClick}>
        <div style={styles.productName}>{product.name}</div>
        <div style={styles.productMarathi}>{product.name_marathi}</div>
        <div style={styles.productUnit}>{product.unit}</div>
        <div style={{ fontSize: 11, color: "#6b7280" }}>📍 {product.farmer_location}</div>
        <div style={styles.productRating}>⭐ {product.rating} ({product.review_count})</div>
      </div>
      <div style={styles.productBottom}>
        <div>
          <span style={styles.price}>₹{product.selling_price}</span>
          {product.mrp > product.selling_price && <span style={styles.mrp}> ₹{product.mrp}</span>}
        </div>
        {!cartItem ? (
          <button style={styles.addBtn} onClick={e => { e.stopPropagation(); addToCart(product); }}>
            + Add
          </button>
        ) : (
          <div style={styles.qtyControl}>
            <button style={styles.qtyBtn} onClick={e => { e.stopPropagation(); setCartQty(product, cartItem.qty - 1); }}>−</button>
            <span style={styles.qtyNum}>{cartItem.qty}</span>
            <button style={styles.qtyBtn} onClick={e => { e.stopPropagation(); setCartQty(product, cartItem.qty + 1); }}>+</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// PRODUCT DETAIL SCREEN
// ══════════════════════════════════════════════════════════════
function ProductScreen({ product, cart, addToCart, setCartQty, onBack, onCartClick, cartCount }) {
  const cartItem = cart[product.id];
  const discount = Math.round(((product.mrp - product.selling_price) / product.mrp) * 100);
  return (
    <div style={styles.screen}>
      <div style={styles.topBar}>
        <button style={styles.backBtn} onClick={onBack}>{Icon.back} Back</button>
        {cartCount > 0 && <button style={styles.iconBtn} onClick={onCartClick}>{Icon.cart} {cartCount}</button>}
      </div>
      <div style={styles.scrollContent}>
        <div style={styles.detailImageWrap}>
          <div style={{ fontSize: 100 }}>{product.icon || "🌾"}</div>
          {product.is_organic && <div style={styles.organicBadgeLg}>🌿 Certified Organic</div>}
        </div>
        <div style={styles.detailBody}>
          <div style={styles.detailName}>{product.name}</div>
          <div style={styles.detailMarathi}>{product.name_marathi}</div>
          <div style={styles.detailUnit}>{product.unit}</div>
          <div style={styles.detailRating}>⭐ {product.rating} · {product.review_count} reviews</div>
          <div style={styles.priceRow}>
            <span style={styles.detailPrice}>₹{product.selling_price}</span>
            {product.mrp > product.selling_price && <span style={styles.detailMrp}>₹{product.mrp}</span>}
            {discount > 0 && <span style={styles.discountTag}>{discount}% OFF</span>}
          </div>
          {product.bulk_price && (
            <div style={styles.bulkInfo}>
              🛍️ Bulk price: <strong>₹{product.bulk_price}</strong> for 10+ units (society orders)
            </div>
          )}
          <div style={styles.farmerCard}>
            <div style={{ fontSize: 20 }}>👨‍🌾</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>Directly from Farmer</div>
              <div style={{ fontSize: 12, color: "#6b7280" }}>📍 {product.farmer_location}</div>
            </div>
          </div>
          <div style={styles.detailSection}>
            <div style={styles.detailSectionTitle}>Why ShhetKart?</div>
            <div style={styles.feature}>✓ Direct from farm — no middlemen</div>
            <div style={styles.feature}>✓ Quality tested before dispatch</div>
            <div style={styles.feature}>✓ Packed fresh to preserve nutrients</div>
          </div>
          <div style={{ height: 100 }} />
        </div>
      </div>
      <div style={styles.stickyBottom}>
        {!cartItem ? (
          <button style={styles.bigAddBtn} onClick={() => addToCart(product)}>
            + Add to Cart — ₹{product.selling_price}
          </button>
        ) : (
          <div style={styles.bigQtyRow}>
            <button style={styles.bigQtyBtn} onClick={() => setCartQty(product, cartItem.qty - 1)}>−</button>
            <span style={styles.bigQtyNum}>{cartItem.qty} in cart · ₹{cartItem.qty * product.selling_price}</span>
            <button style={styles.bigQtyBtn} onClick={() => setCartQty(product, cartItem.qty + 1)}>+</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// CART SCREEN
// ══════════════════════════════════════════════════════════════
function CartScreen({ cart, cartTotal, deliveryCharge, setCartQty, onBack, onCheckout, customer }) {
  const items = Object.values(cart);
  const finalTotal = cartTotal + deliveryCharge;
  if (items.length === 0) return (
    <div style={styles.screen}>
      <div style={styles.topBar}><button style={styles.backBtn} onClick={onBack}>{Icon.back} Back</button></div>
      <div style={styles.emptyState}><div style={{ fontSize: 60 }}>🛒</div><div style={styles.emptyText}>Cart is empty</div><div style={styles.emptySub}>Add some fresh farm products!</div><button style={styles.bigAddBtn} onClick={onBack}>Browse Products</button></div>
    </div>
  );
  return (
    <div style={styles.screen}>
      <div style={styles.topBar}><button style={styles.backBtn} onClick={onBack}>{Icon.back}</button><div style={styles.screenTitle}>My Cart ({items.length} items)</div></div>
      <div style={styles.scrollContent}>
        {items.map(({ product, qty }) => (
          <div key={product.id} style={styles.cartItem}>
            <div style={styles.cartItemEmoji}>{product.icon || "🌾"}</div>
            <div style={styles.cartItemInfo}>
              <div style={styles.cartItemName}>{product.name}</div>
              <div style={styles.cartItemUnit}>{product.unit} · ₹{product.selling_price} each</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={styles.cartItemTotal}>₹{qty * product.selling_price}</div>
              <div style={styles.qtyControl}>
                <button style={styles.qtyBtn} onClick={() => setCartQty(product, qty - 1)}>−</button>
                <span style={styles.qtyNum}>{qty}</span>
                <button style={styles.qtyBtn} onClick={() => setCartQty(product, qty + 1)}>+</button>
              </div>
            </div>
          </div>
        ))}
        <div style={styles.billCard}>
          <div style={styles.billTitle}>Bill Summary</div>
          <div style={styles.billRow}><span>Subtotal</span><span>₹{cartTotal}</span></div>
          <div style={styles.billRow}><span>Delivery</span><span style={{ color: deliveryCharge === 0 ? "#22c55e" : "#111" }}>{deliveryCharge === 0 ? "FREE 🎉" : `₹${deliveryCharge}`}</span></div>
          {deliveryCharge > 0 && <div style={styles.freeDeliveryHint}>Add ₹{500 - cartTotal} more for free delivery</div>}
          <div style={styles.billDivider} />
          <div style={{ ...styles.billRow, fontWeight: 700, fontSize: 16 }}><span>Total</span><span>₹{finalTotal}</span></div>
        </div>
        <div style={{ height: 100 }} />
      </div>
      <div style={styles.stickyBottom}>
        <button style={styles.bigAddBtn} onClick={onCheckout}>
          {customer ? `Place Order · ₹${finalTotal}` : "Login to Place Order"}
        </button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// LOGIN SCREEN
// ══════════════════════════════════════════════════════════════
function LoginScreen({ onBack, onLogin, onRegisterClick, showToast }) {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!phone || !password) { showToast("Enter phone & password", "error"); return; }
    setLoading(true);
    try {
      const data = await fetchAPI("/auth/login", { method: "POST", body: JSON.stringify({ phone, password }) });
      onLogin(data.customer, data.access_token);
    } catch (e) {
      // Demo mode: accept any login
      onLogin({ id: 1, name: phone, phone }, "demo-token");
      showToast("Demo login successful! 🌾");
    }
    setLoading(false);
  };

  return (
    <div style={styles.screen}>
      <div style={styles.topBar}><button style={styles.backBtn} onClick={onBack}>{Icon.back}</button></div>
      <div style={styles.authContainer}>
        <div style={{ fontSize: 60, textAlign: "center" }}>🌾</div>
        <div style={styles.authTitle}>Welcome to ShhetKart</div>
        <div style={styles.authSub}>शेतातून थेट तुमच्या दारी</div>
        <input style={styles.authInput} placeholder="📱 Phone Number" value={phone} onChange={e => setPhone(e.target.value)} type="tel" />
        <input style={styles.authInput} placeholder="🔒 Password" value={password} onChange={e => setPassword(e.target.value)} type="password" />
        <button style={styles.bigAddBtn} onClick={handleLogin} disabled={loading}>{loading ? "Logging in..." : "Login"}</button>
        <div style={styles.authSwitch}>New here? <span style={styles.authLink} onClick={onRegisterClick}>Create Account</span></div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// REGISTER SCREEN
// ══════════════════════════════════════════════════════════════
function RegisterScreen({ onBack, onRegister, showToast }) {
  const [form, setForm] = useState({ full_name: "", phone: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  const handleRegister = async () => {
    if (!form.full_name || !form.phone || !form.password) { showToast("Fill all required fields", "error"); return; }
    setLoading(true);
    try {
      const data = await fetchAPI("/auth/register", { method: "POST", body: JSON.stringify(form) });
      onRegister(data.customer, data.access_token);
    } catch (e) {
      onRegister({ id: 1, name: form.full_name, phone: form.phone }, "demo-token");
      showToast("Demo registration! 🌾");
    }
    setLoading(false);
  };

  return (
    <div style={styles.screen}>
      <div style={styles.topBar}><button style={styles.backBtn} onClick={onBack}>{Icon.back}</button></div>
      <div style={styles.authContainer}>
        <div style={{ fontSize: 60, textAlign: "center" }}>🌾</div>
        <div style={styles.authTitle}>Create Account</div>
        <input style={styles.authInput} placeholder="👤 Full Name *" value={form.full_name} onChange={set("full_name")} />
        <input style={styles.authInput} placeholder="📱 Phone Number *" value={form.phone} onChange={set("phone")} type="tel" />
        <input style={styles.authInput} placeholder="📧 Email (optional)" value={form.email} onChange={set("email")} type="email" />
        <input style={styles.authInput} placeholder="🔒 Password *" value={form.password} onChange={set("password")} type="password" />
        <button style={styles.bigAddBtn} onClick={handleRegister} disabled={loading}>{loading ? "Creating..." : "Create Account"}</button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// ORDERS SCREEN
// ══════════════════════════════════════════════════════════════
function OrdersScreen({ onBack, customer, onLoginClick }) {
  const mockOrders = [
    { order_number: "SHKT-20240001", total_amount: 186, order_status: "delivered", created_at: "2024-01-15", items: [{ product_name: "Gahu (Wheat)", quantity: 3, unit: "1 kg" }, { product_name: "Jwari", quantity: 2, unit: "1 kg" }] },
    { order_number: "SHKT-20240002", total_amount: 320, order_status: "out_for_delivery", created_at: "2024-01-20", items: [{ product_name: "Pure Cow Ghee", quantity: 1, unit: "500 g" }] },
  ];
  const statusColor = { placed: "#f59e0b", confirmed: "#3b82f6", packed: "#8b5cf6", out_for_delivery: "#f97316", delivered: "#22c55e", cancelled: "#ef4444" };
  const statusLabel = { placed: "Order Placed", confirmed: "Confirmed", packed: "Packing", out_for_delivery: "Out for Delivery", delivered: "Delivered", cancelled: "Cancelled" };

  if (!customer) return (
    <div style={styles.screen}>
      <div style={styles.topBar}><button style={styles.backBtn} onClick={onBack}>{Icon.back}</button></div>
      <div style={styles.emptyState}><div style={{ fontSize: 60 }}>📦</div><div style={styles.emptyText}>Login to see orders</div><button style={styles.bigAddBtn} onClick={onLoginClick}>Login</button></div>
    </div>
  );
  return (
    <div style={styles.screen}>
      <div style={styles.topBar}><button style={styles.backBtn} onClick={onBack}>{Icon.back}</button><div style={styles.screenTitle}>My Orders</div></div>
      <div style={styles.scrollContent}>
        {mockOrders.map(order => (
          <div key={order.order_number} style={styles.orderCard}>
            <div style={styles.orderHeader}>
              <div style={styles.orderNum}>{order.order_number}</div>
              <div style={{ ...styles.statusBadge, background: statusColor[order.order_status] + "20", color: statusColor[order.order_status] }}>{statusLabel[order.order_status]}</div>
            </div>
            <div style={styles.orderItems}>{order.items.map(i => `${i.product_name} × ${i.quantity}`).join(", ")}</div>
            <div style={styles.orderFooter}><span style={styles.orderTotal}>₹{order.total_amount}</span><span style={styles.orderDate}>{order.created_at}</span></div>
          </div>
        ))}
        <div style={{ height: 80 }} />
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// PROFILE SCREEN
// ══════════════════════════════════════════════════════════════
function ProfileScreen({ customer, onBack, onLogout, onOrdersClick }) {
  return (
    <div style={styles.screen}>
      <div style={styles.topBar}><button style={styles.backBtn} onClick={onBack}>{Icon.back}</button><div style={styles.screenTitle}>Profile</div></div>
      <div style={styles.scrollContent}>
        <div style={styles.profileCard}>
          <div style={{ fontSize: 60, textAlign: "center" }}>👤</div>
          <div style={styles.profileName}>{customer.name || customer.full_name}</div>
          <div style={styles.profilePhone}>📱 {customer.phone}</div>
        </div>
        {[
          { icon: "📦", label: "My Orders", action: onOrdersClick },
          { icon: "📍", label: "Addresses", action: () => {} },
          { icon: "🎟️", label: "My Coupons", action: () => {} },
          { icon: "💰", label: "Wallet", action: () => {} },
        ].map(item => (
          <button key={item.label} style={styles.menuItem} onClick={item.action}>
            <span>{item.icon} {item.label}</span><span>›</span>
          </button>
        ))}
        <button style={{ ...styles.menuItem, color: "#ef4444" }} onClick={onLogout}>
          <span>🚪 Logout</span><span>›</span>
        </button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// BOTTOM NAV
// ══════════════════════════════════════════════════════════════
function BottomNav({ screen, setScreen, cartCount, customer }) {
  const tabs = [
    { id: "home", icon: "🏠", label: "Home" },
    { id: "search", icon: "🔍", label: "Search" },
    { id: "cart", icon: "🛒", label: "Cart", badge: cartCount },
    { id: "orders", icon: "📦", label: "Orders" },
    { id: customer ? "profile" : "login", icon: "👤", label: customer ? "Profile" : "Login" },
  ];
  return (
    <div style={styles.bottomNav}>
      {tabs.map(tab => (
        <button key={tab.id} style={{ ...styles.navTab, ...(screen === tab.id ? styles.navTabActive : {}) }}
          onClick={() => setScreen(tab.id)}>
          <div style={{ position: "relative", display: "inline-block" }}>
            {tab.icon}
            {tab.badge > 0 && <div style={styles.navBadge}>{tab.badge}</div>}
          </div>
          <div style={styles.navLabel}>{tab.label}</div>
        </button>
      ))}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// STYLES
// ══════════════════════════════════════════════════════════════
const GREEN = "#16a34a";
const DARK = "#14532d";
const LIGHT = "#f0fdf4";
const styles = {
  app:           { maxWidth: 430, margin: "0 auto", minHeight: "100vh", background: "#f8fafc", fontFamily: "'Segoe UI', system-ui, sans-serif", position: "relative" },
  screen:        { paddingBottom: 70, minHeight: "100vh", background: "#f8fafc" },
  scrollContent: { overflowY: "auto", padding: "0 0 20px" },
  header:        { background: `linear-gradient(135deg, ${DARK} 0%, ${GREEN} 100%)`, padding: "16px 16px 12px", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, zIndex: 50 },
  logo:          { color: "#fff", fontWeight: 900, fontSize: 22, letterSpacing: -1 },
  subtitle:      { color: "#bbf7d0", fontSize: 11, marginTop: 2 },
  heroBanner:    { background: `linear-gradient(135deg, #15803d, #16a34a)`, margin: "0", padding: "20px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" },
  heroText:      { flex: 1 },
  heroTitle:     { color: "#fff", fontWeight: 800, fontSize: 20, lineHeight: 1.2 },
  heroSub:       { color: "#bbf7d0", fontSize: 13, marginTop: 4 },
  heroTag:       { background: "#fff", color: GREEN, borderRadius: 20, padding: "4px 10px", fontSize: 11, fontWeight: 700, display: "inline-block", marginTop: 8 },
  heroEmoji:     { fontSize: 64, opacity: 0.4 },
  searchWrap:    { background: "#fff", margin: "12px 16px", borderRadius: 12, display: "flex", alignItems: "center", padding: "0 12px", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" },
  searchIcon:    { fontSize: 16, marginRight: 8 },
  searchInput:   { flex: 1, border: "none", outline: "none", padding: "12px 0", fontSize: 15, background: "transparent" },
  clearBtn:      { background: "none", border: "none", cursor: "pointer", fontSize: 16 },
  catRow:        { display: "flex", gap: 8, padding: "0 16px 4px", overflowX: "auto", scrollbarWidth: "none" },
  catChip:       { whiteSpace: "nowrap", padding: "8px 14px", borderRadius: 20, border: "1.5px solid #e2e8f0", background: "#fff", fontSize: 13, cursor: "pointer", fontWeight: 500 },
  catActive:     { background: GREEN, color: "#fff", border: `1.5px solid ${GREEN}` },
  sectionTitle:  { padding: "16px 16px 8px", fontWeight: 800, fontSize: 16, color: "#111" },
  productGrid:   { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, padding: "0 16px" },
  productCard:   { background: "#fff", borderRadius: 16, overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" },
  productImageWrap:{ background: LIGHT, padding: "20px 12px 12px", textAlign: "center", position: "relative", cursor: "pointer" },
  productEmoji:  { fontSize: 48 },
  organicBadge:  { position: "absolute", top: 8, left: 8, background: GREEN, color: "#fff", fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 8 },
  discountBadge: { position: "absolute", top: 8, right: 8, background: "#ef4444", color: "#fff", fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 8 },
  productInfo:   { padding: "8px 10px 4px", cursor: "pointer" },
  productName:   { fontWeight: 700, fontSize: 13, color: "#111", lineHeight: 1.3 },
  productMarathi:{ fontSize: 11, color: "#6b7280", marginTop: 2 },
  productUnit:   { fontSize: 11, color: "#9ca3af", marginTop: 2 },
  productRating: { fontSize: 11, color: "#f59e0b", marginTop: 2 },
  productBottom: { padding: "8px 10px 10px", display: "flex", justifyContent: "space-between", alignItems: "center" },
  price:         { fontWeight: 800, fontSize: 16, color: "#111" },
  mrp:           { fontSize: 11, color: "#9ca3af", textDecoration: "line-through" },
  addBtn:        { background: GREEN, color: "#fff", border: "none", borderRadius: 8, padding: "6px 14px", fontWeight: 700, fontSize: 13, cursor: "pointer" },
  qtyControl:    { display: "flex", alignItems: "center", gap: 6, background: GREEN, borderRadius: 8, padding: "4px 8px" },
  qtyBtn:        { background: "none", border: "none", color: "#fff", fontWeight: 900, fontSize: 16, cursor: "pointer", lineHeight: 1, padding: "0 2px" },
  qtyNum:        { color: "#fff", fontWeight: 700, fontSize: 14, minWidth: 16, textAlign: "center" },
  bulkBanner:    { margin: "16px", background: `linear-gradient(135deg, #1d4ed8, #2563eb)`, borderRadius: 16, padding: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" },
  bulkBtn:       { background: "#fff", color: "#2563eb", border: "none", borderRadius: 8, padding: "8px 14px", fontWeight: 700, fontSize: 13, cursor: "pointer" },
  cartBtn:       { background: GREEN, color: "#fff", border: "none", borderRadius: 10, padding: "6px 12px", fontWeight: 700, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 },
  cartBadge:     { background: "rgba(255,255,255,0.25)", borderRadius: 6, padding: "2px 6px", fontSize: 11 },
  iconBtn:       { background: "rgba(255,255,255,0.2)", color: "#fff", border: "none", borderRadius: 10, padding: "6px 12px", fontWeight: 600, fontSize: 13, cursor: "pointer" },
  topBar:        { background: "#fff", padding: "12px 16px", display: "flex", alignItems: "center", gap: 12, borderBottom: "1px solid #f1f5f9", position: "sticky", top: 0, zIndex: 50 },
  backBtn:       { background: LIGHT, border: "none", borderRadius: 8, padding: "6px 12px", fontWeight: 700, cursor: "pointer", color: GREEN },
  screenTitle:   { fontWeight: 800, fontSize: 18 },
  detailImageWrap:{ background: LIGHT, padding: "40px 20px", textAlign: "center", position: "relative" },
  organicBadgeLg:{ display: "inline-block", background: GREEN, color: "#fff", fontSize: 12, fontWeight: 700, padding: "4px 12px", borderRadius: 20, marginTop: 8 },
  detailBody:    { padding: "16px" },
  detailName:    { fontWeight: 900, fontSize: 24, color: "#111" },
  detailMarathi: { fontSize: 16, color: "#6b7280", marginTop: 2 },
  detailUnit:    { fontSize: 14, color: "#9ca3af", marginTop: 4, background: LIGHT, display: "inline-block", padding: "4px 10px", borderRadius: 8 },
  detailRating:  { color: "#f59e0b", marginTop: 8, fontSize: 14 },
  priceRow:      { display: "flex", alignItems: "center", gap: 10, marginTop: 12 },
  detailPrice:   { fontWeight: 900, fontSize: 28, color: "#111" },
  detailMrp:     { fontSize: 16, color: "#9ca3af", textDecoration: "line-through" },
  discountTag:   { background: "#fef2f2", color: "#ef4444", borderRadius: 8, padding: "4px 10px", fontWeight: 700, fontSize: 13 },
  bulkInfo:      { background: "#eff6ff", borderRadius: 12, padding: "10px 14px", marginTop: 12, fontSize: 13, color: "#1d4ed8" },
  farmerCard:    { display: "flex", gap: 12, alignItems: "center", background: LIGHT, borderRadius: 12, padding: "12px", marginTop: 16 },
  detailSection: { marginTop: 20 },
  detailSectionTitle:{ fontWeight: 800, fontSize: 16, marginBottom: 10 },
  feature:       { fontSize: 14, color: "#374151", padding: "4px 0", color: "#16a34a" },
  stickyBottom:  { position: "fixed", bottom: 60, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 430, background: "#fff", padding: "12px 16px", borderTop: "1px solid #f1f5f9", zIndex: 100 },
  bigAddBtn:     { width: "100%", background: GREEN, color: "#fff", border: "none", borderRadius: 14, padding: "16px", fontWeight: 800, fontSize: 17, cursor: "pointer" },
  bigQtyRow:     { display: "flex", alignItems: "center", background: GREEN, borderRadius: 14, overflow: "hidden" },
  bigQtyBtn:     { background: "none", border: "none", color: "#fff", fontWeight: 900, fontSize: 22, cursor: "pointer", padding: "16px 20px" },
  bigQtyNum:     { flex: 1, textAlign: "center", color: "#fff", fontWeight: 700, fontSize: 15 },
  cartItem:      { display: "flex", gap: 12, alignItems: "center", background: "#fff", margin: "8px 16px", borderRadius: 14, padding: "12px" },
  cartItemEmoji: { fontSize: 36, width: 50, textAlign: "center" },
  cartItemInfo:  { flex: 1 },
  cartItemName:  { fontWeight: 700, fontSize: 14 },
  cartItemUnit:  { fontSize: 12, color: "#6b7280", marginTop: 2 },
  cartItemTotal: { fontWeight: 800, fontSize: 16, marginBottom: 6 },
  billCard:      { background: "#fff", margin: "16px", borderRadius: 14, padding: "16px" },
  billTitle:     { fontWeight: 800, fontSize: 16, marginBottom: 12 },
  billRow:       { display: "flex", justifyContent: "space-between", fontSize: 14, marginBottom: 8, color: "#374151" },
  billDivider:   { borderTop: "1px dashed #e2e8f0", margin: "8px 0" },
  freeDeliveryHint:{ fontSize: 12, color: "#f97316", background: "#fff7ed", borderRadius: 8, padding: "6px 10px", marginTop: 4 },
  emptyState:    { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "80vh", gap: 12, padding: 24 },
  emptyText:     { fontWeight: 800, fontSize: 20 },
  emptySub:      { color: "#6b7280", fontSize: 14 },
  authContainer: { padding: "24px 24px", display: "flex", flexDirection: "column", gap: 14 },
  authTitle:     { fontWeight: 900, fontSize: 26, textAlign: "center" },
  authSub:       { color: "#6b7280", textAlign: "center", fontSize: 13 },
  authInput:     { border: "1.5px solid #e2e8f0", borderRadius: 12, padding: "14px 16px", fontSize: 16, outline: "none", background: "#fff" },
  authSwitch:    { textAlign: "center", fontSize: 14, color: "#6b7280" },
  authLink:      { color: GREEN, fontWeight: 700, cursor: "pointer" },
  orderCard:     { background: "#fff", margin: "8px 16px", borderRadius: 14, padding: "14px" },
  orderHeader:   { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  orderNum:      { fontWeight: 800, fontSize: 14 },
  statusBadge:   { borderRadius: 8, padding: "4px 10px", fontWeight: 700, fontSize: 11 },
  orderItems:    { fontSize: 13, color: "#6b7280", marginBottom: 8, lineHeight: 1.5 },
  orderFooter:   { display: "flex", justifyContent: "space-between", borderTop: "1px solid #f1f5f9", paddingTop: 8 },
  orderTotal:    { fontWeight: 800, fontSize: 16 },
  orderDate:     { fontSize: 12, color: "#9ca3af" },
  profileCard:   { background: `linear-gradient(135deg, ${DARK}, ${GREEN})`, margin: "16px", borderRadius: 16, padding: "24px", color: "#fff" },
  profileName:   { fontWeight: 800, fontSize: 22, textAlign: "center", marginTop: 8 },
  profilePhone:  { textAlign: "center", opacity: 0.8, marginTop: 4 },
  menuItem:      { display: "flex", justifyContent: "space-between", alignItems: "center", background: "#fff", margin: "6px 16px", borderRadius: 12, padding: "16px", border: "none", width: "calc(100% - 32px)", fontSize: 15, cursor: "pointer", fontWeight: 500 },
  toast:         { position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)", background: "#22c55e", color: "#fff", padding: "10px 20px", borderRadius: 12, fontWeight: 700, zIndex: 9999, fontSize: 14, boxShadow: "0 4px 20px rgba(0,0,0,0.15)", whiteSpace: "nowrap" },
  bottomNav:     { position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 430, background: "#fff", borderTop: "1px solid #f1f5f9", display: "flex", zIndex: 100 },
  navTab:        { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", padding: "8px 0", border: "none", background: "none", cursor: "pointer", gap: 2 },
  navTabActive:  { color: GREEN },
  navLabel:      { fontSize: 10, fontWeight: 600 },
  navBadge:      { position: "absolute", top: -4, right: -8, background: "#ef4444", color: "#fff", borderRadius: 10, fontSize: 9, padding: "1px 5px", fontWeight: 800 },
};
