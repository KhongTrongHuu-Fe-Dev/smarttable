
"use client";

import Link from "next/link";
import { useCart } from "./CartContext";

export default function CustomerShell({ children, tableId }) {
  const { totalCount } = useCart();

  const links = [
    { href: `/table/${tableId}`, label: "Thực đơn" },
    { href: `/table/${tableId}/cart`, label: `Giỏ hàng (${totalCount})` },
    { href: `/table/${tableId}/status`, label: "Đơn hàng" },
  ];

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="sticky top-0 z-20 border-b bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div>
            <h1 className="text-lg font-bold">SmartTable</h1>
            <p className="text-xs text-gray-500">Bàn {tableId}</p>
          </div>

          <nav className="flex gap-2 text-sm">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-xl bg-gray-100 px-3 py-2 text-gray-700 hover:bg-orange-500 hover:text-white"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl p-4 pb-24">
        {children}
      </main>

      {/* Nút giỏ hàng nổi */}
      <Link
        href={`/table/${tableId}/cart`}
        aria-label={`Giỏ hàng, ${totalCount} món`}
        className="fixed bottom-4 right-4 z-30 flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-3 font-semibold text-white shadow-lg hover:bg-orange-600"
      >
        <span aria-hidden>🛒</span>
        <span>Giỏ hàng</span>
        <span className="min-w-6 rounded-full bg-white px-1.5 text-center text-sm text-orange-600">
          {totalCount}
        </span>
      </Link>
    </div>
  );
}
