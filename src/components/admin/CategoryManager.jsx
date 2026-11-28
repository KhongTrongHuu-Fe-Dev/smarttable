"use client";

import { useMemo, useState } from "react";

const fieldClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100";

/**
 * CRUD danh mục qua API. Dùng chung state với trang món ăn và chỉ cập nhật
 * danh sách sau khi máy chủ xác nhận lưu thành công.
 */
export default function CategoryManager({ categories, onSave, onDelete, itemCategoryIds = [], busy = false, error = "" }) {
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [formName, setFormName] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [message, setMessage] = useState("");

  const filteredCategories = useMemo(() => {
    const keyword = search.trim().toLocaleLowerCase("vi-VN");
    return categories.filter((category) =>
      category.name.toLocaleLowerCase("vi-VN").includes(keyword)
    );
  }, [categories, search]);

  const usageCount = (id) =>
    itemCategoryIds.filter((categoryId) => categoryId === id).length;

  function openCreate() {
    setEditingId(null);
    setFormName("");
    setMessage("");
    setIsModalOpen(true);
  }

  function openEdit(category) {
    setEditingId(category.id);
    setFormName(category.name);
    setMessage("");
    setIsModalOpen(true);
  }

  async function saveCategory(event) {
    event.preventDefault();
    if (busy) return;
    const name = formName.trim();

    if (!name) {
      window.alert("Vui lòng nhập tên danh mục.");
      return;
    }

    const duplicate = categories.some(
      (category) =>
        category.id !== editingId &&
        category.name.trim().toLocaleLowerCase("vi-VN") ===
          name.toLocaleLowerCase("vi-VN")
    );
    if (duplicate) {
      window.alert("Tên danh mục đã tồn tại. Vui lòng nhập tên khác.");
      return;
    }

    setMessage("");
    const saved = await onSave(editingId, name);
    if (!saved) return;
    setMessage(editingId !== null
      ? `Đã cập nhật danh mục “${saved.name}”.`
      : `Đã thêm danh mục “${saved.name}”.`);
    setIsModalOpen(false);
  }

  async function deleteCategory(category) {
    if (busy) return;
    // Không cho xoá khi có món đang sử dụng category_id này.
    // Tránh danh sách món bị mất tên danh mục khi thao tác CRUD trên UI.
    const used = usageCount(category.id);
    if (used > 0) {
      window.alert(
        `Không thể xóa “${category.name}” vì còn ${used} món thuộc danh mục này. Hãy chuyển các món sang danh mục khác trước.`
      );
      return;
    }
    if (!window.confirm(`Bạn có chắc muốn xóa danh mục “${category.name}” không?`)) {
      return;
    }
    setMessage("");
    const deleted = await onDelete(category);
    if (!deleted) return;
    setMessage(`Đã xóa danh mục “${category.name}”.`);
  }

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-1 text-xs font-bold uppercase tracking-[0.18em] text-orange-500">
            Quản trị nhà hàng / Danh mục
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Quản lý danh mục
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Phân loại món ăn theo nhóm và quản lý tên danh mục.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          disabled={busy}
          className="rounded-xl bg-orange-500 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          + Thêm danh mục
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Tổng danh mục</p>
          <p className="mt-1 text-3xl font-bold text-slate-900">{categories.length}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Danh mục đang có món</p>
          <p className="mt-1 text-3xl font-bold text-orange-600">
            {categories.filter((category) => usageCount(category.id) > 0).length}
          </p>
        </div>
      </div>

      {message && (
        <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
          ✓ {message}
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Danh sách danh mục</h2>
            <p className="mt-1 text-xs text-slate-500">Hiển thị {filteredCategories.length} / {categories.length} danh mục</p>
          </div>
          <input
            type="search"
            aria-label="Tìm danh mục"
            placeholder="Tìm danh mục..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className={`${fieldClass} sm:w-64`}
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th scope="col" className="px-5 py-4">Tên danh mục</th>
                <th scope="col" className="px-5 py-4">Số món đang thuộc</th>
                <th scope="col" className="px-5 py-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCategories.map((category) => (
                <tr key={category.id} className="hover:bg-slate-50">
                  <td className="px-5 py-4">
                    <p className="font-semibold text-slate-900">{category.name}</p>
                    <p className="mt-1 text-xs text-slate-400">ID: {category.id}</p>
                  </td>
                  <td className="px-5 py-4 text-slate-600">
                    <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700">
                      {usageCount(category.id)} món
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => openEdit(category)}
                        disabled={busy}
                        className="rounded-lg border border-slate-200 px-3 py-2 font-semibold text-slate-600 hover:bg-orange-50 hover:text-orange-700"
                      >
                        Sửa
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteCategory(category)}
                        disabled={busy}
                        className="rounded-lg border border-red-200 px-3 py-2 font-semibold text-red-600 hover:bg-red-50"
                      >
                        Xóa
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredCategories.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-5 py-10 text-center text-sm text-slate-500">
                    Không tìm thấy danh mục phù hợp.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="border-t border-slate-100 px-5 py-4 text-xs text-slate-400">
          Danh mục đang chứa món chỉ được xóa sau khi chuyển hết các món sang danh mục khác.
        </p>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <section role="dialog" aria-modal="true" aria-labelledby="category-dialog-title" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h2 id="category-dialog-title" className="text-xl font-bold text-slate-900">
              {editingId === null ? "Thêm danh mục" : "Sửa danh mục"}
            </h2>
            <p className="mt-1 text-sm text-slate-500">Nhập tên để phân loại món ăn.</p>
            <form className="mt-6 space-y-5" onSubmit={saveCategory}>
              {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
              <label className="block text-sm font-semibold text-slate-700">
                Tên danh mục <span className="text-red-500">*</span>
                <input
                  autoFocus
                  required
                  maxLength={80}
                  value={formName}
                  onChange={(event) => setFormName(event.target.value)}
                  placeholder="Ví dụ: Món tráng miệng"
                  className={`mt-2 ${fieldClass}`}
                />
              </label>
              <div className="flex justify-end gap-3">
                <button type="button" disabled={busy} onClick={() => setIsModalOpen(false)} className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">
                  Hủy
                </button>
                <button type="submit" disabled={busy} className="rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50">
                  {busy ? "Đang lưu..." : editingId === null ? "Thêm danh mục" : "Lưu thay đổi"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </section>
  );
}
