import { sqliteTable, integer, text, real } from "drizzle-orm/sqlite-core";

// ==========================================
// Smart Market OS - Wholesale Data Models & Enums
// ==========================================

export const USER_ROLES = {
  OWNER: "OWNER",
  OPERATOR: "OPERATOR",
} as const;
export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES];

export const ORDER_STATUSES = {
  PENDING: "PENDING",
  DISPATCHED: "DISPATCHED",
  BILLED: "BILLED",
  CANCELLED: "CANCELLED",
} as const;
export type OrderStatus = (typeof ORDER_STATUSES)[keyof typeof ORDER_STATUSES];

export const PAYMENT_STATUSES = {
  PAID: "PAID",
  PARTIAL: "PARTIAL",
  CREDIT: "CREDIT",
} as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[keyof typeof PAYMENT_STATUSES];

export const INVENTORY_TRANSACTION_TYPES = {
  IMPORT: "IMPORT",
  SALE_BILL: "SALE_BILL",
  BOOKER_DISPATCH: "BOOKER_DISPATCH",
  BOOKER_RETURN: "BOOKER_RETURN",
  DAMAGE_ADJUSTMENT: "DAMAGE_ADJUSTMENT",
} as const;
export type InventoryTransactionType =
  (typeof INVENTORY_TRANSACTION_TYPES)[keyof typeof INVENTORY_TRANSACTION_TYPES];

export const ORDER_SOURCES = {
  MANUAL_WHATSAPP: "MANUAL_WHATSAPP",
  MANUAL_IN_PERSON: "MANUAL_IN_PERSON",
  DIRECT_PHONE: "DIRECT_PHONE",
  DIRECT_WALKIN: "DIRECT_WALKIN",
} as const;
export type OrderSource = (typeof ORDER_SOURCES)[keyof typeof ORDER_SOURCES];

export const EXPENSE_CATEGORIES = [
  "FUEL_TRANSPORT",
  "ELECTRICITY",
  "RENT",
  "SALARIES",
  "RAW_MATERIALS",
  "REPAIRS_MAINTENANCE",
  "OFFICE_SUPPLIES",
  "PHONE_INTERNET",
  "BANK_CHARGES",
  "MISCELLANEOUS",
] as const;
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export const PRODUCT_UNITS = ["BOX", "CARTON", "PACK", "DOZEN", "KG", "PCS", "BAG"] as const;
export type ProductUnit = (typeof PRODUCT_UNITS)[number];

// ==========================================
// Drizzle Schema Definitions
// ==========================================

// 1. System Users
export const systemUsers = sqliteTable("system_users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  fullName: text("full_name").notNull(),
  role: text("role").notNull().default("OWNER"),
  isActive: integer("is_active").notNull().default(1),
  createdAt: text("created_at").notNull(),
});

export type User = typeof systemUsers.$inferSelect;
export type NewUser = typeof systemUsers.$inferInsert;

// 2. Products Master Catalog
export const products = sqliteTable("products", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  sku: text("sku").notNull().unique(),
  name: text("name").notNull(),
  unit: text("unit").notNull().default("BOX"),
  purchasePrice: real("purchase_price").notNull().default(0),
  sellingPrice: real("selling_price").notNull().default(0),
  currentStock: integer("current_stock").notNull().default(0),
  minStockAlert: integer("min_stock_alert").notNull().default(10),
  isActive: integer("is_active").notNull().default(1),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;

// 3. Product Imports (Inward Stock Receiving)
export const productImports = sqliteTable("product_imports", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  importNumber: text("import_number").notNull().unique(),
  productId: integer("product_id").notNull(),
  quantity: integer("quantity").notNull(),
  unitCost: real("unit_cost").notNull(),
  supplierInfo: text("supplier_info"),
  vendorId: integer("vendor_id"),
  importDate: text("import_date").notNull(),
  receivedBy: integer("received_by").notNull(),
  createdAt: text("created_at").notNull(),
});

export type ProductImport = typeof productImports.$inferSelect & {
  product_name?: string;
  sku?: string;
  receiver_name?: string;
};
export type NewProductImport = typeof productImports.$inferInsert;

// 4. Retail Shops (Customers)
export const retailShops = sqliteTable("retail_shops", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  shopName: text("shop_name").notNull(),
  ownerName: text("owner_name"),
  phone: text("phone"),
  address: text("address"),
  outstandingBalance: real("outstanding_balance").notNull().default(0),
  creditLimit: real("credit_limit").notNull().default(0),
  createdAt: text("created_at").notNull(),
});

