
import { Suspense } from "react";
import StatusPageContent from "@/components/customer/StatusPageContent";

export default function Page({ params }) {
  return (
    <Suspense
      fallback={
        <div className="rounded-xl bg-white p-6 text-center text-gray-500">
          Đang tải trạng thái đơn hàng...
        </div>
      }
    >
      <StatusPageContent params={params} />
    </Suspense>
  );
}
