import { z } from "zod";

export const payrollPeriodSchema = z.object({
  frequency: z.enum(["semanal", "quincenal", "mensual"]),
  startDate: z.string().min(1, "Fecha de inicio requerida"),
  endDate: z.string().min(1, "Fecha de fin requerida"),
});

export type PayrollPeriodInput = z.infer<typeof payrollPeriodSchema>;

export const advanceSchema = z.object({
  employeeId: z.string().uuid("Seleccione un empleado"),
  periodId: z.string().uuid().optional().nullable(),
  amount: z.number().min(1, "El monto del anticipo debe ser > 0"),
  advanceDate: z.string().min(1, "La fecha es requerida"),
  reason: z.string().optional(),
});

export type AdvanceInput = z.infer<typeof advanceSchema>;

export const cashEntrySchema = z.object({
  movementDate: z.string().min(1, "Fecha de movimiento requerida"),
  description: z.string().min(2, "Descripción requerida"),
  amount: z.number().refine((val) => val !== 0, "El monto no puede ser cero"),
  category: z.enum([
    "planilla",
    "anticipo",
    "compra_insumo",
    "venta",
    "combustible",
    "mantenimiento",
    "otro",
  ]),
});

export type CashEntryInput = z.infer<typeof cashEntrySchema>;
