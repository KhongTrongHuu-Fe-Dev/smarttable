
"use client";

import { useState } from "react";
import Link from "next/link";
import { useCart } from "./CartContext";

function formatPrice(price) {
  return `${Number(price || 0).toLocaleString("vi-VN")}đ`;
}

export default function CartPageClient({ tableId }) {
  const {
    items,
    removeItem,
    updateQuantity,
    updateNote,
    clearCart,
    totalPrice,
    totalCount,
  } = useCart();

  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [orderId, setOrderId] = useState(null);

  async function handleSubmitOrder() {
    if (items.length === 0 || submitting) return;

    setSubmitting(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          table_id: tableId,
          items: items.map((item) => ({
            menu_item_id: item.menu_item_id,
            quantity: item.quantity,
            note: item.note?.trim() || null,
          })),
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.message || data.error || "Không thể gửi đơn hàng."
        );
      }

      // API phải xác nhận đã tạo đơn hàng.
      // Tránh xóa giỏ khi API hiện vẫn đang trả về TODO.
      if (!data.id || !data.status) {
        throw new Error(
          "API đặt hàng chưa hoàn thiện. Giỏ hàng vẫn được giữ nguyên."
        );
      }

      // Chỉ xóa giỏ sau khi nhận được đơn hàng hợp lệ.
      clearCart();
      setOrderId(data.id);
      setMessage("Đặt món thành công! Đơn hàng đã được gửi đến nhà bếp.");
    } catch (err) {
      setError(
        err.message || "Có lỗi xảy ra khi gửi đơn hàng."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Giỏ hàng</h2>
        <p className="mt-1 text-sm text-gray-500">
          Bàn {tableId} · {totalCount} món
        </p>
      </div>

      {message && (
        <div
          role="status"
          className="rounded-xl bg-green-100 p-4 text-green-700"
        >
          <p>{message}</p>

          <div className="mt-3">
            <Link
              href={
                orderId
                  ? `/table/${tableId}/status?orderId=${orderId}`
                  : `/table/${tableId}/status`
              }
              className="font-semibold underline"
            >
              Theo dõi đơn hàng
            </Link>
          </div>
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="rounded-xl bg-red-100 p-4 text-red-700"
        >
          {error}
        </div>
      )}

      {items.length === 0 ? (
        <div className="rounded-xl border border-gray-100 bg-white p-8 text-center">
          <div className="text-5xl">🛒</div>

          <h3 className="mt-4 font-semibold">
            Giỏ hàng đang trống
          </h3>

          <p className="mt-2 text-sm text-gray-500">
            Hãy chọn món từ thực đơn để bắt đầu đặt hàng.
          </p>

          <Link
            href={`/table/${tableId}`}
            className="mt-5 inline-block rounded-xl bg-orange-500 px-5 py-3 font-semibold text-white hover:bg-orange-600"
          >
            Xem thực đơn
          </Link>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {items.map((item) => (
              <article
                key={item.menu_item_id}
                className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold">
                      {item.name}
                    </h3>

                    <p className="mt-1 text-sm text-gray-500">
                      {formatPrice(item.price)} / món
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        updateQuantity(
                          item.menu_item_id,
                          item.quantity - 1
                        )
                      }
                      className="h-9 w-9 rounded-lg bg-gray-100 font-bold hover:bg-gray-200"
                      aria-label={`Giảm số lượng ${item.name}`}
                    >
                      −
                    </button>

                    <span className="min-w-6 text-center font-semibold">
                      {item.quantity}
                    </span>

                    <button
                      type="button"
                      onClick={() =>
                        updateQuantity(
                          item.menu_item_id,
                          item.quantity + 1
                        )
                      }
                      className="h-9 w-9 rounded-lg bg-gray-100 font-bold hover:bg-gray-200"
                      aria-label={`Tăng số lượng ${item.name}`}
                    >
                      +
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        removeItem(item.menu_item_id)
                      }
                      className="ml-2 text-sm font-medium text-red-600 hover:text-red-700"
                    >
                      Xóa
                    </button>
                  </div>
                </div>

                <label className="mt-4 block">
                  <span className="mb-2 block text-sm font-medium text-gray-700">
                    Ghi chú món ăn
                  </span>

                  <textarea
                    value={item.note || ""}
                    onChange={(event) =>
                      updateNote(
                        item.menu_item_id,
                        event.target.value
                      )
                    }
                    placeholder="Ví dụ: ít cay, không hành..."
                    rows={2}
                    className="w-full rounded-xl border border-gray-200 p-3 text-sm outline-none focus:border-orange-500"
                  />
                </label>

                <div className="mt-3 text-right font-semibold text-orange-600">
                  {formatPrice(item.price * item.quantity)}
                </div>
              </article>
            ))}
          </div>

          <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Tổng số lượng</span>
              <span>{totalCount} món</span>
            </div>

            <div className="mt-3 flex justify-between text-lg font-bold">
              <span>Tổng tiền</span>

              <span className="text-orange-600">
                {formatPrice(totalPrice)}
              </span>
            </div>

            <button
              type="button"
              onClick={handleSubmitOrder}
              disabled={submitting || items.length === 0}
              className="mt-5 w-full rounded-xl bg-orange-500 px-4 py-3 font-semibold text-white hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              {submitting
                ? "Đang gửi đơn..."
                : "Xác nhận đặt món"}
            </button>
          </div>
        </>
      )}
    </section>
  );
}
