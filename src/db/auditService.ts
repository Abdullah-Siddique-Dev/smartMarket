import { isTauriEnvironment, memoryStore, getSqlDb } from "./client";
import { InventoryLedgerEntry } from "./schema";

export async function getInventoryLedger(productId?: number): Promise<InventoryLedgerEntry[]> {
  const isTauri = isTauriEnvironment();
  const sqlDb = await getSqlDb();

  if (isTauri && sqlDb) {
    try {
      const query = productId
        ? `SELECT il.*, p.name as product_name, p.sku, p.unit, u.full_name as performer_name
           FROM inventory_ledger il
           JOIN products p ON il.product_id = p.id
           LEFT JOIN system_users u ON il.performed_by = u.id
           WHERE il.product_id = $1
           ORDER BY il.id DESC LIMIT 200`
        : `SELECT il.*, p.name as product_name, p.sku, p.unit, u.full_name as performer_name
           FROM inventory_ledger il
           JOIN products p ON il.product_id = p.id
           LEFT JOIN system_users u ON il.performed_by = u.id
           ORDER BY il.id DESC LIMIT 200`;

      const rows = await sqlDb.select<any[]>(query, productId ? [productId] : []);
      return rows.map((r) => ({
        id: Number(r.id),
        productId: Number(r.product_id),
        product_name: String(r.product_name),
        sku: String(r.sku),
        unit: String(r.unit),
        changeQty: Number(r.change_qty),
        balanceAfter: Number(r.balance_after),
        transactionType: r.transaction_type,
        referenceId: Number(r.reference_id),
        referenceType: String(r.reference_type),
        performedBy: Number(r.performed_by),
        performer_name: r.performer_name ? String(r.performer_name) : "Admin",
        notes: r.notes ? String(r.notes) : null,
        createdAt: String(r.created_at),
      }));
    } catch (err) {
      console.error("Failed to query inventory ledger:", err);
    }
  }

  return memoryStore.inventoryLedger.filter((l) => !productId || l.productId === productId);
}
