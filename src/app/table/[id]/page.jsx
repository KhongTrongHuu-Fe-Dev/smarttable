
"use client";

import { useEffect, useMemo, useState } from "react";
import { mockCategories, mockMenu } from "@/data/mock";
import { useCart } from "@/components/customer/CartContext";

function formatPrice(price) {
  return `${Number(price || 0).toLocaleString("vi-VN")}đ`;
}

export default function Page() {
  const { addItem } = useCart();

  const [categories, setCategories] = useState(mockCategories);
  const [menuItems, setMenuItems] = useState(mockMenu);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [keyword, setKeyword] = useState("");
  const [selectedItem, setSelectedItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;

    async function loadMenu() {
      try {
        const response = await fetch("/api/menu");

        if (!response.ok) {
          throw new Error("Không thể tải thực đơn");
        }

        const data = await response.json();

        if (active) {
          setCategories(data.categories || mockCategories);
          setMenuItems(data.items || mockMenu);
        }
      } catch {
        if (active) {
          setCategories(mockCategories);
          setMenuItems(mockMenu);
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadMenu();

    return () => {
      active = false;
    };
  }, []);

  const filteredItems = useMemo(() => {
    return menuItems.filter((item) => {
      const matchesCategory =
        selectedCategory === "all" ||
        item.category_id === selectedCategory;

      const matchesKeyword = item.name
        .toLowerCase()
        .includes(keyword.trim().toLowerCase());

      return matchesCategory && matchesKeyword;
    });
  }, [menuItems, selectedCategory, keyword]);

  function handleAddItem(item) {
    addItem(item, 1);
    setMessage(`Đã thêm ${item.name} vào giỏ hàng`);
    setTimeout(() => setMessage(""), 2000);
  }

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Thực đơn</h2>
        <p className="mt-1 text-sm text-gray-500">
          Chọn món ăn và thêm vào giỏ hàng của bạn.
        </p>
      </div>

      {message && (
        <div
          role="status"
          className="rounded-xl bg-green-100 p-3 text-sm text-green-700"
        >
          {message}
        </div>
      )}

      <div>
        <input
          type="search"
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          placeholder="Tìm kiếm món ăn..."
          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 outline-none focus:border-orange-500"
        />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2">
        <button
          type="button"
          onClick={() => setSelectedCategory("all")}
          className={`shrink-0 rounded-xl px-4 py-2 text-sm font-medium ${
            selectedCategory === "all"
              ? "bg-orange-500 text-white"
              : "bg-gray-100 text-gray-700"
          }`}
        >
          Tất cả
        </button>

        {categories.map((category) => (
          <button
            key={category.id}
            type="button"
            onClick={() => setSelectedCategory(category.id)}
            className={`shrink-0 rounded-xl px-4 py-2 text-sm font-medium ${
              selectedCategory === category.id
                ? "bg-orange-500 text-white"
                : "bg-gray-100 text-gray-700"
            }`}
          >
            {category.name}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="py-8 text-center text-gray-500">
          Đang tải thực đơn...
        </p>
      ) : filteredItems.length === 0 ? (
        <div className="rounded-xl bg-white p-8 text-center text-gray-500">
          Không tìm thấy món ăn phù hợp.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredItems.map((item) => (
            <article
              key={item.id}
              className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm"
            >
              <div className="flex h-36 items-center justify-center bg-gray-100 text-5xl">
                🍽️
              </div>

              <div className="space-y-3 p-4">
                <div>
                  <h3 className="font-semibold">{item.name}</h3>
                  <p className="mt-1 line-clamp-2 text-sm text-gray-500">
                    {item.description || "Chưa có mô tả"}
                  </p>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-orange-600">
                    {formatPrice(item.price)}
                  </span>

                  {!item.is_available && (
                    <span className="text-xs text-red-500">
                      Tạm hết món
                    </span>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedItem(item)}
                    className="flex-1 rounded-xl bg-gray-100 px-3 py-2 text-sm font-medium hover:bg-gray-200"
                  >
                    Chi tiết
                  </button>

                  <button
                    type="button"
                    disabled={!item.is_available}
                    onClick={() => handleAddItem(item)}
                    className="flex-1 rounded-xl bg-orange-500 px-3 py-2 text-sm font-semibold text-white hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-gray-300"
                  >
                    Thêm món
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {selectedItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setSelectedItem(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="menu-detail-title"
            className="w-full max-w-md space-y-4 rounded-xl bg-white p-5"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="text-center text-5xl">🍽️</div>

            <h3 id="menu-detail-title" className="text-xl font-bold">
              {selectedItem.name}
            </h3>

            <p className="text-sm text-gray-600">
              {selectedItem.description || "Chưa có mô tả"}
            </p>

            <p className="font-bold text-orange-600">
              {formatPrice(selectedItem.price)}
            </p>

            <button
              type="button"
              disabled={!selectedItem.is_available}
              onClick={() => {
                handleAddItem(selectedItem);
                setSelectedItem(null);
              }}
              className="w-full rounded-xl bg-orange-500 px-4 py-3 font-semibold text-white disabled:bg-gray-300"
            >
              Thêm vào giỏ hàng
            </button>

            <button
              type="button"
              onClick={() => setSelectedItem(null)}
              className="w-full rounded-xl bg-gray-100 px-4 py-3"
            >
              Đóng
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
