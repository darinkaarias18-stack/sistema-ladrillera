import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { saleSchema } from "../src/lib/validations/sale.schema.ts";
import { employeeSchema } from "../src/lib/validations/employee.schema.ts";
import { productionBatchSchema } from "../src/lib/validations/production.schema.ts";
import { advanceSchema, cashEntrySchema } from "../src/lib/validations/payroll.schema.ts";
import { DEFAULT_ROLE_MODULES, getAllModuleHrefs } from "../src/lib/modules-config.ts";
import { AuditLogger } from "../src/lib/audit-logger.ts";

describe("1. Validaciones Zod de Entrada (Server Actions)", () => {
  it("rechaza ventas sin ítems o con cantidades negativas", () => {
    const emptySale = saleSchema.safeParse({
      paymentMethod: "efectivo",
      items: [],
    });
    assert.equal(emptySale.success, false);

    const negativeQty = saleSchema.safeParse({
      paymentMethod: "efectivo",
      items: [{ brickTypeId: "b1", quantity: -5, unitPrice: 1.5 }],
    });
    assert.equal(negativeQty.success, false);
  });

  it("acepta una venta válida con método de pago y detalle", () => {
    const validSale = saleSchema.safeParse({
      paymentMethod: "transferencia",
      items: [{ brickTypeId: "11111111-1111-4111-8111-111111111111", quantity: 1000, unitPrice: 1.2 }],
    });
    assert.equal(validSale.success, true);
  });

  it("rechaza empleados con salario base negativo o documento vacío", () => {
    const invalidEmp = employeeSchema.safeParse({
      fullName: "Juan Pérez",
      documentId: "",
      position: "Moldeador",
      hireDate: "2026-01-10",
      contractType: "fijo",
      payFrequency: "mensual",
      baseSalary: -100,
    });
    assert.equal(invalidEmp.success, false);
  });

  it("rechaza producción con cantidad negativa o turno inválido", () => {
    const invalidProd = productionBatchSchema.safeParse({
      productionDate: "2026-11-23",
      brickTypeId: "b1",
      operatorId: "op1",
      shift: "madrugada",
      quantityProduced: -10,
      status: "verde",
    });
    assert.equal(invalidProd.success, false);
  });

  it("rechaza anticipos con monto <= 0 y acepta movimientos de caja válidos", () => {
    const invalidAdv = advanceSchema.safeParse({
      employeeId: "emp1",
      amount: 0,
      advanceDate: "2026-11-23",
    });
    assert.equal(invalidAdv.success, false);

    const validCash = cashEntrySchema.safeParse({
      movementDate: "2026-11-23",
      description: "Compra de leña",
      amount: -1500,
      category: "compra_insumo",
    });
    assert.equal(validCash.success, true);
  });
});

describe("2. Matriz de Módulos y Segregación de Roles (RBAC)", () => {
  it("asigna todos los módulos únicamente a superadmin y admin", () => {
    const allModules = getAllModuleHrefs();
    assert.deepEqual(DEFAULT_ROLE_MODULES.superadmin, allModules);
    assert.deepEqual(DEFAULT_ROLE_MODULES.admin, allModules);
  });

  it("restringe /planillas, /empleados y /caja para roles operativos de patio y producción", () => {
    assert.equal(DEFAULT_ROLE_MODULES.entrega_recepcion.includes("/planillas"), false);
    assert.equal(DEFAULT_ROLE_MODULES.entrega_recepcion.includes("/caja"), false);
    assert.equal(DEFAULT_ROLE_MODULES.produccion.includes("/planillas"), false);
    assert.equal(DEFAULT_ROLE_MODULES.produccion.includes("/caja"), false);
  });

  it("permite /caja y /ventas/pedidos al rol cajero pero no /produccion/hornos", () => {
    assert.equal(DEFAULT_ROLE_MODULES.cajero.includes("/caja"), true);
    assert.equal(DEFAULT_ROLE_MODULES.cajero.includes("/ventas/pedidos"), true);
    assert.equal(DEFAULT_ROLE_MODULES.cajero.includes("/produccion/hornos"), false);
  });
});

describe("3. Inmutabilidad e Integridad de Auditoría (AuditLogger)", () => {
  it("no expone ningún método para limpiar o borrar logs (inmutabilidad)", () => {
    assert.equal("clearLogs" in AuditLogger, false);
  });

  it("nunca atribuye eventos sin usuario a superadmin (darinka.arias18@gmail.com)", () => {
    const entry = AuditLogger.log({
      action: "SECURITY_ALERT",
      severity: "high",
      module: "seguridad",
      description: "Prueba de evento sin contexto de usuario",
    });

    assert.notEqual(entry.user_role, "superadmin");
    assert.notEqual(entry.user_email, "darinka.arias18@gmail.com");
    assert.equal(entry.user_id, "system");
  });
});