export type RetailShop = typeof retailShops.$inferSelect;
export type NewRetailShop = typeof retailShops.$inferInsert;

// 5. Order Bookers (Field Representatives)
export const orderBookers = sqliteTable("order_bookers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  territory: text("territory"),
  commissionRate: real("commission_rate").notNull().default(0),
  isActive: integer("is_active").notNull().default(1),
  createdAt: text("created_at").notNull(),
});

export type OrderBooker = typeof orderBookers.$inferSelect;
export type NewOrderBooker = typeof orderBookers.$inferInsert;

// 6. Orders Header
export const orders = sqliteTable("orders", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  orderNumber: text("order_number").notNull().unique(),
  shopId: integer("shop_id").notNull(),
  orderBookerId: integer("order_booker_id"),
  orderSource: text("order_source").notNull().default("MANUAL_WHATSAPP"),
  orderDate: text("order_date").notNull(),
  status: text("status").notNull().default("PENDING"),
  totalAmount: real("total_amount").notNull().default(0),
  notes: text("notes"),
  createdBy: integer("created_by").notNull().default(1),
  createdAt: text("created_at").notNull(),
});

export type Order = typeof orders.$inferSelect & {
  shop_name?: string;
  booker_name?: string | null;
  creator_name?: string;
  items?: OrderItem[];
};
export type NewOrder = typeof orders.$inferInsert;

// 7. Order Items
export const orderItems = sqliteTable("order_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  orderId: integer("order_id").notNull(),
  productId: integer("product_id").notNull(),
  quantity: integer("quantity").notNull(),
  unitPrice: real("unit_price").notNull(),
  lineTotal: real("line_total").notNull(),
});

export type OrderItem = typeof orderItems.$inferSelect & {
  product_name?: string;
  sku?: string;
};
export type NewOrderItem = typeof orderItems.$inferInsert;

// 8. Dispatch Slips (Gate Pass)
export const dispatchSlips = sqliteTable("dispatch_slips", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  slipNumber: text("slip_number").notNull().unique(),
  orderBookerId: integer("order_booker_id").notNull(),
  dispatchDate: text("dispatch_date").notNull(),
  status: text("status").notNull().default("DISPATCHED"),
  notes: text("notes"),
  createdBy: integer("created_by").notNull().default(1),
});

export type DispatchSlip = typeof dispatchSlips.$inferSelect & {
  booker_name?: string;
  creator_name?: string;
  items?: DispatchSlipItem[];
};
export type NewDispatchSlip = typeof dispatchSlips.$inferInsert;

// 9. Dispatch Slip Items
export const dispatchSlipItems = sqliteTable("dispatch_slip_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  dispatchSlipId: integer("dispatch_slip_id").notNull(),
  productId: integer("product_id").notNull(),
  dispatchedQty: integer("dispatched_qty").notNull(),
  returnedQty: integer("returned_qty").notNull().default(0),
  billedQty: integer("billed_qty").notNull().default(0),
});

export type DispatchSlipItem = typeof dispatchSlipItems.$inferSelect & {
  product_name?: string;
  sku?: string;
};
export type NewDispatchSlipItem = typeof dispatchSlipItems.$inferInsert;

// 10. Bills / Final Invoices
export const bills = sqliteTable("bills", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  billNumber: text("bill_number").notNull().unique(),
  orderId: integer("order_id"),
  shopId: integer("shop_id").notNull(),
  orderBookerId: integer("order_booker_id"),
  billDate: text("bill_date").notNull(),
  subtotal: real("subtotal").notNull().default(0),
  discountAmount: real("discount_amount").notNull().default(0),
  netAmount: real("net_amount").notNull().default(0),
  paidAmount: real("paid_amount").notNull().default(0),
  paymentStatus: text("payment_status").notNull().default("PAID"),
  createdBy: integer("created_by").notNull().default(1),
  createdAt: text("created_at").notNull(),
});

export type Bill = typeof bills.$inferSelect & {
  shop_name?: string;
  shop_phone?: string | null;
  shop_address?: string | null;
  booker_name?: string | null;
  creator_name?: string;
  items?: BillItem[];
};
export type NewBill = typeof bills.$inferInsert;

// 11. Bill Items
export const billItems = sqliteTable("bill_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  billId: integer("bill_id").notNull(),
  productId: integer("product_id").notNull(),
  quantity: integer("quantity").notNull(),
  unitPurchasePrice: real("unit_purchase_price").notNull().default(0),
  unitSellingPrice: real("unit_selling_price").notNull().default(0),
  lineTotal: real("line_total").notNull().default(0),
  lineProfit: real("line_profit").notNull().default(0),
});

