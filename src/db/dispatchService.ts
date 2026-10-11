import { isTauriEnvironment, memoryStore, getSqlDb } from "./client";
import { DispatchSlip, DispatchSlipItem } from "./schema";

export async function getDispatchSlips(): Promise<DispatchSlip[]> {
  const isTauri = isTauriEnvironment();
  const sqlDb = await getSqlDb();

  if (isTauri && sqlDb) {
    try {
      const rows = await sqlDb.select<any[]>(
        `SELECT ds.*, ob.name as booker_name, u.full_name as creator_name
         FROM dispatch_slips ds
         JOIN order_bookers ob ON ds.order_booker_id = ob.id
         LEFT JOIN system_users u ON ds.created_by = u.id
         ORDER BY ds.id DESC`
      );
      return rows.map((r) => ({
        id: Number(r.id),
        slipNumber: String(r.slip_number),
        orderBookerId: Number(r.order_booker_id),
        booker_name: String(r.booker_name),
        dispatchDate: String(r.dispatch_date),
        status: r.status as "DISPATCHED" | "RECONCILED",
        notes: r.notes ? String(r.notes) : null,
        createdBy: Number(r.created_by),
        creator_name: r.creator_name ? String(r.creator_name) : "Admin",
      }));
    } catch (err) {
      console.error("Failed to query dispatch slips:", err);
    }
  }

  return memoryStore.dispatchSlips;
}

export async function getDispatchSlipById(id: number): Promise<DispatchSlip | null> {
  const isTauri = isTauriEnvironment();
  const sqlDb = await getSqlDb();

  if (isTauri && sqlDb) {
    try {
      const rows = await sqlDb.select<any[]>(
        `SELECT ds.*, ob.name as booker_name, u.full_name as creator_name
         FROM dispatch_slips ds
         JOIN order_bookers ob ON ds.order_booker_id = ob.id
         LEFT JOIN system_users u ON ds.created_by = u.id
         WHERE ds.id = $1`,
        [id]
      );
      if (!rows || rows.length === 0) return null;
      const r = rows[0];

      const itemRows = await sqlDb.select<any[]>(
        `SELECT dsi.*, p.name as product_name, p.sku
         FROM dispatch_slip_items dsi
         JOIN products p ON dsi.product_id = p.id
         WHERE dsi.dispatch_slip_id = $1`,
        [id]
      );

      const items: DispatchSlipItem[] = itemRows.map((it) => ({
        id: Number(it.id),
        dispatchSlipId: Number(it.dispatch_slip_id),
        productId: Number(it.product_id),
        product_name: String(it.product_name),
        sku: String(it.sku),
        dispatchedQty: Number(it.dispatched_qty),
        returnedQty: Number(it.returned_qty),
        billedQty: Number(it.billed_qty),
      }));

      return {
        id: Number(r.id),
        slipNumber: String(r.slip_number),
        orderBookerId: Number(r.order_booker_id),
        booker_name: String(r.booker_name),
        dispatchDate: String(r.dispatch_date),
        status: r.status as "DISPATCHED" | "RECONCILED",
        notes: r.notes ? String(r.notes) : null,
        createdBy: Number(r.created_by),
        creator_name: r.creator_name ? String(r.creator_name) : "Admin",
        items,
      };
    } catch (err) {
      console.error("Failed to query dispatch slip by id:", err);
    }
  }

  const s = memoryStore.dispatchSlips.find((slip) => slip.id === id);
  if (!s) return null;
  const items = memoryStore.dispatchSlipItems.filter((i) => i.dispatchSlipId === id);
  return { ...s, items };
}

