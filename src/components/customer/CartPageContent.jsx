
import CartPageClient from "./CartPageClient";

export default async function CartPageContent({ params }) {
  const { id } = await params;

  return <CartPageClient tableId={id} />;
}
