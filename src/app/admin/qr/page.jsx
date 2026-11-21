"use client";

import { useEffect, useRef, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";

// Địa chỉ web mặc định khi đang chạy trên máy (localhost không quét được bằng điện thoại).
const DEFAULT_SITE = "https://smarttable-sigma.vercel.app";
const QR_SIZE = 512; // độ phân giải ảnh tải về / in (hiển thị nhỏ hơn bằng CSS)

function guessSiteUrl() {
  const { origin, hostname } = window.location;
  const isLocal = hostname === "localhost" || hostname === "127.0.0.1" || hostname.endsWith(".local");
  return isLocal ? DEFAULT_SITE : origin;
}

function cleanBase(value) {
  return value.trim().replace(/\/+$/, "");
}

export default function AdminQrPage() {
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [siteUrl, setSiteUrl] = useState(DEFAULT_SITE);
  const gridRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    // Điền địa chỉ web sau lần render đầu (tránh lệch giao diện server/client).
    Promise.resolve().then(() => {
      if (!cancelled) setSiteUrl(guessSiteUrl());
    });

    fetch("/api/tables", { cache: "no-store" })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Không tải được danh sách bàn.");
        return Array.isArray(data) ? data : [];
      })
      .then((list) => {
        if (!cancelled) setTables([...list].sort((a, b) => a.number - b.number));
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || "Không tải được danh sách bàn.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const base = cleanBase(siteUrl);
  const tableUrl = (table) => `${base}/table/${table.id}`;
  const canvasOf = (tableId) =>
    gridRef.current?.querySelector(`canvas[data-table="${tableId}"]`);

  function downloadOne(table) {
    const canvas = canvasOf(table.id);
    if (!canvas) return;
    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = `qr-ban-${table.number}.png`;
    link.click();
  }

  // In tất cả: mở cửa sổ riêng chỉ chứa các mã QR để không dính thanh điều hướng admin.
  function printAll() {
    const cards = tables
      .map((table) => {
        const canvas = canvasOf(table.id);
        if (!canvas) return "";
        return `<div class="card">
          <div class="title">Bàn ${table.number}</div>
          <img src="${canvas.toDataURL("image/png")}" alt="QR bàn ${table.number}" />
          <div class="hint">Quét mã để xem menu và gọi món</div>
        </div>`;
      })
      .join("");

    const win = window.open("", "_blank");
    if (!win) {
      window.alert("Trình duyệt đang chặn cửa sổ in. Hãy cho phép cửa sổ bật lên rồi thử lại.");
      return;
    }
    win.document.write(`<!doctype html><html lang="vi"><head><meta charset="utf-8" />
      <title>Mã QR các bàn</title>
      <style>
        * { box-sizing: border-box; }
        body { margin: 0; padding: 12mm; font-family: Arial, sans-serif; }
        .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10mm; }
        .card { border: 1px dashed #999; border-radius: 8px; padding: 8mm; text-align: center; break-inside: avoid; }
        .title { font-size: 28px; font-weight: 700; margin-bottom: 6mm; }
        img { width: 100%; max-width: 70mm; height: auto; }
        .hint { margin-top: 5mm; font-size: 14px; color: #444; }
      </style></head><body><div class="grid">${cards}</div>
      <script>window.onload = function () { window.print(); };<\/script>
      </body></html>`);
    win.document.close();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mã QR các bàn</h1>
          <p className="mt-1 text-sm text-gray-600">
            Mỗi bàn một mã. Khách quét mã sẽ mở đúng trang menu của bàn đó.
          </p>
        </div>
        <button
          type="button"
          onClick={printAll}
          disabled={loading || tables.length === 0}
          className="rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-50"
        >
          In tất cả
        </button>
      </div>

      <label className="block max-w-xl">
        <span className="text-sm font-medium text-gray-700">Địa chỉ website trong mã QR</span>
        <input
          value={siteUrl}
          onChange={(event) => setSiteUrl(event.target.value)}
          placeholder={DEFAULT_SITE}
          className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-4 py-2 text-gray-900 outline-none focus:ring-2 focus:ring-orange-500"
        />
        <span className="mt-1 block text-xs text-gray-500">
          Dùng địa chỉ chạy thật (Vercel). Địa chỉ <code>localhost</code> thì điện thoại không mở được.
        </span>
      </label>

      {error && (
        <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}
      {loading && <p className="text-sm text-gray-500">Đang tải danh sách bàn...</p>}
      {!loading && !error && tables.length === 0 && (
        <p className="text-sm text-gray-500">Chưa có bàn nào. Hãy thêm bàn ở mục Bàn.</p>
      )}

      <div ref={gridRef} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tables.map((table) => (
          <div
            key={table.id}
            className="flex flex-col items-center gap-3 rounded-xl bg-white p-4 ring-1 ring-gray-200"
          >
            <p className="text-lg font-semibold text-gray-900">Bàn {table.number}</p>
            <QRCodeCanvas
              value={tableUrl(table)}
              size={QR_SIZE}
              level="M"
              marginSize={2}
              data-table={table.id}
              style={{ width: 180, height: 180 }}
            />
            <p className="max-w-full break-all text-center text-xs text-gray-500">{tableUrl(table)}</p>
            <button
              type="button"
              onClick={() => downloadOne(table)}
              className="w-full rounded-xl bg-gray-100 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-200"
            >
              Tải ảnh PNG
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