export async function createDispatchSlip(
  slip: { orderBookerId: number; notes?: string },
  items: Array<{ productId: number; dispatchedQty: number }>
): Promise<number> {
  const isTauri = isTauriEnvironment();
  const sqlDb = await getSqlDb();
  const now = new Date().toISOString();
  const slipNumber = `DSP-${Date.now().toString().slice(-6)}`;

  if (isTauri && sqlDb) {
    const res = await sqlDb.execute(
      `INSERT INTO dispatch_slips (slip_number, order_booker_id, dispatch_date, status, notes, created_by)
       VALUES ($1, $2, $3, 'DISPATCHED', $4, 1)`,
      [slipNumber, slip.orderBookerId, now, slip.notes || ""]
    );
    const newId = Number(res.lastInsertId) || 1;

    for (const it of items) {
      // 1. Insert item
      await sqlDb.execute(
        `INSERT INTO dispatch_slip_items (dispatch_slip_id, product_id, dispatched_qty, returned_qty, billed_qty)
         VALUES ($1, $2, $3, 0, 0)`,
        [newId, it.productId, it.dispatchedQty]
      );

      // 2. Reduce current stock
      await sqlDb.execute(
        `UPDATE products SET current_stock = current_stock - $1 WHERE id = $2`,
        [it.dispatchedQty, it.productId]
      );

      // 3. Query new balance
      const p = await sqlDb.select<any[]>("SELECT current_stock FROM products WHERE id = $1", [it.productId]);
      const balance = Number(p?.[0]?.current_stock || 0);

      // 4. Ledger entry
      await sqlDb.execute(
        `INSERT INTO inventory_ledger (product_id, change_qty, balance_after, transaction_type, reference_id, reference_type, performed_by, notes, created_at)
         VALUES ($1, -$2, $3, 'BOOKER_DISPATCH', $4, 'DISPATCH_SLIP', 1, $5, $6)`,
        [it.productId, it.dispatchedQty, balance, newId, `Dispatched on Gate Pass ${slipNumber}`, now]
      );
    }
    return newId;
  }

  const newId = memoryStore.dispatchSlips.length > 0 ? Math.max(...memoryStore.dispatchSlips.map((s) => s.id)) + 1 : 1;
  const booker = memoryStore.bookers.find((b) => b.id === slip.orderBookerId);
  memoryStore.dispatchSlips.unshift({
    id: newId,
    slipNumber,
    orderBookerId: slip.orderBookerId,
    booker_name: booker?.name || "Booker",
    dispatchDate: now,
    status: "DISPATCHED",
    notes: slip.notes || null,
    createdBy: 1,
    creator_name: "Business Owner",
  });

  for (const it of items) {
    const prod = memoryStore.products.find((p) => p.id === it.productId);
    if (prod) prod.currentStock -= it.dispatchedQty;
    memoryStore.dispatchSlipItems.push({
      id: memoryStore.dispatchSlipItems.length + 1,
      dispatchSlipId: newId,
      productId: it.productId,
      product_name: prod?.name,
      sku: prod?.sku,
      dispatchedQty: it.dispatchedQty,
      returnedQty: 0,
      billedQty: 0,
    });
  }
  return newId;
}

export async function reconcileDispatchSlip(
  slipId: number,
  itemReconciliations: Array<{ productId: number; returnedQty: number; billedQty: number }>
): Promise<void> {
  const isTauri = isTauriEnvironment();
  const sqlDb = await getSqlDb();
  const now = new Date().toISOString();

  if (isTauri && sqlDb) {
    for (const rec of itemReconciliations) {
      await sqlDb.execute(
        `UPDATE dispatch_slip_items 
         SET returned_qty = $1, billed_qty = $2 
         WHERE dispatch_slip_id = $3 AND product_id = $4`,
        [rec.returnedQty, rec.billedQty, slipId, rec.productId]
      );

      // Return stock back to inventory
      if (rec.returnedQty > 0) {
        await sqlDb.execute(
          `UPDATE products SET current_stock = current_stock + $1 WHERE id = $2`,
          [rec.returnedQty, rec.productId]
        );
        const p = await sqlDb.select<any[]>("SELECT current_stock FROM products WHERE id = $1", [rec.productId]);
        const balance = Number(p?.[0]?.current_stock || 0);

        await sqlDb.execute(
          `INSERT INTO inventory_ledger (product_id, change_qty, balance_after, transaction_type, reference_id, reference_type, performed_by, notes, created_at)
           VALUES ($1, $2, $3, 'BOOKER_RETURN', $4, 'DISPATCH_SLIP', 1, 'Booker Return Reconciliation', $5)`,
          [rec.productId, rec.returnedQty, balance, slipId, now]
        );
      }
    }

    await sqlDb.execute("UPDATE dispatch_slips SET status = 'RECONCILED' WHERE id = $1", [slipId]);
    return;
  }

  const s = memoryStore.dispatchSlips.find((slip) => slip.id === slipId);
  if (s) s.status = "RECONCILED";
  for (const rec of itemReconciliations) {
    const item = memoryStore.dispatchSlipItems.find(
      (it) => it.dispatchSlipId === slipId && it.productId === rec.productId
    );
    if (item) {
      item.returnedQty = rec.returnedQty;
      item.billedQty = rec.billedQty;
    }
    const prod = memoryStore.products.find((p) => p.id === rec.productId);
    if (prod && rec.returnedQty > 0) {
      prod.currentStock += rec.returnedQty;
    }
  }
}
