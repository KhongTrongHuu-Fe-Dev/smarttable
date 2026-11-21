"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { createSupabaseBrowser } from "@/lib/supabase/browser";
import { ROLES } from "@/lib/supabase/roles";
import { listenOrders } from "@/lib/supabase/realtime";
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

// Đơn mới / đổi trạng thái đến qua Supabase Realtime (SCRUM-44).
// Tải lại định kỳ thưa hơn chỉ để dự phòng khi mạng chập chờn làm rơi sự kiện.
const FALLBACK_REFRESH_MS = 30000;
// Gộp nhiều sự kiện đến sát nhau thành 1 lần tải.
const EVENT_DEBOUNCE_MS = 300;
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

// Tiếng "ting" ngắn khi có đơn mới. Trình duyệt có thể chặn nếu chưa bấm gì trên trang.
function playBeep() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.5);
    osc.onended = () => ctx.close();
  } catch {
    // Không phát được âm thanh thì bỏ qua.
  }
}

export default function KitchenPage() {
  const [orders, setOrders] = useState([]);
  const [tableNumbers, setTableNumbers] = useState(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [live, setLive] = useState(false); // đã nối realtime chưa
  const [soundOn, setSoundOn] = useState(true);
  const [newCount, setNewCount] = useState(0); // đơn mới từ lúc mở trang
  const pendingMoves = useRef(0); // số thao tác đổi trạng thái đang gửi
  const soundRef = useRef(true);
  const knownIds = useRef(null); // id đơn đã thấy, để nhận ra đơn mới

  // Chỉ admin mới thấy nút quay về trang quản trị.
  useEffect(() => {
    let cancelled = false;
    createSupabaseBrowser()
      .auth.getUser()
      .then(({ data }) => {
        if (!cancelled) setIsAdmin(data?.user?.app_metadata?.role === ROLES.ADMIN);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  function applyResult(result) {
    setLoading(false);
    setError(result.error);
    if (result.orders) {
      setOrders(result.orders);
      setTableNumbers(new Map(result.tables.map((t) => [String(t.id), t.number])));
    }
  }

  useEffect(() => {
    soundRef.current = soundOn;
  }, [soundOn]);

  // Tải đơn; bỏ qua kết quả nếu đang có thao tác kéo đơn chưa gửi xong
  // (tránh ghi đè cập nhật tức thì trên màn hình).
  const load = useCallback(async () => {
    const result = await fetchKitchenData();
    if (pendingMoves.current > 0) return;

    if (result.orders) {
      const ids = new Set(result.orders.map((o) => o.id));
      if (knownIds.current) {
        const fresh = result.orders.filter(
          (o) => !knownIds.current.has(o.id) && o.status === ORDER_STATUS.PENDING
        );
        if (fresh.length > 0) {
          setNewCount((count) => count + fresh.length);
          if (soundRef.current) playBeep();
        }
      }
      knownIds.current = ids;
    }
    applyResult(result);
  }, []);

  useEffect(() => {
    let debounce;
    load();

    // Realtime: có đơn mới hoặc đổi trạng thái thì tải lại ngay.
    // (Sự kiện realtime không kèm danh sách món nên cần tải lại đầy đủ.)
    const stopListening = listenOrders(
      () => {
        clearTimeout(debounce);
        debounce = setTimeout(load, EVENT_DEBOUNCE_MS);
      },
      (status) => {
        setLive(status === "SUBSCRIBED");
        // Vừa nối lại sau khi rớt mạng: tải bù những gì đã lỡ.
        if (status === "SUBSCRIBED") load();
      }
    );

    const fallback = setInterval(load, FALLBACK_REFRESH_MS);
    return () => {
      clearTimeout(debounce);
      clearInterval(fallback);
      stopListening();
    };
  }, [load]);

  async function moveOrder(orderId, nextStatus) {
    setActionError("");
    const previous = orders;
    pendingMoves.current += 1;
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
    } finally {
      pendingMoves.current -= 1;
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900">Màn hình bếp</h1>
          <span
            className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
              live ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
            }`}
            title={live ? "Đơn mới hiện ngay" : "Chưa nối realtime, đang tự tải lại định kỳ"}
          >
            <span className={`h-2 w-2 rounded-full ${live ? "bg-green-500" : "bg-amber-500"}`} />
            {live ? "Trực tiếp" : "Đang kết nối..."}
          </span>
          {newCount > 0 && (
            <button
              type="button"
              onClick={() => setNewCount(0)}
              className="rounded-full bg-orange-500 px-2.5 py-1 text-xs font-semibold text-white"
              title="Bấm để xóa số đếm"
            >
              +{newCount} đơn mới
            </button>
          )}
        </div>
        <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setSoundOn((value) => !value)}
          aria-pressed={soundOn}
          className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-gray-700 ring-1 ring-gray-200 hover:bg-gray-50"
        >
          {soundOn ? "🔔 Có tiếng" : "🔕 Tắt tiếng"}
        </button>
        {isAdmin && (
          <Link
            href="/admin"
            className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-gray-700 ring-1 ring-gray-200 hover:bg-gray-50"
          >
            ← Về quản trị
          </Link>
        )}
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
