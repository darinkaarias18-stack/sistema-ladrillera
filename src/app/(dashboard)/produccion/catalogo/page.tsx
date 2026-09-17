"use client";

import { Header } from "@/components/layout/header";
import { store } from "@/lib/store";
import { BrickType } from "@/types/database.types";
import { useEffect, useState } from "react";
import { Layers, Plus, Search, Tag, DollarSign, Package, CheckCircle, X, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { brickTypeSchema, BrickTypeInput } from "@/lib/validations/production.schema";

export default function CatalogoProductosPage() {
  const [brickTypes, setBrickTypes] = useState<BrickType[]>([]);
  const [search, setSearch] = useState("");
  const [isTypeModalOpen, setIsTypeModalOpen] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<BrickTypeInput>({
    resolver: zodResolver(brickTypeSchema),
    defaultValues: {
      name: "",
      dimensions: "24x12x10 cm",
      weightKg: 2.6,
      salePrice: 1.80,
      estimatedCost: 1.10,
      active: true,
    },
  });

  const loadData = () => {
    setBrickTypes(store.getBrickTypes());
  };

  useEffect(() => {
    loadData();
  }, []);

  const onSubmitType = (data: BrickTypeInput) => {
    store.addBrickType({
      name: data.name,
      dimensions: data.dimensions,
      weight_kg: data.weightKg,
      sale_price: data.salePrice,
      estimated_cost: data.estimatedCost,
      active: data.active,
    });
    setIsTypeModalOpen(false);
    reset();
    loadData();
  };

  const filteredTypes = brickTypes.filter(
    (bt) =>
      bt.name.toLowerCase().includes(search.toLowerCase()) ||
      (bt.dimensions && bt.dimensions.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <>
      <Header title="Catálogo de Productos & Precios de Cerámica" />

      <div className="p-6 space-y-6">
        {/* Banner de Cabecera */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-700 flex items-center justify-center font-bold">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-base">Catálogo Oficial de Productos</h3>
              <p className="text-xs text-slate-500">
                Lista oficial de los 17 tipos de ladrillos producidos en fábrica con especificaciones y precios de venta.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <Link
              href="/produccion"
              className="flex items-center space-x-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3.5 py-2 rounded-lg font-semibold text-xs border border-slate-300 transition"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Volver a Vaciados</span>
            </Link>

            <button
              onClick={() => setIsTypeModalOpen(true)}
              className="flex items-center space-x-2 bg-orange-600 hover:bg-orange-500 text-white px-4 py-2 rounded-lg font-semibold text-xs shadow-sm transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Nuevo Tipo de Ladrillo</span>
            </button>
          </div>
        </div>

        {/* Barra de Búsqueda */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre de ladrillo o dimensiones..."
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-orange-500 focus:outline-none"
            />
          </div>
          <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
            Total Registrados: <strong>{filteredTypes.length}</strong>
          </span>
        </div>

        {/* Tarjetas del Catálogo */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredTypes.map((bt) => {
            const margin = bt.estimated_cost ? bt.sale_price - bt.estimated_cost : 0;
            const marginPct = bt.estimated_cost ? (margin / bt.sale_price) * 100 : 0;

            return (
              <div
                key={bt.id}
                className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs hover:border-orange-400 hover:shadow-md transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h4 className="font-bold text-slate-900 text-sm leading-snug">{bt.name}</h4>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800 shrink-0">
                      Activo
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-600 my-3 bg-slate-50 p-2.5 rounded-lg border border-slate-150">
                    <p className="flex justify-between">
                      <span className="text-slate-500">Dimensiones:</span>
                      <strong className="text-slate-800 font-mono">{bt.dimensions || "Estándar"}</strong>
                    </p>
                    <p className="flex justify-between">
                      <span className="text-slate-500">Peso estimado:</span>
                      <strong className="text-slate-800">{bt.weight_kg ? `${bt.weight_kg} kg` : "N/A"}</strong>
                    </p>
                    <p className="flex justify-between">
                      <span className="text-slate-500">Costo estimado:</span>
                      <strong className="text-slate-700 font-mono">Bs. {bt.estimated_cost?.toFixed(2) || "0.00"}</strong>
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-bold block">Precio de Venta</span>
                    <span className="font-mono font-extrabold text-base text-orange-600">Bs. {bt.sale_price.toFixed(2)}</span>
                  </div>
                  {bt.estimated_cost && (
                    <div className="text-right">
                      <span className="text-[10px] text-slate-500 uppercase font-bold block">Margen Est.</span>
                      <span className="font-mono font-bold text-emerald-700 text-xs">
                        +{marginPct.toFixed(0)}% (Bs.{margin.toFixed(2)})
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal Nuevo Tipo de Ladrillo */}
      {isTypeModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-start justify-center p-4 md:p-6 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md my-auto overflow-hidden animate-in fade-in zoom-in duration-150 flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-900 text-white shrink-0">
              <h3 className="font-bold text-sm">Registrar Nuevo Tipo de Ladrillo</h3>
              <button onClick={() => setIsTypeModalOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmitType)} className="p-6 space-y-4 text-xs overflow-y-auto flex-1">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nombre del Ladrillo *</label>
                <input
                  {...register("name")}
                  type="text"
                  placeholder="Ej. Ladrillo 6H Especial"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500"
                />
                {errors.name && <p className="text-red-500 mt-1">{errors.name.message}</p>}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Dimensiones</label>
                  <input
                    {...register("dimensions")}
                    type="text"
                    placeholder="24x12x10 cm"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Peso (kg)</label>
                  <input
                    {...register("weightKg", { valueAsNumber: true })}
                    type="number"
                    step="0.1"
                    placeholder="2.6"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Precio de Venta (Bs.) *</label>
                  <input
                    {...register("salePrice", { valueAsNumber: true })}
                    type="number"
                    step="0.01"
                    placeholder="1.80"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-bold text-orange-600 focus:ring-2 focus:ring-orange-500"
                  />
                  {errors.salePrice && <p className="text-red-500 mt-1">{errors.salePrice.message}</p>}
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Costo Estimado (Bs.)</label>
                  <input
                    {...register("estimatedCost", { valueAsNumber: true })}
                    type="number"
                    step="0.01"
                    placeholder="1.10"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsTypeModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:text-slate-800 font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-lg shadow-sm text-xs cursor-pointer"
                >
                  Guardar en Catálogo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
