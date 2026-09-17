import { z } from "zod";

export const saleItemSchema = z.object({
  brickTypeId: z.string().uuid("Seleccione un ladrillo"),
  quantity: z.number().int().min(1, "La cantidad debe ser mayor a 0"),
  unitPrice: z.number().min(0.01, "El precio unitario debe ser > 0"),
});

export const saleSchema = z.object({
  customerId: z.string().uuid().optional().nullable(),
  orderId: z.string().uuid().optional().nullable(),
  paymentMethod: z.enum(["efectivo", "transferencia", "credito"]),
  items: z.array(saleItemSchema).min(1, "Debe agregar al menos un ítem a la venta"),
});

export type SaleInput = z.infer<typeof saleSchema>;

export const orderSchema = z.object({
  customerId: z.string().uuid("Seleccione un cliente"),
  deliveryDate: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(saleItemSchema).min(1, "Debe agregar al menos un ítem al pedido"),
});

export type OrderInput = z.infer<typeof orderSchema>;
