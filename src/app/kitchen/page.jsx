"use client";

import { useEffect, useState } from "react";
import { ORDER_STATUS } from "@/data/mock";
import OrderCard from "@/components/kitchen/OrderCard";
import LogoutButton from "@/components/LogoutButton";

// Mỗi cột: trạng thái, tiêu đề, nút chuyển sang trạng thái kế tiếp
const COLUMNS = [
  {
    status: ORDER_STATUS.PENDING,
    title: "Mới",
    actionLabel: "Bắt đầu làm",
    next: ORDER_STATUS.COOKING,
  },
  {
    status: ORDER_STATUS.COOKING,
    title: "Đang làm",
    actionLabel: "Xong món",
    next: ORDER_STATUS.DONE,
  },
  {
    status: ORDER_STATUS.DONE,
    title: "Xong",
    actionLabel: "Đã mang ra bàn",
    next: ORDER_STATUS.SERVED,
  },
];

// Tạm thời tự tải lại mỗi vài giây. SCRUM-44 sẽ thay bằng Supabase Realtime.
const REFRESH_MS = 5000;
const EMPTY_MENU = new Map(); // tên món đã có sẵn trong đơn từ API

async function fetchKitchenData() {
  try {
    const [ordersRes, tablesRes] = await Promise.all([
      fetch("/api/orders", { cache: "no-store" }),
      fetch("/api/tables", { cache: "no-store" }),
    ]);
    const ordersData = await ordersRes.json();
    if (!ordersRes.ok) {
      throw new Error(ordersData.message || ordersData.error || "Không tải được đơn.");
    }
    // Bàn chỉ để hiện số bàn; lỗi thì dùng table_id thay thế.
    const tablesData = tablesRes.ok ? await tablesRes.json() : [];
    const list = Array.isArray(ordersData) ? ordersData : ordersData.orders;
    return { orders: list ?? [], tables: Array.isArray(tablesData) ? tablesData : [], error: "" };
  } catch (err) {
    return { orders: null, tables: null, error: err.message || "Không tải được đơn." };
  }
}

export default function KitchenPage() {
  const [orders, setOrders] = useState([]);
  const [tableNumbers, setTableNumbers] = useState(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");

  function applyResult(result) {
    setLoading(false);
    setError(result.error);
    if (result.orders) {
      setOrders(result.orders);
      setTableNumbers(new Map(result.tables.map((t) => [String(t.id), t.number])));
    }
  }

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const result = await fetchKitchenData();
      if (!cancelled) applyResult(result);
    }
    load();
    const timer = setInterval(load, REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  async function moveOrder(orderId, nextStatus) {
    setActionError("");
    const previous = orders;
    // Cập nhật ngay trên màn hình, lỗi thì trả lại như cũ.
    setOrders((current) =>
      current.map((o) => (o.id === orderId ? { ...o, status: nextStatus } : o))
    );
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || data.error || "Không đổi được trạng thái.");
      }
    } catch (err) {
      setOrders(previous);
      setActionError(err.message || "Không đổi được trạng thái.");
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="mb-6 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-900">Màn hình bếp</h1>
        <div className="flex gap-2">
        <button
          type="button"
          onClick={async () => applyResult(await fetchKitchenData())}
          className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-gray-700 ring-1 ring-gray-200 hover:bg-gray-50"
        >
          Tải lại
        </button>
        <LogoutButton className="bg-white text-gray-700" />
        </div>
      </div>

      {error && (
        <p className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>
      )}
      {actionError && (
        <p className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{actionError}</p>
      )}
      {loading && <p className="mb-4 text-sm text-gray-500">Đang tải đơn...</p>}

      <div className="grid gap-4 md:grid-cols-3">
        {COLUMNS.map((column) => {
          const columnOrders = orders
            .filter((o) => o.status === column.status)
            .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

          return (
            <section key={column.status} className="rounded-xl bg-gray-200/60 p-3">
              <h2 className="mb-3 flex items-center justify-between font-semibold text-gray-900">
                {column.title}
                <span className="rounded-full bg-white px-2 text-sm">
                  {columnOrders.length}
                </span>
              </h2>

              <div className="space-y-3">
                {!loading && columnOrders.length === 0 && (
                  <p className="py-6 text-center text-sm text-gray-500">
                    Không có đơn
                  </p>
                )}
                {columnOrders.map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    tableNumber={tableNumbers.get(String(order.table_id)) ?? order.table_id}
                    menuById={EMPTY_MENU}
                    actionLabel={column.actionLabel}
                    onAction={(id) => moveOrder(id, column.next)}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
