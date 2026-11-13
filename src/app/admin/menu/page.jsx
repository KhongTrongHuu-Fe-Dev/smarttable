"use client";

import { useMemo, useState } from "react";
import { mockMenu, mockCategories } from "@/data/mock";

// Sprint 1: chưa có src/lib/format.js trên nhánh main.
// Khi Huy bổ sung hàm dùng chung, thay hàm này bằng:
// import { formatPrice } from "@/lib/format";
const formatPrice = (value) => Number(value).toLocaleString("vi-VN") + "đ";

const emptyForm = {
  name: "",
  price: "",
  description: "",
  image_url: "",
  category_id: "",
  spicy_level: "0",
  is_available: true,
};

function Icon({ name, size = 18 }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true,
  };

  if (name === "plus") {
    return <svg {...common}><path d="M12 5v14M5 12h14" /></svg>;
  }
  if (name === "edit") {
    return <svg {...common}><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L9 17l-4 1 1-4Z" /></svg>;
  }
  if (name === "trash") {
    return <svg {...common}><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 10v7M14 10v7" /></svg>;
  }
  if (name === "search") {
    return <svg {...common}><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></svg>;
  }
  if (name === "close") {
    return <svg {...common}><path d="M18 6 6 18M6 6l12 12" /></svg>;
  }
  if (name === "food") {
    return <svg {...common}><path d="M4 3v7a3 3 0 0 0 6 0V3M7 3v18M17 3c-2 3-3 5-3 8h5V3M19 11v10" /></svg>;
  }
  return null;
}

function Field({ label, required = false, children }) {
  return (
    <label className="block space-y-1.5 text-sm font-semibold text-slate-700">
      <span>{label}{required && <span className="text-red-500"> *</span>}</span>
      {children}
    </label>
  );
}

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100";