export type BillItem = typeof billItems.$inferSelect & {
  product_name?: string;
  sku?: string;
};
export type NewBillItem = typeof billItems.$inferInsert;

// 12. Inventory Ledger (Audit Trail)
export const inventoryLedger = sqliteTable("inventory_ledger", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  productId: integer("product_id").notNull(),
  changeQty: integer("change_qty").notNull(),
  balanceAfter: integer("balance_after").notNull(),
  transactionType: text("transaction_type").notNull(),
  referenceId: integer("reference_id").notNull(),
  referenceType: text("reference_type").notNull(),
  performedBy: integer("performed_by").notNull().default(1),
  notes: text("notes"),
  createdAt: text("created_at").notNull(),
});

export type InventoryLedgerEntry = typeof inventoryLedger.$inferSelect & {
  product_name?: string;
  sku?: string;
  unit?: string;
  performer_name?: string;
};
export type NewInventoryLedgerEntry = typeof inventoryLedger.$inferInsert;

// 13. Order Booker Daily Reconciliations
export const bookerReconciliations = sqliteTable("booker_reconciliations", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  reconciliationDate: text("reconciliation_date").notNull(),
  orderBookerId: integer("order_booker_id").notNull(),
  ordersCountTotal: integer("orders_count_total").notNull().default(0),
  ordersCountCollected: integer("orders_count_collected").notNull().default(0),
  ordersCountPending: integer("orders_count_pending").notNull().default(0),
  totalCashSubmitted: real("total_cash_submitted").notNull().default(0),
  totalCreditIssued: real("total_credit_issued").notNull().default(0),
  shortageAmount: real("shortage_amount").notNull().default(0),
  verifiedBy: integer("verified_by").notNull().default(1),
  createdAt: text("created_at").notNull(),
});

export type BookerReconciliation = typeof bookerReconciliations.$inferSelect;

// 14. Shop Payments (Khata Settlement)
export const shopPayments = sqliteTable("shop_payments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  shopId: integer("shop_id").notNull(),
  amount: real("amount").notNull(),
  paymentDate: text("payment_date").notNull(),
  paymentMethod: text("payment_method").notNull().default("CASH"),
  notes: text("notes"),
  receivedBy: integer("received_by").notNull().default(1),
  createdAt: text("created_at").notNull(),
});

export type ShopPayment = typeof shopPayments.$inferSelect & {
  shop_name?: string;
};
export type NewShopPayment = typeof shopPayments.$inferInsert;

// 15. Business Expenses
export const expenses = sqliteTable("expenses", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  expenseDate: text("expense_date").notNull(),
  category: text("category").notNull(),
  amount: real("amount").notNull(),
  description: text("description").notNull(),
  paymentMethod: text("payment_method").notNull().default("CASH"),
  createdBy: integer("created_by").notNull().default(1),
  createdAt: text("created_at").notNull(),
});

export type Expense = typeof expenses.$inferSelect & {
  creator_name?: string;
};
export type NewExpense = typeof expenses.$inferInsert;

// 16. Vendors (Suppliers)
export const vendors = sqliteTable("vendors", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  contactPerson: text("contact_person"),
  phone: text("phone"),
  email: text("email"),
  address: text("address"),
  city: text("city"),
  notes: text("notes"),
  totalPurchases: real("total_purchases").notNull().default(0),
  totalPaid: real("total_paid").notNull().default(0),
  isActive: integer("is_active").notNull().default(1),
  createdBy: integer("created_by").notNull().default(1),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export type Vendor = typeof vendors.$inferSelect & {
  payable_balance?: number;
  creator_name?: string;
};
export type NewVendor = typeof vendors.$inferInsert;

// 17. Vendor Payments
export const vendorPayments = sqliteTable("vendor_payments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  vendorId: integer("vendor_id").notNull(),
  amount: real("amount").notNull(),
  paymentDate: text("payment_date").notNull(),
  paymentMethod: text("payment_method").notNull().default("CASH"),
  reference: text("reference"),
  notes: text("notes"),
  createdBy: integer("created_by").notNull().default(1),
  createdAt: text("created_at").notNull(),
});

export type VendorPayment = typeof vendorPayments.$inferSelect & {
  vendor_name?: string;
};
export type NewVendorPayment = typeof vendorPayments.$inferInsert;

// 18. Settings
export const settings = sqliteTable("settings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
});

export type Setting = typeof settings.$inferSelect;

// Compatibility aliases for components migrating over
export type Customer = RetailShop;
export type InventoryItem = Product;
export type CategoryRecord = { id: number; name: string; description: string };
