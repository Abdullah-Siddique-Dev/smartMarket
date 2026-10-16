import React, { useState, useEffect, useMemo } from "react";
import {
  Plus,
  Search,
  Receipt,
  Trash2,
  Pencil,
  X,
} from "lucide-react";
import { Expense, EXPENSE_CATEGORIES, ExpenseCategory } from "../db/schema";
import {
  getExpenses,
  addExpense,
  updateExpense,
  deleteExpense,
  getExpenseSummary,
} from "../db/expenseService";
import { PageHeader } from "../components/ui/PageHeader";

export const ExpensesPage: React.FC = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [summary, setSummary] = useState({ totalToday: 0, totalThisMonth: 0, totalThisYear: 0 });
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [dateFilter, setDateFilter] = useState<"ALL" | "TODAY" | "THIS_MONTH">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  // Form states (Add)
  const [expenseDate, setExpenseDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [category, setCategory] = useState<ExpenseCategory>("FUEL_TRANSPORT");
  const [amount, setAmount] = useState<number>(0);
  const [description, setDescription] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("CASH");

  // Form states (Edit)
  const [editDate, setEditDate] = useState("");
  const [editCategory, setEditCategory] = useState<ExpenseCategory>("FUEL_TRANSPORT");
  const [editAmount, setEditAmount] = useState<number>(0);
  const [editDescription, setEditDescription] = useState("");
  const [editPaymentMethod, setEditPaymentMethod] = useState("CASH");

  const fetchData = async () => {
    try {
      const [list, sum] = await Promise.all([getExpenses(), getExpenseSummary()]);
      setExpenses(list);
      setSummary(sum);
    } catch (err) {
      console.error("Failed to load expenses:", err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredExpenses = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const monthStr = new Date().toISOString().slice(0, 7);
    return expenses.filter((e) => {
      const matchCat = selectedCategory === "ALL" || e.category === selectedCategory;
      const matchSearch =
        !searchQuery.trim() || e.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchDate =
        dateFilter === "ALL" ||
        (dateFilter === "TODAY" && e.expenseDate.startsWith(todayStr)) ||
        (dateFilter === "THIS_MONTH" && e.expenseDate.startsWith(monthStr));
      return matchCat && matchSearch && matchDate;
    });
  }, [expenses, selectedCategory, searchQuery, dateFilter]);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || amount <= 0) return;

    try {
      await addExpense({
        expenseDate,
        category,
        amount,
        description,
        paymentMethod,
        createdBy: 1,
      });

      setIsAddOpen(false);
      setAmount(0);
      setDescription("");
      fetchData();
    } catch (err) {
      console.error("Failed to record expense:", err);
    }
  };

  const handleOpenEdit = (exp: Expense) => {
    setEditingExpense(exp);
    setEditDate(exp.expenseDate);
    setEditCategory(exp.category as ExpenseCategory);
    setEditAmount(exp.amount);
    setEditDescription(exp.description);
    setEditPaymentMethod(exp.paymentMethod);
    setIsEditOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingExpense || !editDescription.trim() || editAmount <= 0) return;

    try {
      await updateExpense(editingExpense.id, {
        expenseDate: editDate,
        category: editCategory,
        amount: editAmount,
        description: editDescription,
        paymentMethod: editPaymentMethod,
      });

      setIsEditOpen(false);
      setEditingExpense(null);
      fetchData();
    } catch (err) {
      console.error("Failed to update expense:", err);
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm("Delete this expense record?")) {
      await deleteExpense(id);
      fetchData();
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Operational Business Expenses"
        description="Track vehicle fuel, driver costs, utility bills, warehouse rent and miscellaneous overheads"
      >
        <button
          type="button"
          onClick={() => setIsAddOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs rounded-xl shadow-theme-xs transition-colors cursor-pointer"
        >
          <Plus className="size-4" /> Record Expense
        </button>
      </PageHeader>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-5 rounded-2xl shadow-theme-xs space-y-1">
          <span className="text-[10px] uppercase font-bold text-gray-400">Today's Expenses</span>
          <span className="text-2xl font-black font-mono text-gray-900 dark:text-gray-100 block">
            Rs. {summary.totalToday.toLocaleString()}
          </span>
        </div>

        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-5 rounded-2xl shadow-theme-xs space-y-1">
          <span className="text-[10px] uppercase font-bold text-gray-400">This Month Expenses</span>
          <span className="text-2xl font-black font-mono text-amber-600 dark:text-amber-400 block">
            Rs. {summary.totalThisMonth.toLocaleString()}
          </span>
        </div>

        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-5 rounded-2xl shadow-theme-xs space-y-1">
          <span className="text-[10px] uppercase font-bold text-gray-400">Total Year Overhead</span>
          <span className="text-2xl font-black font-mono text-rose-600 dark:text-rose-400 block">
            Rs. {summary.totalThisYear.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-gray-900 p-4 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-theme-xs">
        <div className="flex items-center gap-2 overflow-x-auto max-w-full">
          {/* Date Filter Buttons */}
          <div className="flex items-center bg-gray-100 dark:bg-gray-800 p-0.5 rounded-xl">
            {(["ALL", "TODAY", "THIS_MONTH"] as const).map((df) => (
              <button
                key={df}
                type="button"
                onClick={() => setDateFilter(df)}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                  dateFilter === df
                    ? "bg-white dark:bg-gray-900 text-brand-600 dark:text-brand-400 shadow-xs"
                    : "text-gray-500 hover:text-gray-900 dark:hover:text-gray-200"
                }`}
              >
                {df === "ALL" ? "All Dates" : df === "TODAY" ? "Today" : "This Month"}
              </button>
            ))}
          </div>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="text-xs font-semibold bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-1.5"
          >
            <option value="ALL">All Categories</option>
            {EXPENSE_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat.replace("_", " ")}
              </option>
            ))}
          </select>
        </div>

        <div className="relative min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-1.5 text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              title="Clear search"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Expenses Table */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-theme-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-800/40 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4">Payment Method</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800/60">
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-gray-400">
                    No expense records found.
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-gray-50/60 dark:hover:bg-gray-800/40">
                    <td className="py-3 px-4 font-mono text-gray-500">{exp.expenseDate}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-[10px] font-bold text-gray-700 dark:text-gray-300">
                        {exp.category.replace("_", " ")}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-gray-900 dark:text-gray-100">
                      {exp.description}
                    </td>
                    <td className="py-3 px-4 text-gray-500 font-mono text-[11px]">
                      {exp.paymentMethod}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-rose-600 dark:text-rose-400">
                      Rs. {exp.amount.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(exp)}
                          className="p-1 text-gray-400 hover:text-brand-500 transition-colors cursor-pointer"
                          title="Edit Expense"
                        >
                          <Pencil className="size-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(exp.id)}
                          className="p-1 text-gray-400 hover:text-rose-500 transition-colors cursor-pointer"
                          title="Delete Expense"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Expense Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl max-w-md w-full p-6 shadow-theme-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <Receipt className="size-5 text-brand-600" />
                <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">
                  Record Expense
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
                    Expense Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={expenseDate}
                    onChange={(e) => setExpenseDate(e.target.value)}
                    className="w-full text-xs font-mono font-bold bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
                    Category *
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                    className="w-full text-xs font-semibold bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2"
                  >
                    {EXPENSE_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c.replace("_", " ")}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
                  Amount (Rs.) *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={amount || ""}
                  onChange={(e) => setAmount(Number(e.target.value) || 0)}
                  placeholder="0"
                  className="w-full text-base font-black font-mono bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-right text-rose-600"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
                  Description / Reason *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Delivery Van Fuel for G-9 Route"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
                  Payment Method
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full text-xs font-semibold bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2"
                >
                  <option value="CASH">Cash in Hand</option>
                  <option value="BANK">Bank Account</option>
                  <option value="CREDIT">Vendor Credit</option>
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="flex-1 py-2.5 text-xs font-semibold rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-700 text-white shadow-theme-xs cursor-pointer"
                >
                  Save Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Expense Modal */}
      {isEditOpen && editingExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl max-w-md w-full p-6 shadow-theme-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <Receipt className="size-5 text-brand-600" />
                <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">
                  Edit Expense
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsEditOpen(false);
                  setEditingExpense(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
                    Expense Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="w-full text-xs font-mono font-bold bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
                    Category *
                  </label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value as ExpenseCategory)}
                    className="w-full text-xs font-semibold bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2"
                  >
                    {EXPENSE_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c.replace("_", " ")}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
                  Amount (Rs.) *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={editAmount || ""}
                  onChange={(e) => setEditAmount(Number(e.target.value) || 0)}
                  placeholder="0"
                  className="w-full text-base font-black font-mono bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-right text-rose-600"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
                  Description / Reason *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Delivery Van Fuel for G-9 Route"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
                  Payment Method
                </label>
                <select
                  value={editPaymentMethod}
                  onChange={(e) => setEditPaymentMethod(e.target.value)}
                  className="w-full text-xs font-semibold bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2"
                >
                  <option value="CASH">Cash in Hand</option>
                  <option value="BANK">Bank Account</option>
                  <option value="CREDIT">Vendor Credit</option>
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditOpen(false);
                    setEditingExpense(null);
                  }}
                  className="flex-1 py-2.5 text-xs font-semibold rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 text-xs font-bold rounded-xl bg-brand-600 hover:bg-brand-700 text-white shadow-theme-xs cursor-pointer"
                >
                  Update Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
