"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ORDER_STATUS } from "@/data/mock";
import { listenOrder } from "@/lib/supabase/realtime";

const STATUS_STEPS = [
  { value: ORDER_STATUS.PENDING, label: "Đã nhận đơn" },
  { value: ORDER_STATUS.COOKING, label: "Đang làm" },
  { value: ORDER_STATUS.DONE, label: "Làm xong" },
  { value: ORDER_STATUS.SERVED, label: "Đã mang ra" },
];

function formatPrice(value) {
  return `${Number(value || 0).toLocaleString("vi-VN")}đ`;
}

function getStatusIndex(status) {
  if (status === ORDER_STATUS.PAID) return STATUS_STEPS.length - 1;
  return STATUS_STEPS.findIndex((step) => step.value === status);
}

function storageKey(tableId) {
  return `smarttable-order-ids:${tableId}`;
}

function readSavedOrderIds(tableId) {
  if (typeof window === "undefined" || !tableId) return [];

  try {
    const parsed = JSON.parse(
      window.localStorage.getItem(storageKey(tableId)) || "[]"
    );
    return Array.isArray(parsed)
      ? [...new Set(parsed.map(String).filter(Boolean))]
      : [];
  } catch {
    return [];
  }
}

function saveOrderIds(tableId, ids) {
  if (typeof window === "undefined" || !tableId) return;
  window.localStorage.setItem(
    storageKey(tableId),
    JSON.stringify([...new Set(ids.map(String).filter(Boolean))])
  );
}

async function fetchOrder(orderId) {
  const response = await fetch(
    `/api/orders/${encodeURIComponent(orderId)}`,
    { cache: "no-store" }
  );
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || `Không thể tải đơn #${orderId}.`);
  }

  return data;
}

