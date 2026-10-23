"use client";

import { Header } from "@/components/layout/header";
import { store } from "@/lib/store";
import { BrickType } from "@/types/database.types";
import { useEffect, useState } from "react";
import { Layers, Plus, Search, Tag, DollarSign, Package, CheckCircle, X, ArrowLeft, Pencil, Check } from "lucide-react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { brickTypeSchema, BrickTypeInput } from "@/lib/validations/production.schema";
import { getBrickImageUrl } from "@/lib/brick-images";

export default function CatalogoProductosPage() {
  const [brickTypes, setBrickTypes] = useState<BrickType[]>([]);
  const [search, setSearch] = useState("");
  const [isTypeModalOpen, setIsTypeModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<{ url: string; title: string } | null>(null);
  const [editingBrick, setEditingBrick] = useState<BrickType | null>(null);
  const [editSuccessMsg, setEditSuccessMsg] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    dimensions: "",
    weight_kg: 2.5,
    sale_price: 1.5,
    estimated_cost: 0.9,
    active: true,
    image_url: "",
  });

  const handleOpenEdit = (brick: BrickType) => {
    setEditingBrick(brick);
    setEditForm({
      name: brick.name || "",
      dimensions: brick.dimensions || "",
      weight_kg: brick.weight_kg ?? 2.5,
      sale_price: brick.sale_price ?? 1.5,
      estimated_cost: brick.estimated_cost ?? 0.9,
      active: brick.active ?? true,
      image_url: brick.image_url || getBrickImageUrl(brick) || "",
    });
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBrick) return;

    store.updateBrickType(editingBrick.id, {
      name: editForm.name,
      dimensions: editForm.dimensions,
      weight_kg: Number(editForm.weight_kg),
      sale_price: Number(editForm.sale_price),
      estimated_cost: Number(editForm.estimated_cost),
      active: Boolean(editForm.active),
      image_url: editForm.image_url || undefined,
    });

    setEditingBrick(null);
    loadData();
    setEditSuccessMsg(`✓ Información de "${editForm.name}" actualizada con éxito.`);
    setTimeout(() => setEditSuccessMsg(null), 4500);
  };

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
    const handleUpdate = () => loadData();
    window.addEventListener("erp_brick_types_updated", handleUpdate);
    return () => {
      window.removeEventListener("erp_brick_types_updated", handleUpdate);
    };
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

        {/* Mensaje de Éxito al Editar */}
        {editSuccessMsg && (
          <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 px-4 py-2.5 rounded-xl text-xs font-bold flex items-center justify-between shadow-xs animate-in fade-in slide-in-from-top-1">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{editSuccessMsg}</span>
            </div>
            <button
              onClick={() => setEditSuccessMsg(null)}
              className="text-emerald-600 hover:text-emerald-900 p-1 rounded cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

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
            const imageUrl = getBrickImageUrl(bt) || bt.image_url;

            return (
              <div
                key={bt.id}
                className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs hover:border-orange-400 hover:shadow-md transition flex flex-col justify-between group"
              >
                <div>
                  {/* Imagen de Catálogo */}
                  <div
                    onClick={() => imageUrl && setSelectedImage({ url: imageUrl, title: bt.name })}
                    className={`relative w-full h-52 mb-3 rounded-xl overflow-hidden bg-slate-50 flex items-center justify-center border border-slate-200/80 p-2.5 transition-colors ${
                      imageUrl ? "cursor-pointer hover:bg-slate-100/80 hover:border-orange-300" : ""
                    }`}
                    title={imageUrl ? "Clic para ver en tamaño completo" : undefined}
                  >
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={bt.name}
                        className="max-h-full max-w-full object-contain transition-transform duration-300 group-hover:scale-105 drop-shadow-xs"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-slate-400 p-4 text-center">
                        <Package className="w-9 h-9 mb-1.5 text-slate-300" />
                        <span className="text-[11px] font-medium text-slate-400">Sin imagen registrada</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h4 className="font-bold text-slate-900 text-sm leading-snug">{bt.name}</h4>
                    <div className="flex items-center space-x-1.5 shrink-0">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${bt.active ? "bg-emerald-100 text-emerald-800 border border-emerald-200/60" : "bg-slate-100 text-slate-600 border border-slate-200"}`}>
                        {bt.active ? "Activo" : "Inactivo"}
                      </span>
                      <button
                        onClick={() => handleOpenEdit(bt)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-orange-600 bg-slate-50 hover:bg-orange-50 border border-slate-200 hover:border-orange-300 transition shadow-2xs cursor-pointer"
                        title="Editar información de este producto"
                        aria-label={`Editar ${bt.name}`}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    </div>
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

      {/* Modal de Edición de Producto */}
      {editingBrick && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 md:p-6 overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg my-auto overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col max-h-[92vh]">
            {/* Cabecera del Modal */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-900 text-white shrink-0">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-orange-600 flex items-center justify-center text-white">
                  <Pencil className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">Editar Producto del Catálogo</h3>
                  <p className="text-[11px] text-slate-400">ID: {editingBrick.id}</p>
                </div>
              </div>
              <button
                onClick={() => setEditingBrick(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Formulario de Edición */}
            <form onSubmit={handleSaveEdit} className="p-6 space-y-4 text-xs overflow-y-auto flex-1">
              {/* Vista previa miniatura de la imagen */}
              <div className="flex items-center space-x-4 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div className="w-16 h-16 rounded-lg bg-white border border-slate-200 overflow-hidden flex items-center justify-center p-1 shrink-0">
                  {editForm.image_url ? (
                    <img
                      src={editForm.image_url}
                      alt="Vista previa"
                      className="max-h-full max-w-full object-contain"
                    />
                  ) : (
                    <Package className="w-6 h-6 text-slate-300" />
                  )}
                </div>
                <div className="flex-1">
                  <label className="block font-bold text-slate-700 mb-1">Ruta de Imagen del Producto</label>
                  <input
                    type="text"
                    value={editForm.image_url}
                    onChange={(e) => setEditForm({ ...editForm, image_url: e.target.value })}
                    placeholder="/images/catalog/brick-1.jpg"
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Ubicada en <code>public/images/catalog/</code></p>
                </div>
              </div>

              {/* Nombre */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nombre Oficial del Ladrillo *</label>
                <input
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>

              {/* Precios y Costos */}
              <div className="grid grid-cols-2 gap-3 bg-orange-50/40 p-3.5 rounded-xl border border-orange-200/60">
                <div>
                  <label className="block font-bold text-orange-950 mb-1 flex items-center space-x-1">
                    <DollarSign className="w-3.5 h-3.5 text-orange-600" />
                    <span>Precio de Venta (Bs.) *</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={editForm.sale_price}
                    onChange={(e) => setEditForm({ ...editForm, sale_price: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border-2 border-orange-300 bg-white rounded-lg text-base font-extrabold text-orange-700 font-mono focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  />
                  <p className="text-[10px] text-orange-600 mt-0.5">Precio oficial al público</p>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Costo Estimado (Bs.)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editForm.estimated_cost}
                    onChange={(e) => setEditForm({ ...editForm, estimated_cost: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-slate-300 bg-white rounded-lg text-base font-bold text-slate-700 font-mono focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  />
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Margen: <strong className="text-emerald-700">Bs. {Math.max(0, editForm.sale_price - editForm.estimated_cost).toFixed(2)}</strong> ({editForm.sale_price > 0 ? (((editForm.sale_price - editForm.estimated_cost) / editForm.sale_price) * 100).toFixed(0) : 0}%)
                  </p>
                </div>
              </div>

              {/* Dimensiones y Peso */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Dimensiones</label>
                  <input
                    type="text"
                    value={editForm.dimensions}
                    onChange={(e) => setEditForm({ ...editForm, dimensions: e.target.value })}
                    placeholder="Ej. 24x12x10 cm"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Peso Unitario (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={editForm.weight_kg}
                    onChange={(e) => setEditForm({ ...editForm, weight_kg: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Estado Activo */}
              <div className="flex items-center space-x-2.5 pt-2 border-t border-slate-150">
                <input
                  type="checkbox"
                  id="activeCheck"
                  checked={editForm.active}
                  onChange={(e) => setEditForm({ ...editForm, active: e.target.checked })}
                  className="w-4 h-4 text-orange-600 rounded-sm border-slate-300 focus:ring-orange-500 cursor-pointer"
                />
                <label htmlFor="activeCheck" className="text-xs font-semibold text-slate-700 cursor-pointer">
                  Producto Activo (visible para ventas, pedidos e inventario)
                </label>
              </div>

              {/* Botones de Acción */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setEditingBrick(null)}
                  className="px-4 py-2 text-slate-600 hover:text-slate-800 font-semibold text-xs transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl shadow-md shadow-orange-950/20 text-xs transition flex items-center space-x-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Guardar Cambios</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal / Lightbox de Imagen en Tamaño Completo */}
      {selectedImage && (
        <div
          onClick={() => setSelectedImage(null)}
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative bg-white rounded-2xl shadow-2xl overflow-hidden max-w-lg w-full p-4 border border-slate-200 flex flex-col items-center animate-in zoom-in-95 duration-150"
          >
            <div className="w-full flex items-center justify-between pb-3 mb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm">{selectedImage.title}</h3>
              <button
                onClick={() => setSelectedImage(null)}
                className="text-slate-400 hover:text-slate-800 p-1.5 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                title="Cerrar vista previa"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="w-full aspect-square bg-slate-50 rounded-xl overflow-hidden flex items-center justify-center p-4 border border-slate-100">
              <img
                src={selectedImage.url}
                alt={selectedImage.title}
                className="max-h-full max-w-full object-contain drop-shadow-md"
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-2 text-center">
              Haz clic fuera o presiona la cruz para cerrar
            </p>
          </div>
        </div>
      )}
    </>
  );
}
