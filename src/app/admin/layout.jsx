"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const menuItems = [
  { label: "Tổng quan", href: "/admin", icon: "overview" },
  { label: "Món ăn", href: "/admin/menu", icon: "menu" },
  { label: "Bàn", href: "/admin/tables", icon: "tables" },
  { label: "Đơn hàng", href: "/admin/orders", icon: "orders" },
  { label: "Mã QR", href: "/admin/qr", icon: "qr" },
];

function MenuIcon({ name }) {
  const iconStyle = {
    width: 20,
    height: 20,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round",
    strokeLinejoin: "round",
  };

  if (name === "overview") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" style={iconStyle}>
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
      </svg>
    );
  }

  if (name === "menu") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" style={iconStyle}>
        <path d="M4 3v7a3 3 0 0 0 6 0V3M7 3v18M16 3c-2.2 2.6-3 5.3-3 8h5V3M18 11v10" />
      </svg>
    );
  }

  if (name === "tables") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" style={iconStyle}>
        <rect x="5" y="7" width="14" height="9" rx="1.5" />
        <path d="M8 16v5M16 16v5M8 3v4M16 3v4" />
      </svg>
    );
  }

  if (name === "orders") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" style={iconStyle}>
        <path d="M8 4h-3a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-3" />
        <rect x="8" y="2" width="8" height="5" rx="1" />
        <path d="M8 12h9M8 16h6" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" style={iconStyle}>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <path d="M14 14h3v3h-3zM21 14v3M17 21h4M14 21v-1" />
    </svg>
  );
}

export default function AdminLayout({ children }) {
  const pathname = usePathname();
  const currentPage =
    menuItems.find((item) =>
      item.href === "/admin"
        ? pathname === item.href
        : pathname === item.href || pathname.startsWith(`${item.href}/`)
    ) || menuItems[0];

  return (
    <div className="flex min-h-screen w-full bg-slate-50 text-slate-900">
      {/* Sidebar dành cho desktop */}
      <aside className="sticky top-0 flex h-screen w-64 shrink-0 flex-col bg-slate-950 text-slate-100">
        <div className="flex items-center gap-3 border-b border-slate-800 px-6 py-6">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500 text-xl font-bold text-white">
            S
          </div>
          <div>
            <p className="text-lg font-bold tracking-tight">SmartTable</p>
            <p className="text-xs text-slate-400">Quản trị nhà hàng</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-6" aria-label="Điều hướng Admin">
          <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-widest text-slate-500">
            Quản lý
          </p>
          {menuItems.map((item) => {
            const isActive =
              item.href === "/admin"
                ? pathname === item.href
                : pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400 ${
                  isActive
                    ? "bg-emerald-500 text-white shadow-sm"
                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                }`}
              >
                <MenuIcon name={item.icon} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-slate-800 px-6 py-5">
          <p className="text-xs text-slate-400">SmartTable • Admin</p>
        </div>
      </aside>

      {/* Phần bên phải: header và nội dung của từng trang */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex h-20 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-8 shadow-sm">
          <div>
            <p className="text-xs font-medium text-slate-500">Trang quản trị / {currentPage.label}</p>
            <h1 className="mt-1 text-xl font-bold text-slate-900">{currentPage.label}</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-semibold text-slate-800">Quản trị viên</p>
              <p className="text-xs text-slate-500">Administrator</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-700">
              AD
            </div>
          </div>
        </header>

        <main className="min-w-0 flex-1 p-8">{children}</main>
      </div>
    </div>
  );
}
