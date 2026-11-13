
"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { mockOrders, ORDER_STATUS } from "@/data/mock";

const STATUS_STEPS = [
  { value: ORDER_STATUS.PENDING, label: "Đã tiếp nhận" },
  { value: ORDER_STATUS.COOKING, label: "Đang chuẩn bị" },
  { value: ORDER_STATUS.DONE, label: "Đã hoàn thành" },
  { value: ORDER_STATUS.SERVED, label: "Đã phục vụ" },
  { value: ORDER_STATUS.PAID, label: "Đã thanh toán" },
];

function formatPrice(value) {
  return `${Number(value || 0).toLocaleString("vi-VN")}đ`;
}

function getStatusLabel(status) {
  return STATUS_STEPS.find((step) => step.value === status)?.label || status;
}

export default function OrderStatusClient({ tableId }) {
  const searchParams = useSearchParams();
  const requestedOrderId = searchParams.get("orderId");

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [usingMock, setUsingMock] = useState(false);
  const [error, setError] = useState("");

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `/api/orders?table_id=${encodeURIComponent(tableId)}`,
        { cache: "no-store" }
      );

      if (!response.ok) {
        throw new Error("API danh sách đơn hàng chưa sẵn sàng.");
      }

      const data = await response.json();
      const list = Array.isArray(data) ? data : data.orders;

      if (!Array.isArray(list)) {
        throw new Error("Dữ liệu đơn hàng không đúng định dạng.");
      }

      setOrders(list);
      setUsingMock(false);
    } catch {
      const sampleOrders = mockOrders.filter(
        (order) => String(order.table_id) === String(tableId)
      );

      setOrders(sampleOrders);
      setUsingMock(true);
      setError("Đang hiển thị dữ liệu mẫu vì API chưa sẵn sàng.");
    } finally {
      setLoading(false);
    }
  }, [tableId]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const selectedOrder = requestedOrderId
    ? orders.find((order) => String(order.id) === requestedOrderId)
    : [...orders].sort(
        (a, b) =>
          new Date(b.created_at || 0) - new Date(a.created_at || 0)
      )[0];

  if (loading) {
    return <p className="p-6 text-gray-500">Đang tải đơn hàng...</p>;
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">Theo dõi đơn hàng</h2>
          <p className="mt-1 text-sm text-gray-500">Bàn {tableId}</p>
        </div>

        <button
          type="button"
          onClick={loadOrders}
          className="rounded-xl bg-orange-500 px-4 py-2 font-semibold text-white hover:bg-orange-600"
        >
          Làm mới
        </button>
      </div>

      {error && (
        <div className="rounded-xl bg-yellow-100 p-4 text-yellow-800">
          {error}
        </div>
      )}

      {!selectedOrder ? (
        <div className="rounded-xl border bg-white p-8 text-center">
          <div className="text-5xl">🧾</div>
          <h3 className="mt-4 font-semibold">Chưa có đơn hàng</h3>
          <p className="mt-2 text-sm text-gray-500">
            Đơn hàng của bàn sẽ xuất hiện tại đây sau khi đặt món thành công.
          </p>
          <Link
            href={`/table/${tableId}`}
            className="mt-5 inline-block rounded-xl bg-orange-500 px-5 py-3 font-semibold text-white"
          >
            Xem thực đơn
          </Link>
        </div>
      ) : (
        <article className="space-y-5 rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap justify-between gap-2">
            <div>
              <p className="text-sm text-gray-500">Mã đơn hàng</p>
              <h3 className="font-bold">{selectedOrder.id}</h3>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Trạng thái</p>
              <p className="font-semibold text-orange-600">
                {getStatusLabel(selectedOrder.status)}
              </p>
            </div>
          </div>

          {usingMock && (
            <p className="text-xs text-gray-500">
              Đây là đơn hàng minh họa từ dữ liệu mẫu, không phải đơn vừa đặt.
            </p>
          )}

          <div className="space-y-4">
            {STATUS_STEPS.map((step, index) => {
              const currentIndex = STATUS_STEPS.findIndex(
                (item) => item.value === selectedOrder.status
              );
              const completed = currentIndex >= index;

              return (
                <div key={step.value} className="flex items-center gap-3">
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-bold ${
                      completed
                        ? "bg-orange-500 text-white"
                        : "bg-gray-100 text-gray-400"
                    }`}
                  >
                    {completed ? "✓" : index + 1}
                  </div>
                  <div>
                    <p
                      className={
                        completed
                          ? "font-semibold text-gray-900"
                          : "text-gray-400"
                      }
                    >
                      {step.label}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {Array.isArray(selectedOrder.items) && (
            <div className="border-t pt-4">
              <h4 className="mb-3 font-semibold">Chi tiết món</h4>
              {selectedOrder.items.map((item, index) => (
                <div
                  key={`${item.menu_item_id}-${index}`}
                  className="flex justify-between gap-3 py-2 text-sm"
                >
                  <span>
                    {item.name || item.menu_item_id} × {item.quantity}
                    {item.note ? ` · ${item.note}` : ""}
                  </span>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-between border-t pt-4 font-bold">
            <span>Tổng tiền</span>
            <span className="text-orange-600">
              {formatPrice(selectedOrder.total)}
            </span>
          </div>
        </article>
      )}
    </section>
  );
}
