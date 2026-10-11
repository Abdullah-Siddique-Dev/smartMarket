import Database from "@tauri-apps/plugin-sql";
import { drizzle } from "drizzle-orm/sqlite-proxy";
import * as schema from "./schema";

let sqlDb: Database | null = null;
let isInitialized = false;

export const isTauriEnvironment = (): boolean => {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
};

// Seed Wholesale Data
const initialUsers: schema.User[] = [
  {
    id: 1,
    username: "admin",
    passwordHash: "admin123",
    fullName: "Business Owner",
    role: "OWNER",
    isActive: 1,
    createdAt: new Date().toISOString(),
  },
];

const initialProducts: schema.Product[] = [
  {
    id: 1,
    sku: "OIL-5L-TIN",
    name: "Pure Cooking Oil (5L Tin)",
    unit: "CARTON",
    purchasePrice: 2400,
    sellingPrice: 2750,
    currentStock: 120,
    minStockAlert: 20,
    isActive: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 2,
    sku: "FLOUR-20KG",
    name: "Premium Wheat Flour (20kg Bag)",
    unit: "BAG",
    purchasePrice: 1950,
    sellingPrice: 2180,
    currentStock: 85,
    minStockAlert: 15,
    isActive: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 3,
    sku: "RICE-BAS-25KG",
    name: "Super Basmati Rice (25kg)",
    unit: "BAG",
    purchasePrice: 4200,
    sellingPrice: 4800,
    currentStock: 60,
    minStockAlert: 10,
    isActive: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 4,
    sku: "SUGAR-50KG",
    name: "Refined White Sugar (50kg Bag)",
    unit: "BAG",
    purchasePrice: 6500,
    sellingPrice: 7100,
    currentStock: 45,
    minStockAlert: 10,
    isActive: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 5,
    sku: "TEA-DANEDAR-500G",
    name: "Danedar Black Tea (500g Pack)",
    unit: "CARTON",
    purchasePrice: 1100,
    sellingPrice: 1280,
    currentStock: 150,
    minStockAlert: 25,
    isActive: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 6,
    sku: "MILK-TETRA-1L",
    name: "Full Cream UHT Milk (12x1L Carton)",
    unit: "CARTON",
    purchasePrice: 3200,
    sellingPrice: 3600,
    currentStock: 75,
    minStockAlert: 15,
    isActive: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const initialShops: schema.RetailShop[] = [
  {
    id: 1,
    shopName: "Al-Madina Superstore",
    ownerName: "Haji Abdul Rasheed",
    phone: "0300-1234567",
    address: "Main Market, Sector G-9",
    outstandingBalance: 35000,
    creditLimit: 100000,
    createdAt: new Date().toISOString(),
  },
  {
    id: 2,
    shopName: "Khan General Store",
    ownerName: "Tariq Khan",
    phone: "0312-9876543",
    address: "Shop #14, Bilal Chowk",
    outstandingBalance: 18500,
    creditLimit: 50000,
    createdAt: new Date().toISOString(),
  },
  {
    id: 3,
    shopName: "Bismillah Cash & Carry",
    ownerName: "Muhammad Usman",
    phone: "0333-5551234",
    address: "Commercial Market Road",
    outstandingBalance: 0,
    creditLimit: 150000,
    createdAt: new Date().toISOString(),
  },
];

const initialBookers: schema.OrderBooker[] = [
  {
    id: 1,
    name: "Tariq Mehmood",
    phone: "0301-4455667",
    territory: "North Zone & Commercial Market",
    commissionRate: 2.5,
    isActive: 1,
    createdAt: new Date().toISOString(),
  },
  {
    id: 2,
    name: "Kamran Ali",
    phone: "0321-7788990",
    territory: "East Zone & Industrial Area",
    commissionRate: 3.0,
    isActive: 1,
    createdAt: new Date().toISOString(),
  },
];

const initialVendors: schema.Vendor[] = [
  {
    id: 1,
    name: "Premier Food Distributors",
    contactPerson: "Shahid Rafique",
    phone: "042-35889900",
    email: "orders@premierfoods.pk",
    address: "Plot 42, Quaid-e-Azam Industrial Estate",
    city: "Lahore",
    notes: "Primary supplier for Ghee, Oil & Sugar",
    totalPurchases: 250000,
    totalPaid: 200000,
    isActive: 1,
    createdBy: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 2,
    name: "National Grains Depot",
    contactPerson: "Farhan Saeed",
    phone: "051-2244668",
    email: "farhan@grainmarket.pk",
    address: "Grain Market Godown #7",
    city: "Rawalpindi",
    notes: "Supplier for Wheat Flour & Basmati Rice",
    totalPurchases: 180000,
    totalPaid: 150000,
    isActive: 1,
    createdBy: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

// In-Memory Store for Web Fallback
export const memoryStore = {
  users: [...initialUsers],
  products: [...initialProducts],
  shops: [...initialShops],
  bookers: [...initialBookers],
  vendors: [...initialVendors],
  orders: [] as schema.Order[],
  orderItems: [] as schema.OrderItem[],
  dispatchSlips: [] as schema.DispatchSlip[],
  dispatchSlipItems: [] as schema.DispatchSlipItem[],
  bills: [] as schema.Bill[],
  billItems: [] as schema.BillItem[],
  inventoryLedger: [] as schema.InventoryLedgerEntry[],
  expenses: [] as schema.Expense[],
  productImports: [] as schema.ProductImport[],
  shopPayments: [] as schema.ShopPayment[],
  vendorPayments: [] as schema.VendorPayment[],
  bookerReconciliations: [] as schema.BookerReconciliation[],
  settings: {
    market_name: "Smart Wholesale Market",
    phone: "0300-1234567",
    address: "Wholesale Market, Block A",
    currency: "PKR",
    receipt_footer: "Thank you for doing business with us! Check goods before dispatch.",
  } as Record<string, string>,
};

export async function initDb(): Promise<void> {
  if (isInitialized) return;

  const isTauri = isTauriEnvironment();

  if (isTauri) {
    try {
      sqlDb = await Database.load("sqlite:smart_market.db");

      try { await sqlDb.execute("PRAGMA journal_mode = WAL;"); } catch {}
      try { await sqlDb.execute("PRAGMA synchronous = NORMAL;"); } catch {}
      try { await sqlDb.execute("PRAGMA foreign_keys = ON;"); } catch {}
      try { await sqlDb.execute("PRAGMA busy_timeout = 5000;"); } catch {}

      const tableQueries = [
        `CREATE TABLE IF NOT EXISTS system_users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT NOT NULL UNIQUE,
          password_hash TEXT NOT NULL,
          full_name TEXT NOT NULL,
          role TEXT NOT NULL DEFAULT 'OWNER',
          is_active INTEGER NOT NULL DEFAULT 1,
          created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
        )`,
        `CREATE TABLE IF NOT EXISTS products (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          sku TEXT NOT NULL UNIQUE,
          name TEXT NOT NULL,
          unit TEXT NOT NULL DEFAULT 'BOX',
          purchase_price REAL NOT NULL DEFAULT 0,
          selling_price REAL NOT NULL DEFAULT 0,
          current_stock INTEGER NOT NULL DEFAULT 0,
          min_stock_alert INTEGER NOT NULL DEFAULT 10,
          is_active INTEGER NOT NULL DEFAULT 1,
          created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
        )`,
        `CREATE TABLE IF NOT EXISTS product_imports (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          import_number TEXT NOT NULL UNIQUE,
          product_id INTEGER NOT NULL REFERENCES products(id),
          quantity INTEGER NOT NULL,
          unit_cost REAL NOT NULL,
          supplier_info TEXT,
          vendor_id INTEGER,
          import_date TEXT NOT NULL DEFAULT (date('now', 'localtime')),
          received_by INTEGER NOT NULL DEFAULT 1,
          created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
        )`,
        `CREATE TABLE IF NOT EXISTS retail_shops (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          shop_name TEXT NOT NULL,
          owner_name TEXT,
          phone TEXT,
          address TEXT,
          outstanding_balance REAL NOT NULL DEFAULT 0.0,
          credit_limit REAL NOT NULL DEFAULT 0.0,
          created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
        )`,
        `CREATE TABLE IF NOT EXISTS order_bookers (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          phone TEXT NOT NULL,
          territory TEXT,
          commission_rate REAL NOT NULL DEFAULT 0.0,
          is_active INTEGER NOT NULL DEFAULT 1,
          created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
        )`,
        `CREATE TABLE IF NOT EXISTS orders (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          order_number TEXT NOT NULL UNIQUE,
          shop_id INTEGER NOT NULL REFERENCES retail_shops(id),
          order_booker_id INTEGER REFERENCES order_bookers(id),
          order_source TEXT NOT NULL DEFAULT 'MANUAL_WHATSAPP',
          order_date TEXT NOT NULL DEFAULT (date('now', 'localtime')),
          status TEXT NOT NULL DEFAULT 'PENDING',
          total_amount REAL NOT NULL DEFAULT 0.0,
          notes TEXT,
          created_by INTEGER NOT NULL DEFAULT 1,
          created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
        )`,
        `CREATE TABLE IF NOT EXISTS order_items (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
          product_id INTEGER NOT NULL REFERENCES products(id),
          quantity INTEGER NOT NULL,
          unit_price REAL NOT NULL,
          line_total REAL NOT NULL
        )`,
        `CREATE TABLE IF NOT EXISTS dispatch_slips (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          slip_number TEXT NOT NULL UNIQUE,
          order_booker_id INTEGER NOT NULL REFERENCES order_bookers(id),
          dispatch_date TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
          status TEXT NOT NULL DEFAULT 'DISPATCHED',
          notes TEXT,
          created_by INTEGER NOT NULL DEFAULT 1
        )`,
        `CREATE TABLE IF NOT EXISTS dispatch_slip_items (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          dispatch_slip_id INTEGER NOT NULL REFERENCES dispatch_slips(id) ON DELETE CASCADE,
          product_id INTEGER NOT NULL REFERENCES products(id),
          dispatched_qty INTEGER NOT NULL,
          returned_qty INTEGER NOT NULL DEFAULT 0,
          billed_qty INTEGER NOT NULL DEFAULT 0
        )`,
        `CREATE TABLE IF NOT EXISTS bills (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          bill_number TEXT NOT NULL UNIQUE,
          order_id INTEGER REFERENCES orders(id),
          shop_id INTEGER NOT NULL REFERENCES retail_shops(id),
          order_booker_id INTEGER REFERENCES order_bookers(id),
          bill_date TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
          subtotal REAL NOT NULL DEFAULT 0.0,
          discount_amount REAL NOT NULL DEFAULT 0.0,
          net_amount REAL NOT NULL DEFAULT 0.0,
          paid_amount REAL NOT NULL DEFAULT 0.0,
          payment_status TEXT NOT NULL DEFAULT 'PAID',
          created_by INTEGER NOT NULL DEFAULT 1,
          created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
        )`,
        `CREATE TABLE IF NOT EXISTS bill_items (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          bill_id INTEGER NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
          product_id INTEGER NOT NULL REFERENCES products(id),
          quantity INTEGER NOT NULL,
          unit_purchase_price REAL NOT NULL DEFAULT 0.0,
          unit_selling_price REAL NOT NULL DEFAULT 0.0,
          line_total REAL NOT NULL DEFAULT 0.0,
          line_profit REAL NOT NULL DEFAULT 0.0
        )`,
        `CREATE TABLE IF NOT EXISTS inventory_ledger (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          product_id INTEGER NOT NULL REFERENCES products(id),
          change_qty INTEGER NOT NULL,
          balance_after INTEGER NOT NULL,
          transaction_type TEXT NOT NULL,
          reference_id INTEGER NOT NULL,
          reference_type TEXT NOT NULL,
          performed_by INTEGER NOT NULL DEFAULT 1,
          notes TEXT,
          created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
        )`,
        `CREATE TABLE IF NOT EXISTS booker_reconciliations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          reconciliation_date TEXT NOT NULL DEFAULT (date('now', 'localtime')),
          order_booker_id INTEGER NOT NULL REFERENCES order_bookers(id),
          orders_count_total INTEGER NOT NULL DEFAULT 0,
          orders_count_collected INTEGER NOT NULL DEFAULT 0,
          orders_count_pending INTEGER NOT NULL DEFAULT 0,
          total_cash_submitted REAL NOT NULL DEFAULT 0.0,
          total_credit_issued REAL NOT NULL DEFAULT 0.0,
          shortage_amount REAL NOT NULL DEFAULT 0.0,
          verified_by INTEGER NOT NULL DEFAULT 1,
          created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
        )`,
        `CREATE TABLE IF NOT EXISTS shop_payments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          shop_id INTEGER NOT NULL REFERENCES retail_shops(id),
          amount REAL NOT NULL,
          payment_date TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
          payment_method TEXT NOT NULL DEFAULT 'CASH',
          notes TEXT,
          received_by INTEGER NOT NULL DEFAULT 1,
          created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
        )`,
        `CREATE TABLE IF NOT EXISTS expenses (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          expense_date TEXT NOT NULL DEFAULT (date('now', 'localtime')),
          category TEXT NOT NULL,
          amount REAL NOT NULL,
          description TEXT NOT NULL,
          payment_method TEXT NOT NULL DEFAULT 'CASH',
          created_by INTEGER NOT NULL DEFAULT 1,
          created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
        )`,
        `CREATE TABLE IF NOT EXISTS vendors (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          contact_person TEXT,
          phone TEXT,
          email TEXT,
          address TEXT,
          city TEXT,
          notes TEXT,
          total_purchases REAL NOT NULL DEFAULT 0.0,
          total_paid REAL NOT NULL DEFAULT 0.0,
          is_active INTEGER NOT NULL DEFAULT 1,
          created_by INTEGER NOT NULL DEFAULT 1,
          created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
        )`,
        `CREATE TABLE IF NOT EXISTS vendor_payments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          vendor_id INTEGER NOT NULL REFERENCES vendors(id),
          amount REAL NOT NULL,
          payment_date TEXT NOT NULL DEFAULT (date('now', 'localtime')),
          payment_method TEXT NOT NULL DEFAULT 'CASH',
          reference TEXT,
          notes TEXT,
          created_by INTEGER NOT NULL DEFAULT 1,
          created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
        )`,
        `CREATE TABLE IF NOT EXISTS settings (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          key TEXT NOT NULL UNIQUE,
          value TEXT NOT NULL
        )`,
      ];

      for (const q of tableQueries) {
        try {
          await sqlDb.execute(q);
        } catch (err) {
          console.warn("Table init:", err);
        }
      }

      // Create helpful indexes
      const indexes = [
        "CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku)",
        "CREATE INDEX IF NOT EXISTS idx_products_name ON products(name)",
        "CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status)",
        "CREATE INDEX IF NOT EXISTS idx_orders_shop ON orders(shop_id)",
        "CREATE INDEX IF NOT EXISTS idx_orders_booker ON orders(order_booker_id)",
        "CREATE INDEX IF NOT EXISTS idx_bills_date ON bills(bill_date)",
        "CREATE INDEX IF NOT EXISTS idx_bills_shop ON bills(shop_id)",
        "CREATE INDEX IF NOT EXISTS idx_ledger_product ON inventory_ledger(product_id)",
        "CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date)",
        "CREATE INDEX IF NOT EXISTS idx_vendors_name ON vendors(name)",
      ];
      for (const idx of indexes) {
        try { await sqlDb.execute(idx); } catch {}
      }

      // Seed default user
      try {
        const users = await sqlDb.select<any[]>("SELECT COUNT(*) as cnt FROM system_users");
        const count = users?.[0]?.cnt ?? users?.[0]?.["COUNT(*)"] ?? 0;
        if (count === 0) {
          await sqlDb.execute(
            `INSERT INTO system_users (username, password_hash, full_name, role, is_active, created_at)
             VALUES ('admin', 'admin123', 'Business Owner', 'OWNER', 1, datetime('now', 'localtime'))`
          );
        }
      } catch {}

      // Seed initial products if empty
      try {
        const prodCheck = await sqlDb.select<any[]>("SELECT COUNT(*) as cnt FROM products");
        const count = prodCheck?.[0]?.cnt ?? prodCheck?.[0]?.["COUNT(*)"] ?? 0;
        if (count === 0) {
          for (const p of initialProducts) {
            await sqlDb.execute(
              `INSERT INTO products (sku, name, unit, purchase_price, selling_price, current_stock, min_stock_alert, is_active, created_at, updated_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, datetime('now', 'localtime'), datetime('now', 'localtime'))`,
              [p.sku, p.name, p.unit, p.purchasePrice, p.sellingPrice, p.currentStock, p.minStockAlert, p.isActive]
            );
          }
          for (const s of initialShops) {
            await sqlDb.execute(
              `INSERT INTO retail_shops (shop_name, owner_name, phone, address, outstanding_balance, credit_limit, created_at)
               VALUES ($1, $2, $3, $4, $5, $6, datetime('now', 'localtime'))`,
              [s.shopName, s.ownerName, s.phone, s.address, s.outstandingBalance, s.creditLimit]
            );
          }
          for (const b of initialBookers) {
            await sqlDb.execute(
              `INSERT INTO order_bookers (name, phone, territory, commission_rate, is_active, created_at)
               VALUES ($1, $2, $3, $4, $5, datetime('now', 'localtime'))`,
              [b.name, b.phone, b.territory, b.commissionRate, b.isActive]
            );
          }
          for (const v of initialVendors) {
            await sqlDb.execute(
              `INSERT INTO vendors (name, contact_person, phone, email, address, city, notes, total_purchases, total_paid, is_active, created_by, created_at, updated_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 1, datetime('now', 'localtime'), datetime('now', 'localtime'))`,
              [v.name, v.contactPerson, v.phone, v.email, v.address, v.city, v.notes, v.totalPurchases, v.totalPaid, v.isActive]
            );
          }
        }
      } catch (err) {
        console.warn("Product seed check:", err);
      }
    } catch (err) {
      console.error("Failed to initialize Tauri SQLite Database:", err);
    }
  }

  isInitialized = true;
}

export async function getSqlDb(): Promise<Database | null> {
  await initDb();
  return sqlDb;
}

export const db = drizzle(async (sql, params, method) => {
  const isTauri = isTauriEnvironment();
  const database = await getSqlDb();

  if (isTauri && database) {
    if (method === "run") {
      const result = await database.execute(sql, params);
      return { rows: [], rowsAffected: result.rowsAffected };
    }
    const rows = await database.select<any[]>(sql, params);
    return { rows };
  }

  return { rows: [] };
});
