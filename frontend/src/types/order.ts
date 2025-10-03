export interface OrderItemBrief {
  productId: string | number;
  name: string;
  qty: number;
  unitPrice: number;
  image?: string | null;
}

export interface Order {
  id: string;
  userId: string;
  status: "paid" | "refunded" | "canceled" | string;
  totalOriginal: number;
  totalPaid: number;
  paidAt: string; // ISO
  items: Array<OrderItemBrief>;
  payment: { maskedCard: string; bankRef: string };
}


