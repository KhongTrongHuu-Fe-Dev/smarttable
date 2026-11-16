"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { signIn } from "@/lib/supabase/auth";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  function validate() {
    const next = {};
    if (!email.trim()) next.email = "Vui lòng nhập email.";
    else if (!/^\S+@\S+\.\S+$/.test(email.trim())) next.email = "Email không hợp lệ.";
    if (!password) next.password = "Vui lòng nhập mật khẩu.";
    return next;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("");
    const next = validate();
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setLoading(true);
    const result = await signIn(email.trim(), password);
    if (result.error) {
      setMessage(result.error);
      setLoading(false);
      return;
    }
    // admin -> /admin, bếp -> /kitchen
    router.replace(result.home);
    router.refresh();
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
          disabled={loading}
          className="mt-6 w-full rounded-xl bg-orange-500 px-4 py-3 font-semibold text-white hover:bg-orange-600 disabled:opacity-50"
        >
          {loading ? "Đang đăng nhập..." : "Đăng nhập"}
        </button>

        {message && (
          <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">
            {message}
          </p>
        )}
      </form>
    </main>
  );
}
