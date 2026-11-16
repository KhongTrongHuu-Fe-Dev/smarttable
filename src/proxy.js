import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import { ROLES, homeForRole } from "@/lib/supabase/roles";

// Chặn trang theo vai trò (Next 16: "proxy" thay cho "middleware").
//   /admin/*   -> chỉ admin
//   /kitchen/* -> admin hoặc bếp
//   /login     -> đã đăng nhập thì chuyển về trang của vai trò
// Đây là lớp chặn trang. Lớp bảo vệ dữ liệu thật là RLS + requireRole trong API.
export async function proxy(request) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(list) {
          list.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    }
  );

  const { data } = await supabase.auth.getUser();
  const role = data?.user?.app_metadata?.role;
  const { pathname } = request.nextUrl;

  // Chuyển trang nhưng giữ cookie phiên vừa được làm mới.
  const redirectTo = (path) => {
    const res = NextResponse.redirect(new URL(path, request.url));
    response.cookies.getAll().forEach((c) => res.cookies.set(c));
    return res;
  };

  if (pathname.startsWith("/login")) {
    const home = homeForRole(role);
    return home ? redirectTo(home) : response;
  }

  if (pathname.startsWith("/admin")) {
    if (role === ROLES.ADMIN) return response;
    // Bếp vào /admin thì đẩy về /kitchen, chưa đăng nhập thì về /login.
    return redirectTo(role === ROLES.KITCHEN ? "/kitchen" : "/login");
  }

  if (pathname.startsWith("/kitchen")) {
    if (role === ROLES.ADMIN || role === ROLES.KITCHEN) return response;
    return redirectTo("/login");
  }

  return response;
}

export const config = {
  matcher: ["/admin/:path*", "/kitchen/:path*", "/login"],
};
