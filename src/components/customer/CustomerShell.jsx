"use client";

import Link from "next/link";
import { useCart } from "./CartContext";

export default function CustomerShell({ children, tableId }) {
  const { totalCount } = useCart();

  const links = [
    { href: `/table/${tableId}`, label: "Thực đơn" },
    { href: `/table/${tableId}/cart`, label: `Giỏ hàng (${totalCount})` },
    { href: `/table/${tableId}/status`, label: "Đơn hàng" },
    { href: `/table/${tableId}/chat`, label: "Hỏi AI" },
  ];

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="sticky top-0 z-20 border-b bg-white">
        <div className="mx-auto flex max-w-5xl flex-col items-start gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="shrink-0">
            <h1 className="text-lg font-bold">SmartTable</h1>
            <p className="text-xs text-gray-500">Bàn {tableId}</p>
          </div>

          <nav
            aria-label="Điều hướng bàn khách"
            className="flex w-full flex-nowrap gap-2 overflow-x-auto text-sm sm:w-auto sm:max-w-full [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="shrink-0 whitespace-nowrap rounded-xl bg-gray-100 px-3 py-2 text-gray-700 hover:bg-orange-500 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl p-4 pb-8 sm:pb-24">
        {children}
      </main>

      {/* Nút nổi chỉ hiển thị trên màn hình từ tablet trở lên để không che nội dung mobile. */}
      <Link
        href={`/table/${tableId}/cart`}
        aria-label={`Giỏ hàng, ${totalCount} món`}
        className="fixed bottom-4 right-4 z-30 hidden items-center gap-2 rounded-xl bg-orange-500 px-4 py-3 font-semibold text-white shadow-lg hover:bg-orange-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-700 sm:flex"
      >
        <span aria-hidden="true">🛒</span>
        <span>Giỏ hàng</span>
        <span className="min-w-6 rounded-full bg-white px-1.5 text-center text-sm text-orange-600">
          {totalCount}
        </span>
      </Link>
    </div>
  );
}
