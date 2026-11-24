"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

const fieldClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100";

// CRUD bàn nối API /api/tables (SCRUM-60). id là định danh bàn, number là số bàn in trên QR.
async function callApi(url, options) {
  const res = await fetch(url, { cache: "no-store", ...options });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error || "Có lỗi xảy ra, vui lòng thử lại.");
  return data;
}
export default function AdminTablesPage() {
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [formNumber, setFormNumber] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [message, setMessage] = useState("");

  const loadTables = useCallback(async () => {
    try {
      const data = await callApi("/api/tables");
      setTables(Array.isArray(data) ? data : []);
      setError("");
    } catch (err) {
      setError(err.message || "Không tải được danh sách bàn.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    Promise.resolve().then(() => {
      if (!cancelled) loadTables();
    });
    return () => {
      cancelled = true;
    };
  }, [loadTables]);

  const sortedTables = useMemo(() => {
    const keyword = search.trim();
    return [...tables]
      .filter((table) => String(table.number).includes(keyword))
      .sort((a, b) => a.number - b.number);
  }, [tables, search]);

  function openCreate() {
    setEditingId(null);
    setFormNumber("");
    setIsFormOpen(true);
    setMessage("");
  }

  function openEdit(table) {
    setEditingId(table.id);
    setFormNumber(String(table.number));
    setIsFormOpen(true);
    setMessage("");
  }

  async function handleSave(event) {
    event.preventDefault();
    if (busy) return;
    const number = Number(formNumber);
    if (!Number.isSafeInteger(number) || number <= 0 || !String(formNumber).trim()) {
      window.alert("Số bàn phải là số nguyên dương.");
      return;
    }
    if (tables.some((table) => table.id !== editingId && table.number === number)) {
      window.alert(`Bàn số ${number} đã tồn tại. Vui lòng nhập số khác.`);
      return;
    }

    setBusy(true);
    try {
      if (editingId !== null) {
        await callApi(`/api/tables/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ number }),
        });
        setMessage(`Đã cập nhật bàn số ${number}.`);
      } else {
        await callApi("/api/tables", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ number }),
        });
        setMessage(`Đã thêm bàn số ${number}.`);
      }
      setIsFormOpen(false);
      await loadTables();
    } catch (err) {
      window.alert(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(table) {
    if (busy) return;
    if (!window.confirm(`Bạn có chắc muốn xóa bàn số ${table.number} không?`)) {
      return;
    }
    setBusy(true);
    try {
      await callApi(`/api/tables/${table.id}`, { method: "DELETE" });
      setMessage(`Đã xóa bàn số ${table.number}.`);
      await loadTables();
    } catch (err) {
      const inUse = /foreign key|violates/i.test(err.message);
      window.alert(
        inUse
          ? `Bàn số ${table.number} đã có đơn hàng nên không xóa được.`
          : err.message
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 pb-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-1 text-xs font-bold uppercase tracking-[0.18em] text-orange-500">
            Quản trị nhà hàng / Bàn
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Quản lý bàn
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Tạo, cập nhật hoặc xóa các bàn phục vụ tại nhà hàng.
          </p>
        </div>
        <button type="button" onClick={openCreate} className="rounded-xl bg-orange-500 px-5 py-3 text-sm font-bold text-white shadow-sm hover:bg-orange-600">
          + Thêm bàn
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Tổng số bàn</p>
          <p className="mt-1 text-3xl font-bold text-slate-900">{tables.length}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Số bàn lớn nhất</p>
          <p className="mt-1 text-3xl font-bold text-orange-600">
            {tables.length > 0 ? Math.max(...tables.map((table) => table.number)) : "—"}
          </p>
        </div>
      </div>

      {error && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {error}
        </div>
      )}
      {loading && <p role="status" className="text-sm text-slate-500">Đang tải danh sách bàn...</p>}

      {message && (
        <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
          ✓ {message}
        </div>
      )}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Danh sách bàn</h2>
            <p className="mt-1 text-xs text-slate-500">Hiển thị {sortedTables.length} / {tables.length} bàn</p>
          </div>
          <input
            type="search"
            aria-label="Tìm số bàn"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Tìm theo số bàn..."
            className={`${fieldClass} sm:w-64`}
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th scope="col" className="px-5 py-4">Số bàn</th>
                <th scope="col" className="px-5 py-4">Mã định danh</th>
                <th scope="col" className="px-5 py-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedTables.map((table) => (
                <tr key={table.id} className="hover:bg-slate-50">
                  <td className="px-5 py-4">
                    <span className="inline-flex h-11 min-w-11 items-center justify-center rounded-xl bg-orange-50 px-3 text-lg font-bold text-orange-700">
                      {table.number}
                    </span>
                    <span className="ml-3 font-semibold text-slate-900">Bàn {table.number}</span>
                  </td>
                  <td className="px-5 py-4 text-slate-500">{table.id}</td>
                  <td className="px-5 py-4">
                    <div className="flex justify-end gap-2">
                      <button type="button" onClick={() => openEdit(table)} className="rounded-lg border border-slate-200 px-3 py-2 font-semibold text-slate-600 hover:bg-orange-50 hover:text-orange-700">
                        Sửa
                      </button>
                      <button type="button" onClick={() => handleDelete(table)} className="rounded-lg border border-red-200 px-3 py-2 font-semibold text-red-600 hover:bg-red-50">
                        Xóa
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {sortedTables.length === 0 && (
                <tr><td colSpan={3} className="px-5 py-10 text-center text-slate-500">{loading ? "Đang tải..." : "Không tìm thấy bàn phù hợp."}</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="border-t border-slate-100 px-5 py-4 text-xs text-slate-400">
          Dữ liệu lưu trên Supabase · Bàn mới tự có mã QR ở mục Mã QR.
        </p>
      </section>

      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <section role="dialog" aria-modal="true" aria-labelledby="table-form-title" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h2 id="table-form-title" className="text-xl font-bold text-slate-900">
              {editingId === null ? "Thêm bàn mới" : "Chỉnh sửa số bàn"}
            </h2>
            <p className="mt-1 text-sm text-slate-500">Nhập số bàn nguyên dương, không trùng với bàn đã có.</p>
            <form onSubmit={handleSave} className="mt-6 space-y-5">
              <label className="block text-sm font-semibold text-slate-700">
                Số bàn <span className="text-red-500">*</span>
                <input
                  autoFocus
                  required
                  type="number"
                  min="1"
                  step="1"
                  value={formNumber}
                  onChange={(event) => setFormNumber(event.target.value)}
                  placeholder="Ví dụ: 4"
                  className={`mt-2 ${fieldClass}`}
                />
              </label>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setIsFormOpen(false)} className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">
                  Hủy
                </button>
                <button type="submit" disabled={busy} className="rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-orange-600 disabled:opacity-50">
                  {busy ? "Đang lưu..." : editingId === null ? "Thêm bàn" : "Lưu thay đổi"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
