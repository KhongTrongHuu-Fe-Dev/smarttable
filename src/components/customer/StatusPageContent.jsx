
import OrderStatusClient from "./OrderStatusClient";

export default async function StatusPageContent({ params }) {
  const { id } = await params;

  return <OrderStatusClient tableId={id} />;
}
