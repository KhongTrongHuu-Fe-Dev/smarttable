
import { Suspense } from "react";
import TableLayoutContent from "@/components/customer/TableLayoutContent";

export default function TableLayout({ children, params }) {
  return (
    <Suspense fallback={<div className="p-4">Đang tải bàn...</div>}>
      <TableLayoutContent params={params}>
        {children}
      </TableLayoutContent>
    </Suspense>
  );
}
