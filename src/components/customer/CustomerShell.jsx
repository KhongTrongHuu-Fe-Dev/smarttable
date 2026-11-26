"use client";

import Link from "next/link";
import { useCart } from "./CartContext";

export default function CustomerShell({ children, tableId }) {
  const { totalCount } = useCart();

  const links = [
    { href: `/table/${tableId}`, label: "Thực đơn" },
    { href: `/table/${tableId}/status`, label: "Đơn hàng" },
    { href: `/table/${tableId}/chat`, label: "Gợi ý món" },
  ];

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="sticky top-0 z-20 border-b bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="shrink-0">
            <h1 className="text-lg font-bold">SmartTable</h1>
            <p className="text-xs text-gray-500">Bàn {tableId}</p>
          </div>

          <nav
            aria-label="Điều hướng bàn khách"
            className="order-last flex w-full flex-nowrap gap-2 overflow-x-auto text-sm sm:order-none sm:ml-auto sm:w-auto sm:max-w-full [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
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

          {/* Biểu tượng giỏ hàng nằm trên thanh đầu trang (luôn dính khi cuộn) ở mọi cỡ màn hình. */}
          <Link
            href={`/table/${tableId}/cart`}
            aria-label={`Giỏ hàng, ${totalCount} món`}
            className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-500 text-white hover:bg-orange-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-700"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="9" cy="20" r="1.5" />
              <circle cx="18" cy="20" r="1.5" />
              <path d="M2 3h3l2.4 12.2a1 1 0 0 0 1 .8h9.7a1 1 0 0 0 1-.8L21 7H6" />
            </svg>
            {totalCount > 0 && (
              <span className="absolute -right-1.5 -top-1.5 min-w-5 rounded-full bg-red-600 px-1 text-center text-xs font-bold leading-5 text-white ring-2 ring-white">
                {totalCount > 99 ? "99+" : totalCount}
              </span>
            )}
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl p-4 pb-8">
        {children}
      </main>
    </div>
  );
}
