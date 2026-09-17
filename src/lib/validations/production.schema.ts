import { z } from "zod";

export const productionBatchSchema = z.object({
  productionDate: z.string().min(1, "La fecha de producción es requerida"),
  brickTypeId: z.string().min(1, "Seleccione un tipo de ladrillo válido"),
  operatorId: z.string().min(1, "Seleccione un operario responsable"),
  shift: z.enum(["mañana", "tarde", "extra"]),
  quantityProduced: z.number().int().min(0, "La cantidad producida debe ser >= 0"),
  status: z.enum(["verde", "secando", "horno", "terminado", "descartado"]),
  folioNumber: z.string().optional(),
  horno: z.string().optional(),
  horaVaciado: z.string().optional(),
  sectorAsignado: z.string().optional(),
  crewIds: z.array(z.string()).optional(),
  notes: z.string().optional(),
});

export type ProductionBatchInput = z.infer<typeof productionBatchSchema>;

export const brickTypeSchema = z.object({
  name: z.string().min(2, "El nombre del tipo de ladrillo es requerido"),
  dimensions: z.string().optional(),
  weightKg: z.number().min(0).optional(),
  salePrice: z.number().min(0.01, "El precio de venta debe ser mayor a 0"),
  estimatedCost: z.number().min(0).optional(),
  active: z.boolean(),
});

export type BrickTypeInput = z.infer<typeof brickTypeSchema>;
