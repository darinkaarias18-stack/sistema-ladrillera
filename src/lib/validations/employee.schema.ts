import { z } from "zod";

export const employeeSchema = z.object({
  fullName: z.string().min(2, "El nombre completo es requerido"),
  documentId: z.string().min(4, "El documento / CI es requerido"),
  position: z.string().min(2, "El cargo u ocupación es requerido"),
  hireDate: z.string().min(1, "La fecha de ingreso es requerida"),
  contractType: z.enum(["fijo", "destajo", "temporal"]),
  payFrequency: z.enum(["semanal", "quincenal", "mensual"]),
  baseSalary: z.number().min(0, "El salario base debe ser >= 0"),
  ratePerThousand: z.number().min(0, "La tarifa por millar debe ser >= 0"),
  antiquityBonusPct: z.number().min(0, "El % bono antigüedad debe ser >= 0"),
  frontierBonus: z.number().min(0, "El bono frontera debe ser >= 0"),
  active: z.boolean(),
});

export type EmployeeInput = z.infer<typeof employeeSchema>;