function OrderCard({ order, tableId, onRefresh, refreshing }) {
  const currentIndex = getStatusIndex(order.status);
  const currentLabel =
    STATUS_STEPS[currentIndex]?.label ||
    (order.status === ORDER_STATUS.PAID ? "Đã thanh toán" : "Đang cập nhật");

  return (
    <article className="space-y-5 rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">Đơn hàng #{order.id}</h2>
          <p className="mt-1 text-sm text-gray-500">
            Bàn {order.table_id ?? tableId}
          </p>
        </div>
        <span className="rounded-full bg-orange-100 px-3 py-1 text-sm font-semibold text-orange-700">
          {currentLabel}
        </span>
      </header>

      <ol className="grid gap-3 sm:grid-cols-4">
        {STATUS_STEPS.map((step, index) => {
          const completed = currentIndex >= 0 && currentIndex >= index;
          const current = currentIndex === index;

          return (
            <li key={step.value} className="flex items-center gap-2 sm:flex-col sm:items-start">
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                  completed
                    ? "bg-orange-500 text-white"
                    : "bg-gray-100 text-gray-400"
                }`}
                aria-current={current ? "step" : undefined}
              >
                {completed ? "✓" : index + 1}
              </span>
              <span
                className={
                  completed
                    ? "text-sm font-semibold text-gray-900"
                    : "text-sm text-gray-400"
                }
              >
                {step.label}
              </span>
            </li>
          );
        })}
      </ol>

      {Array.isArray(order.items) && (
        <div className="border-t pt-4">
          <h3 className="mb-3 font-semibold">Danh sách món</h3>
          <div className="space-y-3">
            {order.items.map((item, index) => (
              <div
                key={`${item.menu_item_id}-${index}`}
                className="flex justify-between gap-3 text-sm"
              >
                <div>
                  <p className="font-medium">
                    {item.name || item.menu_item_id} × {item.quantity}
                  </p>
                  {item.note && (
                    <p className="mt-1 text-gray-500">Ghi chú: {item.note}</p>
                  )}
                </div>
                <span className="shrink-0 text-gray-600">
                  {formatPrice(Number(item.price || 0) * Number(item.quantity || 0))}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between border-t pt-4 font-bold">
        <span>Tổng tiền</span>
        <span className="text-orange-600">{formatPrice(order.total)}</span>
      </div>

      <button
        type="button"
        onClick={() => onRefresh(order.id)}
        disabled={refreshing}
        className="rounded-xl border px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
      >
        {refreshing ? "Đang cập nhật..." : "Làm mới đơn này"}
      </button>
    </article>
  );
}

function StatusContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const tableId = params?.id;
  // Jira dùng ?order=<id>; orderId được hỗ trợ để tương thích CartPageClient hiện tại.
  const requestedOrderId =
    searchParams.get("order") || searchParams.get("orderId");

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshingId, setRefreshingId] = useState("");
  const [error, setError] = useState("");
  const [savedIds, setSavedIds] = useState([]);

  const refreshOne = useCallback(async (orderId) => {
    try {
      const updated = await fetchOrder(orderId);
      setOrders((current) => {
        const exists = current.some((order) => String(order.id) === String(orderId));
        return exists
          ? current.map((order) =>
              String(order.id) === String(orderId) ? updated : order
            )
          : [...current, updated];
      });
      return updated;
    } catch (err) {
      setError(err.message || "Không thể cập nhật đơn hàng.");
      return null;
    }
  }, []);

  const loadOrders = useCallback(async () => {
    if (!tableId) {
      setLoading(false);
      setError("Không xác định được bàn.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      let ids = readSavedOrderIds(tableId);

      // Chỉ ghi mã trên URL vào thiết bị sau khi API xác nhận đơn tồn tại
      // và đơn thuộc đúng bàn đang xem.
      if (requestedOrderId) {
        const requested = await fetchOrder(requestedOrderId);
        if (
          requested.table_id != null &&
          String(requested.table_id) !== String(tableId)
        ) {
          throw new Error("Đơn hàng không thuộc bàn này.");
        }
        ids = [...new Set([...ids, String(requested.id)])];
        saveOrderIds(tableId, ids);
      }

      setSavedIds(ids);

      if (ids.length === 0) {
        setOrders([]);
        setError("Thiết bị này chưa lưu mã đơn hàng nào cho bàn này.");
        return;
      }

      const results = await Promise.all(
        ids.map(async (id) => {
          try {
            const order = await fetchOrder(id);
            if (
              order.table_id != null &&
              String(order.table_id) !== String(tableId)
            ) {
              return { id, order: null };
            }
            return { id, order };
          } catch {
            return { id, order: null };
          }
        })
      );

      const validOrders = results
        .filter((result) => result.order)
        .map((result) => result.order);

      const validIds = validOrders.map((order) => String(order.id));
      saveOrderIds(tableId, validIds);
      setSavedIds(validIds);
      setOrders(validOrders);

      if (validOrders.length === 0) {
        setError("Không tìm thấy đơn hàng hợp lệ đã lưu trên thiết bị này.");
      }
    } catch (err) {
      setOrders([]);
      setError(err.message || "Không thể tải danh sách đơn hàng.");
    } finally {
      setLoading(false);
    }
  }, [requestedOrderId, tableId]);

  // Tải đơn lúc mở trang. Gọi trong callback bất đồng bộ (có cờ cancelled) để
  // không gọi setState trực tiếp trong effect (quy tắc lint react-hooks).
  useEffect(() => {
    let cancelled = false;
    Promise.resolve().then(() => {
      if (!cancelled) loadOrders();
    });
    return () => {
      cancelled = true;
    };
  }, [loadOrders]);

  useEffect(() => {
    if (!savedIds.length) return undefined;

    const unsubscribers = savedIds.map((orderId) =>
      listenOrder(orderId, () => {
        // Tải lại chi tiết để đồng bộ trạng thái, món và tổng tiền.
        refreshOne(orderId);
      })
    );

    return () => {
      unsubscribers.forEach((unsubscribe) => {
        if (typeof unsubscribe === "function") unsubscribe();
      });
    };
  }, [savedIds, refreshOne]);

  const sortedOrders = useMemo(
    () =>
      [...orders].sort((a, b) => {
        const aTime = new Date(a.created_at || 0).getTime();
        const bTime = new Date(b.created_at || 0).getTime();
        return bTime - aTime;
      }),
    [orders]
  );

  async function handleRefresh(orderId) {
    setRefreshingId(String(orderId));
    await refreshOne(orderId);
    setRefreshingId("");
  }

  return (
    <section className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Trạng thái đơn hàng</h1>
          <p className="mt-1 text-sm text-gray-500">
            Bàn {tableId} · Các đơn đã lưu trên thiết bị này
          </p>
        </div>
        <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-semibold text-green-700">
          Theo dõi cập nhật tự động
        </span>
      </header>

      {error && (
        <p role="status" className="rounded-xl bg-yellow-100 p-3 text-sm text-yellow-800">
          {error}
        </p>
      )}

      {loading ? (
        <div className="rounded-xl bg-white p-6 text-center text-gray-500">
          Đang tải trạng thái đơn hàng...
        </div>
      ) : sortedOrders.length > 0 ? (
        <div className="space-y-5">
          {sortedOrders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              tableId={tableId}
              onRefresh={handleRefresh}
              refreshing={refreshingId === String(order.id)}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-xl bg-white p-6 text-center text-gray-600">
          Chưa có đơn hàng để theo dõi.
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={loadOrders}
          disabled={loading}
          className="rounded-xl border px-4 py-2 font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          Làm mới danh sách
        </button>
        <button
          type="button"
          onClick={() => router.push(`/table/${tableId}`)}
          className="rounded-xl bg-orange-500 px-4 py-2 font-semibold text-white hover:bg-orange-600"
        >
          Về thực đơn
        </button>
      </div>
    </section>
  );
}

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="rounded-xl bg-white p-6 text-center text-gray-500">
          Đang tải trạng thái đơn hàng...
        </div>
      }
    >
      <StatusContent />
    </Suspense>
  );
}
