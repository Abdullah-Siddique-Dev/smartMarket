import { isTauriEnvironment, memoryStore, getSqlDb } from "./client";
import { Product, NewProduct, ProductImport } from "./schema";

export async function getProducts(): Promise<Product[]> {
  const isTauri = isTauriEnvironment();
  const sqlDb = await getSqlDb();

  if (isTauri && sqlDb) {
    try {
      const rows = await sqlDb.select<any[]>(
        "SELECT * FROM products WHERE is_active = 1 ORDER BY name ASC"
      );
      return rows.map((r) => ({
        id: Number(r.id),
        sku: String(r.sku || ""),
        name: String(r.name || ""),
        unit: String(r.unit || "BOX"),
        purchasePrice: Number(r.purchase_price ?? r.purchasePrice ?? 0),
        sellingPrice: Number(r.selling_price ?? r.sellingPrice ?? 0),
        currentStock: Number(r.current_stock ?? r.currentStock ?? 0),
        minStockAlert: Number(r.min_stock_alert ?? r.minStockAlert ?? 10),
        isActive: Number(r.is_active ?? r.isActive ?? 1),
        createdAt: String(r.created_at || ""),
        updatedAt: String(r.updated_at || ""),
      }));
    } catch (err) {
      console.error("Failed to query products from SQLite:", err);
    }
  }

  return memoryStore.products.filter((p) => p.isActive === 1);
}

export async function addProduct(product: Omit<NewProduct, "id" | "createdAt" | "updatedAt">): Promise<number> {
  const isTauri = isTauriEnvironment();
  const sqlDb = await getSqlDb();

  const now = new Date().toISOString();
  const purchasePrice = Number(product.purchasePrice) || 0;
  const sellingPrice = Number(product.sellingPrice) || 0;
  const currentStock = Number(product.currentStock) || 0;
  const minStockAlert = Number(product.minStockAlert) || 10;

  if (isTauri && sqlDb) {
    const res = await sqlDb.execute(
      `INSERT INTO products (sku, name, unit, purchase_price, selling_price, current_stock, min_stock_alert, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 1, $8, $9)`,
      [
        product.sku.trim().toUpperCase(),
        product.name.trim(),
        product.unit || "BOX",
        purchasePrice,
        sellingPrice,
        currentStock,
        minStockAlert,
        now,
        now,
      ]
    );
    const newId = Number(res.lastInsertId) || 1;

    // Log opening balance into ledger
    if (currentStock > 0) {
      await sqlDb.execute(
        `INSERT INTO inventory_ledger (product_id, change_qty, balance_after, transaction_type, reference_id, reference_type, performed_by, notes, created_at)
         VALUES ($1, $2, $3, 'IMPORT', $4, 'INITIAL_STOCK', 1, 'Initial opening balance', $5)`,
        [newId, currentStock, currentStock, newId, now]
      );
    }
    return newId;
  }

  // Memory fallback
  const newId = memoryStore.products.length > 0 ? Math.max(...memoryStore.products.map((p) => p.id)) + 1 : 1;
  const newP: Product = {
    id: newId,
    sku: product.sku.trim().toUpperCase(),
    name: product.name.trim(),
    unit: product.unit || "BOX",
    purchasePrice,
    sellingPrice,
    currentStock,
    minStockAlert,
    isActive: 1,
    createdAt: now,
    updatedAt: now,
  };
  memoryStore.products.push(newP);
  return newId;
}

export async function updateProduct(id: number, product: Partial<Product>): Promise<void> {
  const isTauri = isTauriEnvironment();
  const sqlDb = await getSqlDb();
  const now = new Date().toISOString();

  if (isTauri && sqlDb) {
    await sqlDb.execute(
      `UPDATE products SET 
         sku = COALESCE($1, sku),
         name = COALESCE($2, name),
         unit = COALESCE($3, unit),
         purchase_price = COALESCE($4, purchase_price),
         selling_price = COALESCE($5, selling_price),
         min_stock_alert = COALESCE($6, min_stock_alert),
         updated_at = $7
       WHERE id = $8`,
      [
        product.sku ? product.sku.trim().toUpperCase() : null,
        product.name ? product.name.trim() : null,
        product.unit,
        product.purchasePrice,
        product.sellingPrice,
        product.minStockAlert,
        now,
        id,
      ]
    );
    return;
  }

  const idx = memoryStore.products.findIndex((p) => p.id === id);
  if (idx !== -1) {
    memoryStore.products[idx] = { ...memoryStore.products[idx], ...product, updatedAt: now };
  }
}

