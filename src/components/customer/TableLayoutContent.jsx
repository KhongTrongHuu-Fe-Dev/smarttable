
import { CartProvider } from "./CartContext";
import CustomerShell from "./CustomerShell";

export default async function TableLayoutContent({ children, params }) {
  const { id } = await params;

  return (
    <CartProvider>
      <CustomerShell tableId={id}>
        {children}
      </CustomerShell>
    </CartProvider>
  );
}
