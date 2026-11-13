"use client";

import { useState } from "react";
import {
  ORDER_STATUS,
  mockMenu,
  mockOrders,
  mockTables,
} from "@/data/mock";
import OrderCard from "@/components/kitchen/OrderCard";

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

const menuById = new Map(mockMenu.map((m) => [m.id, m]));
const tableById = new Map(mockTables.map((t) => [t.id, t]));

export default function KitchenPage() {
  // SCRUM-27 sẽ đổi chỗ lấy dữ liệu sang /api/orders, SCRUM-44 làm realtime
  const [orders, setOrders] = useState(mockOrders);

  function moveOrder(orderId, nextStatus) {
    setOrders((current) =>
      current.map((o) => (o.id === orderId ? { ...o, status: nextStatus } : o))
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Màn hình bếp</h1>

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
                {columnOrders.length === 0 && (
                  <p className="py-6 text-center text-sm text-gray-500">
                    Không có đơn
                  </p>
                )}
                {columnOrders.map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    tableNumber={tableById.get(order.table_id)?.number ?? order.table_id}
                    menuById={menuById}
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