export default function AdminMenuPage() {
  const [items, setItems] = useState(() => mockMenu.map((item) => ({ ...item })));
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState("");

  const availableCount = items.filter((item) => item.is_available).length;
  const soldOutCount = items.length - availableCount;

  const filteredItems = useMemo(() => {
    const keyword = search.trim().toLocaleLowerCase("vi-VN");
    return items.filter((item) => {
      const matchedName = item.name.toLocaleLowerCase("vi-VN").includes(keyword);
      const matchedCategory = categoryFilter === "all" || item.category_id === categoryFilter;
      return matchedName && matchedCategory;
    });
  }, [items, search, categoryFilter]);

  const getCategoryName = (categoryId) =>
    mockCategories.find((category) => category.id === categoryId)?.name ?? "Chưa phân loại";

  function openCreateForm() {
    setEditingId(null);
    setForm({ ...emptyForm, category_id: mockCategories[0]?.id ?? "" });
    setIsFormOpen(true);
    setMessage("");
  }

  function openEditForm(item) {
    setEditingId(item.id);
    setForm({
      name: item.name ?? "",
      price: String(item.price ?? ""),
      description: item.description ?? "",
      image_url: item.image_url ?? "",
      category_id: item.category_id ?? "",
      spicy_level: String(item.spicy_level ?? 0),
      is_available: Boolean(item.is_available),
    });
    setIsFormOpen(true);
    setMessage("");
  }

  function closeForm() {
    setIsFormOpen(false);
    setEditingId(null);
  }

  function updateForm(event) {
    const { name, value, type, checked } = event.target;
    setForm((previous) => ({ ...previous, [name]: type === "checkbox" ? checked : value }));
  }

  function handleSave(event) {
    event.preventDefault();
    const name = form.name.trim();
    const price = Number(form.price);
    const spicyLevel = Number(form.spicy_level);

    if (!name || !Number.isSafeInteger(price) || price < 0) {
      window.alert("Vui lòng nhập tên món và giá tiền hợp lệ.");
      return;
    }
    if (!mockCategories.some((category) => category.id === form.category_id)) {
      window.alert("Vui lòng chọn một danh mục hợp lệ.");
      return;
    }
    if (!Number.isInteger(spicyLevel) || spicyLevel < 0 || spicyLevel > 3) {
      window.alert("Độ cay phải nằm trong khoảng từ 0 đến 3.");
      return;
    }

    const payload = {
      name,
      price,
      description: form.description.trim(),
      image_url: form.image_url.trim() || null,
      category_id: form.category_id,
      spicy_level: spicyLevel,
      is_available: form.is_available,
    };

    if (editingId !== null) {
      setItems((previous) =>
        previous.map((item) => (item.id === editingId ? { ...item, ...payload } : item))
      );
      setMessage(`Đã cập nhật món “${name}”.`);
    } else {
      setItems((previous) => [{ id: `m-${crypto.randomUUID()}`, ...payload }, ...previous]);
      setMessage(`Đã thêm món “${name}”.`);
    }
    closeForm();
  }

  function handleDelete(item) {
    const confirmed = window.confirm(`Bạn có chắc muốn xóa món “${item.name}” không?`);
    if (!confirmed) return;
    setItems((previous) => previous.filter((row) => row.id !== item.id));
    setMessage(`Đã xóa món “${item.name}”.`);
  }

  function toggleAvailable(item) {
    setItems((previous) =>
      previous.map((row) =>
        row.id === item.id ? { ...row, is_available: !row.is_available } : row
      )
    );
    setMessage(`Đã ${item.is_available ? "tạm ngừng bán" : "mở bán"} món “${item.name}”.`);
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 pb-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-1 text-xs font-bold uppercase tracking-[0.18em] text-orange-500">
            Quản trị nhà hàng / Món ăn
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Quản lý món ăn
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Thêm, chỉnh sửa và quản lý trạng thái các món trong thực đơn.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateForm}
          className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-orange-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500"
        >
          <Icon name="plus" /> Thêm món ăn
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { label: "Tổng số món", value: items.length, accent: "text-slate-900", symbol: "🍽️" },
          { label: "Đang bán", value: availableCount, accent: "text-emerald-600", symbol: "✓" },
          { label: "Tạm hết hàng", value: soldOutCount, accent: "text-amber-600", symbol: "!" },
        ].map((card) => (
          <div key={card.label} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div>
              <p className="text-sm font-medium text-slate-500">{card.label}</p>
              <p className={`mt-1 text-3xl font-bold ${card.accent}`}>{card.value}</p>
            </div>
            <span aria-hidden="true" className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-50 text-xl text-orange-600">
              {card.symbol}
            </span>
          </div>
        ))}
      </div>

      {message && (
        <div role="status" className="flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
          <span>✓ {message}</span>
          <button type="button" onClick={() => setMessage("")} aria-label="Đóng thông báo" className="rounded-md p-1 hover:bg-emerald-100">
            <Icon name="close" size={16} />
          </button>
        </div>
      )}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-100 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Danh sách món ăn</h2>
            <p className="mt-1 text-sm text-slate-500">Đang hiển thị {filteredItems.length} / {items.length} món</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><Icon name="search" /></span>
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Tìm theo tên món..."
                aria-label="Tìm món ăn"
                className={`${inputClass} w-full pl-10 sm:w-60`}
              />
            </div>
            <select
              aria-label="Lọc theo danh mục"
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
              className={`${inputClass} sm:w-44`}
            >
              <option value="all">Tất cả danh mục</option>
              {mockCategories.map((category) => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th scope="col" className="px-5 py-4">Món ăn</th>
                <th scope="col" className="px-4 py-4">Danh mục</th>
                <th scope="col" className="px-4 py-4">Giá bán</th>
                <th scope="col" className="px-4 py-4">Độ cay</th>
                <th scope="col" className="px-4 py-4">Trạng thái</th>
                <th scope="col" className="px-5 py-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredItems.map((item) => (
                <tr key={item.id} className="transition hover:bg-slate-50/80">
                  <td className="px-5 py-4">
                    <div className="flex min-w-[200px] items-center gap-3">
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-orange-50 text-orange-300">
                        {item.image_url ? (
                          // Dùng URL ảnh trực tiếp; chưa cần cấu hình remotePatterns của Next/Image.
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" />
                        ) : (
                          <Icon name="food" size={26} />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900">{item.name}</p>
                        <p className="mt-1 max-w-[260px] truncate text-xs text-slate-500">
                          {item.description || "Chưa có mô tả"}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-slate-600">{getCategoryName(item.category_id)}</td>
                  <td className="whitespace-nowrap px-4 py-4 font-bold text-slate-900">{formatPrice(item.price)}</td>
                  <td className="px-4 py-4 text-slate-600">{item.spicy_level === 0 ? "Không cay" : `Cấp ${item.spicy_level}`}</td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        role="switch"
                        aria-checked={item.is_available}
                        aria-label={`${item.is_available ? "Tạm ngừng bán" : "Mở bán"} ${item.name}`}
                        onClick={() => toggleAvailable(item)}
                        className={`relative h-6 w-11 shrink-0 rounded-full transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500 ${item.is_available ? "bg-emerald-500" : "bg-slate-300"}`}
                      >
                        <span className={`absolute left-1 top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${item.is_available ? "translate-x-5" : "translate-x-0"}`} />
                      </button>
                      <span className={`whitespace-nowrap text-xs font-semibold ${item.is_available ? "text-emerald-700" : "text-slate-500"}`}>
                        {item.is_available ? "Đang bán" : "Hết hàng"}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => openEditForm(item)}
                        title={`Sửa ${item.name}`}
                        aria-label={`Sửa ${item.name}`}
                        className="rounded-lg border border-slate-200 p-2.5 text-slate-600 transition hover:border-orange-300 hover:bg-orange-50 hover:text-orange-600"
                      >
                        <Icon name="edit" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(item)}
                        title={`Xóa ${item.name}`}
                        aria-label={`Xóa ${item.name}`}
                        className="rounded-lg border border-slate-200 p-2.5 text-slate-600 transition hover:border-red-300 hover:bg-red-50 hover:text-red-600"
                      >
                        <Icon name="trash" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredItems.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-14 text-center">
                    <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                      <Icon name="search" size={26} />
                    </div>
                    <p className="font-semibold text-slate-800">Không tìm thấy món ăn</p>
                    <p className="mt-1 text-sm text-slate-500">Thử từ khóa hoặc danh mục khác.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="border-t border-slate-100 px-5 py-4 text-xs text-slate-400">
          Dữ liệu dùng thử trong Sprint 1 · Các thay đổi chỉ được lưu tạm khi trang đang mở.
        </div>
      </section>

      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="menu-form-title"
            className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
              <div>
                <h2 id="menu-form-title" className="text-xl font-bold text-slate-900">
                  {editingId !== null ? "Chỉnh sửa món ăn" : "Thêm món ăn mới"}
                </h2>
                <p className="mt-1 text-xs text-slate-500">Các trường có dấu * là bắt buộc</p>
              </div>
              <button type="button" onClick={closeForm} aria-label="Đóng biểu mẫu" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100">
                <Icon name="close" size={20} />
              </button>
            </div>
            <form onSubmit={handleSave} className="max-h-[75vh] space-y-5 overflow-y-auto px-6 py-5">
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <Field label="Tên món" required>
                  <input name="name" value={form.name} onChange={updateForm} required maxLength={120} placeholder="Ví dụ: Cơm chiên hải sản" className={inputClass} />
                </Field>
                <Field label="Giá (VND)" required>
                  <input name="price" type="number" min="0" step="1" value={form.price} onChange={updateForm} required placeholder="85000" className={inputClass} />
                </Field>
              </div>
              <Field label="Mô tả">
                <textarea name="description" value={form.description} onChange={updateForm} rows={3} placeholder="Mô tả thành phần, hương vị..." className={inputClass} />
              </Field>
              <Field label="Đường dẫn ảnh (image_url)">
                <input name="image_url" type="url" value={form.image_url} onChange={updateForm} placeholder="https://example.com/mon-an.jpg" className={inputClass} />
              </Field>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <Field label="Danh mục" required>
                  <select name="category_id" value={form.category_id} onChange={updateForm} required className={inputClass}>
                    <option value="">Chọn danh mục</option>
                    {mockCategories.map((category) => (
                      <option key={category.id} value={category.id}>{category.name}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Cấp độ cay">
                  <select name="spicy_level" value={form.spicy_level} onChange={updateForm} className={inputClass}>
                    <option value="0">0 - Không cay</option>
                    <option value="1">1 - Cay nhẹ</option>
                    <option value="2">2 - Cay vừa</option>
                    <option value="3">3 - Rất cay</option>
                  </select>
                </Field>
              </div>
              <label className="flex cursor-pointer items-center justify-between rounded-xl border border-slate-200 p-4">
                <div>
                  <span className="block text-sm font-semibold text-slate-900">Còn hàng / Đang bán</span>
                  <span className="mt-1 block text-xs text-slate-500">Tắt để tạm ẩn món khỏi danh sách bán</span>
                </div>
                <input
                  type="checkbox"
                  name="is_available"
                  checked={form.is_available}
                  onChange={updateForm}
                  className="h-5 w-5 accent-orange-500"
                />
              </label>
              <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
                <button type="button" onClick={closeForm} className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">
                  Hủy
                </button>
                <button type="submit" className="rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-orange-600">
                  {editingId !== null ? "Lưu thay đổi" : "Thêm món"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
