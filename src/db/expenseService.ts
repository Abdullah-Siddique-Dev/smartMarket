import { isTauriEnvironment, memoryStore, getSqlDb } from "./client";
import { Expense, NewExpense, ExpenseCategory } from "./schema";

export async function getExpenses(): Promise<Expense[]> {
  const isTauri = isTauriEnvironment();
  const sqlDb = await getSqlDb();

  if (isTauri && sqlDb) {
    try {
      const rows = await sqlDb.select<any[]>(
        `SELECT e.*, u.full_name as creator_name
         FROM expenses e
         LEFT JOIN system_users u ON e.created_by = u.id
         ORDER BY e.expense_date DESC, e.id DESC`
      );
      return rows.map((r) => ({
        id: Number(r.id),
        expenseDate: String(r.expense_date),
        category: r.category as ExpenseCategory,
        amount: Number(r.amount),
        description: String(r.description),
        paymentMethod: String(r.payment_method),
        createdBy: Number(r.created_by),
        creator_name: r.creator_name ? String(r.creator_name) : "Admin",
        createdAt: String(r.created_at),
      }));
    } catch (err) {
      console.error("Failed to query expenses:", err);
    }
  }

  return memoryStore.expenses;
}

export async function addExpense(expense: Omit<NewExpense, "id" | "createdAt">): Promise<number> {
  const isTauri = isTauriEnvironment();
  const sqlDb = await getSqlDb();
  const now = new Date().toISOString();
  const today = now.slice(0, 10);
  const amount = Number(expense.amount) || 0;

  if (isTauri && sqlDb) {
    const res = await sqlDb.execute(
      `INSERT INTO expenses (expense_date, category, amount, description, payment_method, created_by, created_at)
       VALUES ($1, $2, $3, $4, $5, 1, $6)`,
      [
        expense.expenseDate || today,
        expense.category,
        amount,
        expense.description.trim(),
        expense.paymentMethod || "CASH",
        now,
      ]
    );
    return Number(res.lastInsertId) || 1;
  }

  const newId = memoryStore.expenses.length > 0 ? Math.max(...memoryStore.expenses.map((e) => e.id)) + 1 : 1;
  memoryStore.expenses.unshift({
    id: newId,
    expenseDate: expense.expenseDate || today,
    category: expense.category,
    amount,
    description: expense.description.trim(),
    paymentMethod: expense.paymentMethod || "CASH",
    createdBy: 1,
    creator_name: "Business Owner",
    createdAt: now,
  });
  return newId;
}

export async function updateExpense(id: number, expense: Partial<Expense>): Promise<void> {
  const isTauri = isTauriEnvironment();
  const sqlDb = await getSqlDb();

  if (isTauri && sqlDb) {
    await sqlDb.execute(
      `UPDATE expenses SET
         expense_date = COALESCE($1, expense_date),
         category = COALESCE($2, category),
         amount = COALESCE($3, amount),
         description = COALESCE($4, description),
         payment_method = COALESCE($5, payment_method)
       WHERE id = $6`,
      [
        expense.expenseDate || null,
        expense.category || null,
        expense.amount !== undefined ? Number(expense.amount) : null,
        expense.description ? expense.description.trim() : null,
        expense.paymentMethod || null,
        id,
      ]
    );
    return;
  }

  const idx = memoryStore.expenses.findIndex((e) => e.id === id);
  if (idx !== -1) {
    memoryStore.expenses[idx] = {
      ...memoryStore.expenses[idx],
      ...expense,
      amount: expense.amount !== undefined ? Number(expense.amount) : memoryStore.expenses[idx].amount,
    };
  }
}

export async function deleteExpense(id: number): Promise<void> {
  const isTauri = isTauriEnvironment();
  const sqlDb = await getSqlDb();

  if (isTauri && sqlDb) {
    await sqlDb.execute("DELETE FROM expenses WHERE id = $1", [id]);
    return;
  }

  const idx = memoryStore.expenses.findIndex((e) => e.id === id);
  if (idx !== -1) memoryStore.expenses.splice(idx, 1);
}

export async function getExpenseSummary() {
  const expenses = await getExpenses();
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const monthStr = now.toISOString().slice(0, 7);
  const yearStr = now.toISOString().slice(0, 4);

  const totalToday = expenses
    .filter((e) => e.expenseDate.startsWith(todayStr))
    .reduce((sum, e) => sum + e.amount, 0);

  const totalThisMonth = expenses
    .filter((e) => e.expenseDate.startsWith(monthStr))
    .reduce((sum, e) => sum + e.amount, 0);

  const totalThisYear = expenses
    .filter((e) => e.expenseDate.startsWith(yearStr))
    .reduce((sum, e) => sum + e.amount, 0);

  return { totalToday, totalThisMonth, totalThisYear };
}