export async function deleteProduct(id: number): Promise<void> {
  const isTauri = isTauriEnvironment();
  const sqlDb = await getSqlDb();

  if (isTauri && sqlDb) {
    await sqlDb.execute("UPDATE products SET is_active = 0 WHERE id = $1", [id]);
    return;
  }

  const p = memoryStore.products.find((p) => p.id === id);
  if (p) p.isActive = 0;
}

export async function importStock(data: {
  productId: number;
  quantity: number;
  unitCost: number;
  supplierInfo?: string;
  vendorId?: number;
}): Promise<void> {
  const isTauri = isTauriEnvironment();
  const sqlDb = await getSqlDb();
  const now = new Date().toISOString();
  const importNumber = `IMP-${Date.now().toString().slice(-6)}`;
  const qty = Number(data.quantity) || 0;
  const cost = Number(data.unitCost) || 0;
  const totalCost = qty * cost;

  if (isTauri && sqlDb) {
    // 1. Get current stock
    const pRows = await sqlDb.select<any[]>("SELECT current_stock FROM products WHERE id = $1", [data.productId]);
    const currentStock = Number(pRows?.[0]?.current_stock || 0);
    const newStock = currentStock + qty;

    // 2. Insert product_imports
    await sqlDb.execute(
      `INSERT INTO product_imports (import_number, product_id, quantity, unit_cost, supplier_info, vendor_id, import_date, received_by, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, date('now', 'localtime'), 1, $7)`,
      [importNumber, data.productId, qty, cost, data.supplierInfo || "", data.vendorId || null, now]
    );

    // 3. Update product current_stock and purchase_price
    await sqlDb.execute(
      `UPDATE products SET current_stock = $1, purchase_price = $2, updated_at = $3 WHERE id = $4`,
      [newStock, cost, now, data.productId]
    );

    // 4. Update vendor purchases if vendorId provided
    if (data.vendorId) {
      await sqlDb.execute(
        `UPDATE vendors SET total_purchases = total_purchases + $1, updated_at = $2 WHERE id = $3`,
        [totalCost, now, data.vendorId]
      );
    }

    // 5. Immutable ledger
    await sqlDb.execute(
      `INSERT INTO inventory_ledger (product_id, change_qty, balance_after, transaction_type, reference_id, reference_type, performed_by, notes, created_at)
       VALUES ($1, $2, $3, 'IMPORT', $4, 'PRODUCT_IMPORT', 1, $5, $6)`,
      [data.productId, qty, newStock, data.productId, `Inward Receiving (${importNumber})`, now]
    );
    return;
  }

  // Memory fallback
  const prod = memoryStore.products.find((p) => p.id === data.productId);
  if (prod) {
    prod.currentStock += qty;
    prod.purchasePrice = cost;
    prod.updatedAt = now;
  }
  if (data.vendorId) {
    const v = memoryStore.vendors.find((v) => v.id === data.vendorId);
    if (v) v.totalPurchases += totalCost;
  }
}

export async function getProductImports(): Promise<ProductImport[]> {
  const isTauri = isTauriEnvironment();
  const sqlDb = await getSqlDb();

  if (isTauri && sqlDb) {
    try {
      const rows = await sqlDb.select<any[]>(
        `SELECT pi.*, p.name as product_name, p.sku
         FROM product_imports pi
         JOIN products p ON pi.product_id = p.id
         ORDER BY pi.id DESC LIMIT 100`
      );
      return rows.map((r) => ({
        id: Number(r.id),
        importNumber: String(r.import_number),
        productId: Number(r.product_id),
        product_name: String(r.product_name),
        sku: String(r.sku),
        quantity: Number(r.quantity),
        unitCost: Number(r.unit_cost),
        supplierInfo: r.supplier_info ? String(r.supplier_info) : null,
        vendorId: r.vendor_id ? Number(r.vendor_id) : null,
        importDate: String(r.import_date),
        receivedBy: Number(r.received_by),
        createdAt: String(r.created_at),
      }));
    } catch (err) {
      console.error("Failed to query imports:", err);
    }
  }

  return memoryStore.productImports;
}
