"use client";

import { Suspense, useEffect, useState } from "react";
import { formatPrice } from "@/lib/format";

function getTodayVN() {
  return new Date().toLocaleDateString("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
  });
}

function isValidStats(data, date) {
  return (
    data?.date === date &&
    Number.isFinite(data.total_revenue) &&
    data.total_revenue >= 0 &&
    Number.isSafeInteger(data.order_count) &&
    data.order_count >= 0 &&
    Array.isArray(data.top_items) &&
    data.top_items.every(
      (item) =>
        item != null &&
        (typeof item.menu_item_id === "number" || typeof item.menu_item_id === "string") &&
        typeof item.name === "string" &&
        Number.isSafeInteger(item.quantity) &&
        item.quantity >= 0
    )
  );
}

function AdminStatsPage() {
  const [date, setDate] = useState(getTodayVN);
  const [loadVersion, setLoadVersion] = useState(0);
  const [result, setResult] = useState(null);

  // Chỉ hiển thị kết quả của lần tải hiện tại, tránh gán số liệu cũ cho ngày mới.
  const currentResult = result?.date === date && result.version === loadVersion ? result : null;
  const loading = Boolean(date) && !currentResult;
  const stats = currentResult?.data;
  const error = currentResult?.error;
  const displayDate = date ? date.split("-").reverse().join("/") : "";
  const topItems = stats
    ? [...stats.top_items].sort((a, b) => b.quantity - a.quantity).slice(0, 5)
    : [];
  const maxQuantity = Math.max(1, ...topItems.map((item) => item.quantity));

  useEffect(() => {
    if (!date) return;

    const controller = new AbortController();

    async function loadStats() {
      try {
        const response = await fetch(`/api/stats?date=${encodeURIComponent(date)}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        const data = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(data?.error || "Không thể tải thống kê doanh thu. Vui lòng thử lại.");
        }
        if (!isValidStats(data, date)) {
          throw new Error("Dữ liệu thống kê không hợp lệ. Vui lòng thử lại.");
        }
        if (!controller.signal.aborted) {
          setResult({ date, version: loadVersion, data });
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setResult({
            date,
            version: loadVersion,
            error: err instanceof TypeError
              ? "Không thể kết nối máy chủ. Vui lòng thử lại."
              : err.message || "Không thể tải thống kê doanh thu. Vui lòng thử lại.",
          });
        }
      }
    }

    loadStats();
    return () => controller.abort();
  }, [date, loadVersion]);

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 pb-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-1 text-xs font-bold uppercase tracking-[0.18em] text-orange-500">
            Quản trị nhà hàng / Tổng quan
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Thống kê doanh thu
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Theo dõi doanh thu, số đơn và các món bán chạy theo ngày.
          </p>
        </div>
        <div className="flex w-full flex-wrap items-end gap-3 sm:w-auto">
          <label htmlFor="stats-date" className="min-w-0 flex-1 text-sm font-semibold text-slate-700 sm:flex-none">
            Ngày thống kê
            <input
              id="stats-date"
              type="date"
              min="0001-01-01"
              max="9999-12-31"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className="mt-2 block min-h-11 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
            />
          </label>
          <button
            type="button"
            disabled={loading || !date}
            onClick={() => setLoadVersion((value) => value + 1)}
            className="min-h-11 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {error ? "Thử lại" : "Làm mới"}
          </button>
        </div>
      </div>

      <p className="text-sm text-slate-500">
        Tính theo ngày tạo đơn, từ 00:00 đến hết ngày (giờ Việt Nam).
        Chỉ gồm đơn đã phục vụ hoặc đã thanh toán.
      </p>

      {loading && <p role="status" className="text-sm text-slate-500">Đang tải thống kê...</p>}
      {!date && <p role="status" className="text-sm text-slate-500">Chọn ngày để xem thống kê.</p>}
      {error && (
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <div aria-busy={loading} className="space-y-6">
        <dl className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <dt className="flex items-center justify-between gap-3 text-sm font-medium text-slate-500">
              Tổng doanh thu
              <span aria-hidden="true" className="rounded-lg bg-orange-50 px-2.5 py-1 text-xs font-bold text-orange-600">VND</span>
            </dt>
            <dd className="mt-3 break-words text-3xl font-bold tracking-tight text-orange-600 sm:text-4xl">
              {stats ? formatPrice(stats.total_revenue) : "—"}
            </dd>
            <dd className="mt-2 text-xs text-slate-500">{displayDate ? `Ngày ${displayDate}` : "Chưa chọn ngày"}</dd>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <dt className="flex items-center justify-between gap-3 text-sm font-medium text-slate-500">
              Số đơn
              <span aria-hidden="true" className="rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">ĐƠN</span>
            </dt>
            <dd className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              {stats ? stats.order_count.toLocaleString("vi-VN") : "—"}
            </dd>
            <dd className="mt-2 text-xs text-slate-500">Đã phục vụ hoặc đã thanh toán</dd>
          </div>
        </dl>

        <section aria-labelledby="top-items-title" className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-5 sm:p-6">
            <h2 id="top-items-title" className="text-lg font-bold text-slate-900">Top 5 món bán chạy</h2>
            <p className="mt-1 text-sm text-slate-500">Xếp hạng theo tổng số lượng bán trong ngày.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Các món bán chạy{displayDate ? ` ngày ${displayDate}` : ""}</caption>
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th scope="col" className="px-3 py-4 sm:px-6">Hạng</th>
                  <th scope="col" className="px-3 py-4 sm:px-6">Món ăn</th>
                  <th scope="col" className="px-3 py-4 text-right sm:px-6">Số lượng</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {topItems.map((item, index) => (
                  <tr key={item.menu_item_id} className="hover:bg-slate-50">
                    <td className="w-16 px-3 py-5 sm:px-6">
                      <span className={`inline-flex h-8 w-8 items-center justify-center rounded-lg font-bold ${index === 0 ? "bg-orange-100 text-orange-700" : "bg-slate-100 text-slate-500"}`}>
                        {index + 1}
                      </span>
                    </td>
                    <th scope="row" className="px-3 py-5 font-semibold text-slate-900 sm:px-6">
                      <span className="break-words">{item.name}</span>
                      <div aria-hidden="true" className="mt-2 h-1.5 max-w-md overflow-hidden rounded-full bg-orange-50">
                        <div className="h-full rounded-full bg-orange-400" style={{ width: `${item.quantity / maxQuantity * 100}%` }} />
                      </div>
                    </th>
                    <td className="px-3 py-5 text-right font-bold tabular-nums text-slate-900 sm:px-6">
                      {item.quantity.toLocaleString("vi-VN")}
                    </td>
                  </tr>
                ))}
                {topItems.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-5 py-14 text-center text-slate-500">
                      {loading ? "Đang tải danh sách món bán chạy..."
                        : error ? "Chưa tải được danh sách món bán chạy."
                          : !date ? "Chọn ngày để xem các món bán chạy."
                            : stats?.order_count === 0 ? "Chưa có đơn đã phục vụ hoặc đã thanh toán trong ngày này."
                              : "Chưa có dữ liệu món bán trong ngày này."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<p role="status" className="text-sm text-slate-500">Đang tải thống kê...</p>}>
      <AdminStatsPage />
    </Suspense>
  );
}
