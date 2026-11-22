"use client";

import { useState } from "react";

export default function MenuImage({ src, alt, className = "h-full w-full object-cover", fallback = "🍽️" }) {
  const [failedSrc, setFailedSrc] = useState(null);

  if (!src || failedSrc === src) {
    return <span role="img" aria-label={`Chưa có ảnh: ${alt}`}>{fallback}</span>;
  }

  // URL công khai từ Storage hoặc URL do quản trị viên nhập.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} className={className} loading="lazy" onError={() => setFailedSrc(src)} />;
}
