"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ORDER_STATUS } from "@/data/mock";
import { formatPrice } from "@/lib/format";

const statuses = [
  ["", "Tất cả trạng thái"],
  [ORDER_STATUS.PENDING, "Mới"],
  [ORDER_STATUS.COOKING, "Đang chuẩn bị"],
  [ORDER_STATUS.DONE, "Đã hoàn thành"],
  [ORDER_STATUS.SERVED, "Đã phục vụ"],
  [ORDER_STATUS.PAID, "Đã thanh toán"],
];

const statusMeta = {
  pending: ["Mới", "bg-blue-50 text-blue-700 ring-blue-200"],
  cooking: ["Đang chuẩn bị", "bg-amber-50 text-amber-700 ring-amber-200"],
  done: ["Đã hoàn thành", "bg-violet-50 text-violet-700 ring-violet-200"],
  served: ["Đã phục vụ", "bg-emerald-50 text-emerald-700 ring-emerald-200"],
  paid: ["Đã thanh toán", "bg-slate-100 text-slate-600 ring-slate-200"],
};

function dateLabel(value) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
  }).format(new Date(value));
}

function Badge({ status }) {
  const meta = statusMeta[status] || [status || "Không rõ", "bg-slate-100 text-slate-600 ring-slate-200"];
  return <span className={"inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset " + meta[1]}>{meta[0]}</span>;
}

function Items({ order }) {
  return <div className="space-y-2">
    {(order.items || []).map((item, index) => (
      <div key={String(item.menu_item_id) + "-" + index} className="flex justify-between gap-4 text-sm">
        <div><p className="font-medium text-slate-800">{item.quantity} × {item.name || ("Món #" + item.menu_item_id)}</p>{item.note && <p className="text-xs text-slate-500">Ghi chú: {item.note}</p>}</div>
        <span className="shrink-0 text-slate-600">{formatPrice(Number(item.price) * Number(item.quantity))}</span>
      </div>
    ))}
  </div>;
}

export default function Page() {
  const [orders, setOrders] = useState([]);
  const [tables, setTables] = useState([]);
  const [status, setStatus] = useState("");
  const [tableId, setTableId] = useState("");
  const [date, setDate] = useState("");
  const [expanded, setExpanded] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updating, setUpdating] = useState(null);

  const tableNumbers = useMemo(() => new Map(tables.map((table) => [String(table.id), table.number])), [tables]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (tableId) params.set("table_id", tableId);
    if (date) params.set("date", date);
    try {
      const results = await Promise.all([
        fetch("/api/orders?" + params.toString(), { cache: "no-store" }),
        fetch("/api/tables", { cache: "no-store" }),
      ]);
      const orderData = await results[0].json().catch(() => ({}));
      if (!results[0].ok) throw new Error(orderData.error || "Không tải được danh sách đơn hàng.");
      const tableData = results[1].ok ? await results[1].json() : [];
      setOrders(Array.isArray(orderData) ? orderData : orderData.orders || []);
      setTables(Array.isArray(tableData) ? tableData : []);
    } catch (err) {
      setError(err.message || "Không tải được danh sách đơn hàng.");
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [date, status, tableId]);

  useEffect(() => {
    const timer = setTimeout(load, 0);
    return () => clearTimeout(timer);
  }, [load]);

  async function markPaid(order) {
    if (order.status !== ORDER_STATUS.SERVED) return;
    setUpdating(order.id);
    setError("");
    try {
      const response = await fetch("/api/orders/" + order.id, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: ORDER_STATUS.PAID }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Không thể cập nhật trạng thái thanh toán.");
      setOrders((current) => current.map((item) => item.id === order.id ? { ...item, status: ORDER_STATUS.PAID } : item));
    } catch (err) {
      setError(err.message || "Không thể cập nhật trạng thái thanh toán.");
    } finally {
      setUpdating(null);
    }
  }

  return <section className="space-y-6">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div><p className="text-sm font-medium text-emerald-600">Vận hành nhà hàng</p><h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">Danh sách đơn hàng</h2><p className="mt-1 text-sm text-slate-500">Theo dõi đơn và xác nhận thanh toán tại quầy.</p></div>
      <button type="button" onClick={load} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"><span aria-hidden="true">↻</span> Làm mới</button>
    </div>

    <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-3">
      <label className="text-sm font-medium text-slate-700">Trạng thái<select value={status} onChange={(event) => setStatus(event.target.value)} className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-normal outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100">{statuses.map((item) => <option key={item[0]} value={item[0]}>{item[1]}</option>)}</select></label>
      <label className="text-sm font-medium text-slate-700">Bàn<select value={tableId} onChange={(event) => setTableId(event.target.value)} className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-normal outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"><option value="">Tất cả bàn</option>{tables.map((table) => <option key={table.id} value={table.id}>Bàn {table.number}</option>)}</select></label>
      <label className="text-sm font-medium text-slate-700">Ngày đặt<input type="date" value={date} onChange={(event) => setDate(event.target.value)} className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-normal outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" /></label>
    </div>

    {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><h3 className="font-semibold text-slate-900">Đơn hàng ({orders.length})</h3><span className="text-xs text-slate-500">Bấm một đơn để xem món</span></div>
      {loading ? <div className="px-5 py-12 text-center text-sm text-slate-500">Đang tải đơn hàng…</div> : orders.length === 0 ? <div className="px-5 py-12 text-center text-sm text-slate-500">Không có đơn hàng phù hợp.</div> :
        <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Đơn hàng</th><th className="px-5 py-3">Bàn</th><th className="px-5 py-3">Thời gian</th><th className="px-5 py-3">Tổng tiền</th><th className="px-5 py-3">Trạng thái</th><th className="px-5 py-3 text-right">Thao tác</th></tr></thead>
          <tbody className="divide-y divide-slate-100">{orders.map((order) => {
            const isExpanded = expanded === order.id;
            return <tr key={order.id} className="align-top hover:bg-slate-50/70"><td colSpan={6} className="p-0">
              <div className="grid grid-cols-[1.4fr_.7fr_1.2fr_1fr_1fr_1.1fr] items-center px-5 py-4" onClick={() => setExpanded(isExpanded ? null : order.id)} role="button" tabIndex={0} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") setExpanded(isExpanded ? null : order.id); }}>
                <div><p className="font-semibold text-slate-900">#{String(order.id).slice(0, 8)}</p><p className="mt-0.5 text-xs text-slate-500">{order.items?.length || 0} món</p></div>
                <span className="text-slate-700">Bàn {tableNumbers.get(String(order.table_id)) ?? order.table_id}</span><span className="text-slate-600">{dateLabel(order.created_at)}</span><span className="font-semibold text-slate-800">{formatPrice(order.total)}</span><Badge status={order.status} />
                <div className="flex justify-end" onClick={(event) => event.stopPropagation()}>{order.status === ORDER_STATUS.SERVED ? <button type="button" disabled={updating === order.id} onClick={() => markPaid(order)} className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:cursor-wait disabled:opacity-60">{updating === order.id ? "Đang lưu…" : "Đã thanh toán"}</button> : order.status === ORDER_STATUS.PAID ? <span className="text-xs font-medium text-slate-400">Đã thanh toán</span> : <span className="text-xs text-slate-400">Chờ phục vụ</span>}</div>
              </div>
              {isExpanded && <div className="border-t border-slate-100 bg-slate-50 px-5 py-4"><div className="max-w-xl"><p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Chi tiết món</p><Items order={order} /></div></div>}
            </td></tr>;
          })}</tbody></table></div>}
    </div>
  </section>;
}

