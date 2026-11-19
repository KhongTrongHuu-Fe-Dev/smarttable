"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

// Trang chủ: một điểm vào chung.
// Khách thật sự vào bằng QR ở bàn (/table/[id]); trang này tiện cho demo và nhân viên.
export default function HomePage() {
  const router = useRouter();
  const [tables, setTables] = useState([]);
  const [tableId, setTableId] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function loadTables() {
      try {
        const res = await fetch("/api/tables", { cache: "no-store" });
        const data = await res.json();
        if (!cancelled && res.ok && Array.isArray(data)) {
          setTables(data);
          setTableId((current) => current || String(data[0]?.id ?? ""));
        }
      } catch {
        // Không tải được danh sách bàn thì để khách tự nhập số bàn.
      }
    }
    loadTables();
    return () => {
      cancelled = true;
    };
  }, []);

  function goToTable(event) {
    event.preventDefault();
    const id = String(tableId).trim();
    if (id) router.push(`/table/${encodeURIComponent(id)}`);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md space-y-4">
        <header className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">SmartTable</h1>
          <p className="mt-1 text-sm text-gray-500">Gọi món tại bàn bằng mã QR</p>
        </header>

        <form
          onSubmit={goToTable}
          className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200"
        >
          <h2 className="font-semibold text-gray-900">Tôi là khách</h2>
          <p className="mt-1 text-sm text-gray-500">
            Quét mã QR trên bàn, hoặc chọn bàn của bạn ở đây.
          </p>

          <label htmlFor="table" className="mt-4 mb-1 block text-sm font-medium text-gray-900">
            Bàn số
          </label>
          {tables.length > 0 ? (
            <select
              id="table"
              value={tableId}
              onChange={(e) => setTableId(e.target.value)}
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none focus:ring-2 focus:ring-orange-500"
            >
              {tables.map((table) => (
                <option key={table.id} value={table.id}>
                  Bàn {table.number ?? table.id}
                </option>
              ))}
            </select>
          ) : (
            <input
              id="table"
              inputMode="numeric"
              value={tableId}
              onChange={(e) => setTableId(e.target.value)}
              placeholder="Ví dụ: 1"
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 outline-none focus:ring-2 focus:ring-orange-500"
            />
          )}

          <button
            type="submit"
            disabled={!String(tableId).trim()}
            className="mt-4 w-full rounded-xl bg-orange-500 px-4 py-3 font-semibold text-white hover:bg-orange-600 disabled:opacity-50"
          >
            Vào gọi món
          </button>
        </form>

        <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
          <h2 className="font-semibold text-gray-900">Tôi là nhân viên</h2>
          <p className="mt-1 text-sm text-gray-500">
            Đăng nhập một lần, hệ thống tự chuyển đến trang của bạn: bếp vào màn hình bếp, quản trị viên vào trang quản trị.
          </p>
          <Link
            href="/login"
            className="mt-4 block w-full rounded-xl bg-gray-900 px-4 py-3 text-center font-semibold text-white hover:bg-gray-800"
          >
            Đăng nhập nhân viên
          </Link>
        </div>
      </div>
    </main>
  );
}
