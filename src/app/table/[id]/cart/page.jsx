
import { Suspense } from "react";
import CartPageContent from "@/components/customer/CartPageContent";

export default function Page({ params }) {
  return (
    <Suspense
      fallback={
        <div className="rounded-xl bg-white p-6 text-center text-gray-500">
          Đang tải giỏ hàng...
        </div>
      }
    >
      <CartPageContent params={params} />
    </Suspense>
  );
}
