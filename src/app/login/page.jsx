"use client";

import { useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState("");

  function validate() {
    const next = {};
    if (!email.trim()) next.email = "Vui lòng nhập email.";
    else if (!/^\S+@\S+\.\S+$/.test(email.trim())) next.email = "Email không hợp lệ.";
    if (!password) next.password = "Vui lòng nhập mật khẩu.";
    return next;
  }

  function handleSubmit(event) {
    event.preventDefault();
    setMessage("");
    const next = validate();
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    // TODO (sau SCRUM-19): gọi Supabase Auth, rồi chuyển trang:
    // admin -> /admin, bếp -> /kitchen
    setMessage("Giao diện sẵn sàng. Chức năng đăng nhập sẽ nối Supabase Auth sau.");
  }

  const inputClass = (hasError) =>
    `w-full rounded-xl border px-4 py-3 text-gray-900 outline-none focus:ring-2 focus:ring-orange-500 ${
      hasError ? "border-red-500" : "border-gray-300"
    }`;

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-100 p-4">
      <form
        onSubmit={handleSubmit}
        noValidate
        className="w-full max-w-sm rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200"
      >
        <h1 className="text-2xl font-bold text-gray-900">SmartTable</h1>
        <p className="mt-1 mb-6 text-sm text-gray-500">
          Đăng nhập dành cho nhân viên bếp và quản trị viên
        </p>

        <label htmlFor="email" className="mb-1 block text-sm font-medium text-gray-900">
          Email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={Boolean(errors.email)}
          className={inputClass(errors.email)}
          placeholder="ten@smarttable.test"
        />
        {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}

        <label htmlFor="password" className="mt-4 mb-1 block text-sm font-medium text-gray-900">
          Mật khẩu
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          aria-invalid={Boolean(errors.password)}
          className={inputClass(errors.password)}
          placeholder="••••••••"
        />
        {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password}</p>}

        <button
          type="submit"
          className="mt-6 w-full rounded-xl bg-orange-500 px-4 py-3 font-semibold text-white hover:bg-orange-600"
        >
          Đăng nhập
        </button>

        {message && (
          <p className="mt-4 rounded-xl bg-orange-50 p-3 text-sm text-orange-700">{message}</p>
        )}
      </form>
    </main>
  );
}
