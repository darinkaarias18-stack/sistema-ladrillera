"use client";

import { Header } from "@/components/layout/header";
import { store } from "@/lib/store";
import { BrickType } from "@/types/database.types";
import { useEffect, useState } from "react";
import { Layers, Plus, Search, Tag, DollarSign, Package, CheckCircle, X, ArrowLeft, Pencil, Check, Upload, Trash2, Image as ImageIcon } from "lucide-react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { brickTypeSchema, BrickTypeInput } from "@/lib/validations/production.schema";
import { getBrickImageUrl } from "@/lib/brick-images";

const MAX_IMAGE_BYTES = 256000; // 250 KB estrictos

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getDataUrlByteSize(dataUrl: string): number {
  if (!dataUrl.startsWith("data:")) return 0;
  const base64 = dataUrl.split(",")[1] || "";
  return Math.ceil((base64.length * 3) / 4);
}

async function compressImageToMaxSize(
  file: File,
  maxBytes = MAX_IMAGE_BYTES,
  maxDim = 1000
): Promise<{ dataUrl: string; originalBytes: number; compressedBytes: number }> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new window.Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("No se pudo leer la imagen."));
      el.src = objectUrl;
    });

    let width = img.naturalWidth || img.width;
    let height = img.naturalHeight || img.height;

    if (width > maxDim || height > maxDim) {
      const ratio = Math.min(maxDim / width, maxDim / height);
      width = Math.max(1, Math.round(width * ratio));
      height = Math.max(1, Math.round(height * ratio));
    }

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas no disponible en el navegador.");

    const qualities = [0.85, 0.7, 0.55, 0.4, 0.25];
    let bestDataUrl = "";
    let bestBytes = Infinity;

    for (let scaleAttempt = 0; scaleAttempt < 3; scaleAttempt++) {
      canvas.width = width;
      canvas.height = height;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);

      for (const quality of qualities) {
        let candidate = canvas.toDataURL("image/webp", quality);
        if (!candidate.startsWith("data:image/webp")) {
          candidate = canvas.toDataURL("image/jpeg", quality);
        }
        const bytes = getDataUrlByteSize(candidate);
        if (bytes < bestBytes) {
          bestBytes = bytes;
          bestDataUrl = candidate;
        }
        if (bytes <= maxBytes) {
          return {
            dataUrl: candidate,
            originalBytes: file.size,
            compressedBytes: bytes,
          };
        }
      }

      width = Math.max(1, Math.round(width * 0.75));
      height = Math.max(1, Math.round(height * 0.75));
    }

    return {
      dataUrl: bestDataUrl,
      originalBytes: file.size,
      compressedBytes: bestBytes,
    };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export default function CatalogoProductosPage() {
  const [brickTypes, setBrickTypes] = useState<BrickType[]>([]);
  const [search, setSearch] = useState("");
  const [isTypeModalOpen, setIsTypeModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<{ url: string; title: string } | null>(null);
  const [editingBrick, setEditingBrick] = useState<BrickType | null>(null);
  const [editSuccessMsg, setEditSuccessMsg] = useState<string | null>(null);
  const [imageUploadError, setImageUploadError] = useState<string | null>(null);
  const [editCompressionInfo, setEditCompressionInfo] = useState<{ original: number; compressed: number } | null>(null);
  const [isDraggingImage, setIsDraggingImage] = useState(false);

  const [newImageUrl, setNewImageUrl] = useState("");
  const [newImageError, setNewImageError] = useState<string | null>(null);
  const [newCompressionInfo, setNewCompressionInfo] = useState<{ original: number; compressed: number } | null>(null);

  const handleImageFileSelect = async (file: File | null | undefined, target: "edit" | "new") => {
    if (target === "edit") {
      setImageUploadError(null);
      setEditCompressionInfo(null);
    } else {
      setNewImageError(null);
      setNewCompressionInfo(null);
    }
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      const msg = "Por favor selecciona un archivo de imagen válido (JPG, PNG, WEBP).";
      if (target === "edit") setImageUploadError(msg);
      else setNewImageError(msg);
      return;
    }

    try {
      const { dataUrl, originalBytes, compressedBytes } = await compressImageToMaxSize(file);
      if (compressedBytes > MAX_IMAGE_BYTES) {
        const msg = `La imagen comprimida (${formatBytes(compressedBytes)}) aún supera el límite de 250 KB.`;
        if (target === "edit") setImageUploadError(msg);
        else setNewImageError(msg);
        return;
      }
      if (target === "edit") {
        setEditForm((prev) => ({ ...prev, image_url: dataUrl }));
        setEditCompressionInfo({ original: originalBytes, compressed: compressedBytes });
      } else {
        setNewImageUrl(dataUrl);
        setNewCompressionInfo({ original: originalBytes, compressed: compressedBytes });
      }
    } catch {
      const msg = "Error al procesar o comprimir la imagen.";
      if (target === "edit") setImageUploadError(msg);
      else setNewImageError(msg);
    }
  };
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
    setImageUploadError(null);
    setEditCompressionInfo(null);
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

    if (editForm.image_url.startsWith("data:") && getDataUrlByteSize(editForm.image_url) > MAX_IMAGE_BYTES) {
      setImageUploadError("La imagen supera el límite máximo permitido de 250 KB (256.000 bytes).");
      return;
    }

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
    if (newImageUrl.startsWith("data:") && getDataUrlByteSize(newImageUrl) > MAX_IMAGE_BYTES) {
      setNewImageError("La imagen supera el límite máximo permitido de 250 KB (256.000 bytes).");
      return;
    }

    store.addBrickType({
      name: data.name,
      dimensions: data.dimensions,
      weight_kg: data.weightKg,
      sale_price: data.salePrice,
      estimated_cost: data.estimatedCost,
      active: data.active,
      image_url: newImageUrl || undefined,
    });
    setIsTypeModalOpen(false);
    setNewImageUrl("");
    setNewImageError(null);
    setNewCompressionInfo(null);
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

      <div className={editingBrick || isTypeModalOpen ? "hidden" : "p-6 space-y-6"}>
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
              onClick={() => {
                setNewImageUrl("");
                setNewImageError(null);
                setNewCompressionInfo(null);
                setIsTypeModalOpen(true);
              }}
              className="flex items-center space-x-2 bg-orange-600 hover:bg-orange-500 text-white px-4 py-2 rounded-lg font-semibold text-xs shadow-sm transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Nuevo Tipo de Ladrillo</span>
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
            const imageUrl = bt.image_url || getBrickImageUrl(bt);

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

      {/* Vista Nuevo Tipo de Ladrillo en Pantalla Completa respetando el menú izquierdo */}
      {isTypeModalOpen && (
        <div className="w-full flex-1 bg-white flex flex-col animate-in fade-in duration-150">
          <div className="sticky top-16 z-10 px-6 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-900 text-white shrink-0">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-orange-600 flex items-center justify-center text-white">
                <Plus className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-sm">Registrar Nuevo Tipo de Ladrillo</h3>
                <p className="text-[11px] text-slate-400">Nuevo producto oficial del catálogo</p>
              </div>
            </div>
            <button
              onClick={() => setIsTypeModalOpen(false)}
              className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition cursor-pointer"
              title="Cerrar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit(onSubmitType)} className="p-4 md:p-5 max-w-6xl w-full mx-auto flex-1 flex flex-col gap-4 text-xs">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              {/* Columna Izquierda: Carga y Vista Previa de Imagen */}
              <div className="lg:col-span-5 bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4 text-orange-600" />
                    <span>Imagen del Producto</span>
                  </label>
                  {newImageUrl && (
                    <button
                      type="button"
                      onClick={() => {
                        setNewImageUrl("");
                        setNewCompressionInfo(null);
                        setNewImageError(null);
                      }}
                      className="text-[11px] font-semibold text-rose-600 hover:text-rose-700 inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Quitar</span>
                    </button>
                  )}
                </div>

                <label
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDraggingImage(true);
                  }}
                  onDragLeave={() => setIsDraggingImage(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDraggingImage(false);
                    handleImageFileSelect(e.dataTransfer.files?.[0], "new");
                  }}
                  className={`block rounded-2xl border-2 border-dashed transition-all cursor-pointer overflow-hidden bg-white ${
                    isDraggingImage
                      ? "border-orange-500 bg-orange-50/40 ring-4 ring-orange-500/10"
                      : "border-slate-300 hover:border-orange-400"
                  }`}
                >
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleImageFileSelect(e.target.files?.[0], "new")}
                  />
                  <div className="h-44 flex flex-col items-center justify-center p-3">
                    {newImageUrl ? (
                      <img src={newImageUrl} alt="Vista previa" className="max-h-full max-w-full object-contain rounded-lg" />
                    ) : (
                      <div className="text-center space-y-2">
                        <div className="w-12 h-12 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center mx-auto">
                          <Upload className="w-6 h-6" />
                        </div>
                        <p className="text-xs font-semibold text-slate-700">
                          Haz clic para subir o arrastra una imagen aquí
                        </p>
                        <p className="text-[11px] text-slate-400">PNG, JPG o WEBP (compresión automática ≤ 250 KB)</p>
                      </div>
                    )}
                  </div>
                  <div className="px-4 py-2.5 bg-slate-100/80 border-t border-slate-200 flex items-center justify-center gap-2 text-xs font-semibold text-orange-700">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{newImageUrl ? "Cambiar imagen desde tu equipo" : "Seleccionar archivo de imagen"}</span>
                  </div>
                </label>

                {newCompressionInfo && (
                  <p className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-lg">
                    Comprimida: {formatBytes(newCompressionInfo.original)} → {formatBytes(newCompressionInfo.compressed)} ✓
                  </p>
                )}

                {newImageError && (
                  <p className="text-[11px] font-semibold text-rose-600 bg-rose-50 border border-rose-200 px-3 py-2 rounded-lg">
                    {newImageError}
                  </p>
                )}

                <div className="bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-[11px] text-slate-600 space-y-1">
                  <p className="font-semibold text-slate-700">Formatos aceptados:</p>
                  <p className="text-slate-500">
                    JPG, JPEG, PNG y WEBP • Compresión automática a ≤ 250 KB (máx. 1000 px).
                  </p>
                </div>
              </div>

              {/* Columna Derecha: Datos del Producto */}
              <div className="lg:col-span-7 bg-white p-4 rounded-2xl border border-slate-200 space-y-3.5 shadow-2xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">Nombre del Ladrillo *</label>
                  <input
                    {...register("name")}
                    type="text"
                    placeholder="Ej. Ladrillo 6H Especial"
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  />
                  {errors.name && <p className="text-red-500 mt-1">{errors.name.message}</p>}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-orange-50/40 p-4 rounded-xl border border-orange-200/60">
                  <div>
                    <label className="block font-bold text-orange-950 mb-1.5 flex items-center space-x-1">
                      <DollarSign className="w-3.5 h-3.5 text-orange-600" />
                      <span>Precio de Venta (Bs.) *</span>
                    </label>
                    <input
                      {...register("salePrice", { valueAsNumber: true })}
                      type="number"
                      step="0.01"
                      placeholder="1.80"
                      className="w-full px-3.5 py-2.5 border-2 border-orange-300 bg-white rounded-xl text-base font-bold text-orange-700 font-mono focus:ring-2 focus:ring-orange-500 focus:outline-none"
                    />
                    {errors.salePrice && <p className="text-red-500 mt-1">{errors.salePrice.message}</p>}
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1.5">Costo Estimado (Bs.)</label>
                    <input
                      {...register("estimatedCost", { valueAsNumber: true })}
                      type="number"
                      step="0.01"
                      placeholder="1.10"
                      className="w-full px-3.5 py-2.5 border border-slate-300 bg-white rounded-xl text-base font-semibold text-slate-700 font-mono focus:ring-2 focus:ring-orange-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1.5">Dimensiones</label>
                    <input
                      {...register("dimensions")}
                      type="text"
                      placeholder="24x12x10 cm"
                      className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-orange-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1.5">Peso (kg)</label>
                    <input
                      {...register("weightKg", { valueAsNumber: true })}
                      type="number"
                      step="0.1"
                      placeholder="2.6"
                      className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-orange-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-200 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setIsTypeModalOpen(false)}
                    className="px-4 py-2 text-slate-600 hover:text-slate-800 font-semibold text-xs cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl shadow-md shadow-orange-950/20 text-xs transition flex items-center space-x-1.5 cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    <span>Guardar en Catálogo</span>
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Vista de Edición de Producto en Pantalla Completa respetando el menú izquierdo */}
      {editingBrick && (
        <div className="w-full flex-1 bg-white flex flex-col animate-in fade-in duration-150">
          {/* Cabecera fija */}
          <div className="sticky top-16 z-10 px-6 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-900 text-white shrink-0">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-orange-600 flex items-center justify-center text-white">
                <Pencil className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-sm">Editar Producto del Catálogo</h3>
                <p className="text-[11px] text-slate-400">
                  {editingBrick.name} • ID: {editingBrick.id}
                </p>
              </div>
            </div>
            <button
              onClick={() => setEditingBrick(null)}
              className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition cursor-pointer"
              title="Cerrar editor"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Formulario de Edición en 2 columnas */}
          <form onSubmit={handleSaveEdit} className="p-4 md:p-5 max-w-6xl w-full mx-auto flex-1 flex flex-col gap-4 text-xs">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              {/* Columna Izquierda: Carga y Vista Previa de Imagen */}
              <div className="lg:col-span-5 bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4 text-orange-600" />
                    <span>Imagen del Producto</span>
                  </label>
                  {editForm.image_url && (
                    <button
                      type="button"
                      onClick={() => setEditForm({ ...editForm, image_url: "" })}
                      className="text-[11px] font-semibold text-rose-600 hover:text-rose-700 inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Quitar</span>
                    </button>
                  )}
                </div>

                {/* Zona de Drag & Drop + Vista Previa */}
                <label
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDraggingImage(true);
                  }}
                  onDragLeave={() => setIsDraggingImage(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDraggingImage(false);
                    handleImageFileSelect(e.dataTransfer.files?.[0], "edit");
                  }}
                  className={`block rounded-2xl border-2 border-dashed transition-all cursor-pointer overflow-hidden bg-white ${
                    isDraggingImage
                      ? "border-orange-500 bg-orange-50/40 ring-4 ring-orange-500/10"
                      : "border-slate-300 hover:border-orange-400"
                  }`}
                >
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleImageFileSelect(e.target.files?.[0], "edit")}
                  />
                  <div className="h-44 flex flex-col items-center justify-center p-3">
                    {editForm.image_url ? (
                      <img
                        src={editForm.image_url}
                        alt="Vista previa"
                        className="max-h-full max-w-full object-contain rounded-lg"
                      />
                    ) : (
                      <div className="text-center space-y-2">
                        <div className="w-12 h-12 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center mx-auto">
                          <Upload className="w-6 h-6" />
                        </div>
                        <p className="text-xs font-semibold text-slate-700">
                          Haz clic para subir o arrastra una imagen aquí
                        </p>
                        <p className="text-[11px] text-slate-400">PNG, JPG o WEBP (compresión automática ≤ 250 KB)</p>
                      </div>
                    )}
                  </div>
                  <div className="px-4 py-2.5 bg-slate-100/80 border-t border-slate-200 flex items-center justify-center gap-2 text-xs font-semibold text-orange-700">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{editForm.image_url ? "Cambiar imagen desde tu equipo" : "Seleccionar archivo de imagen"}</span>
                  </div>
                </label>

                {editCompressionInfo && (
                  <p className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-lg">
                    Comprimida: {formatBytes(editCompressionInfo.original)} → {formatBytes(editCompressionInfo.compressed)} ✓
                  </p>
                )}

                {imageUploadError && (
                  <p className="text-[11px] font-semibold text-rose-600 bg-rose-50 border border-rose-200 px-3 py-2 rounded-lg">
                    {imageUploadError}
                  </p>
                )}

                <div className="bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-[11px] text-slate-600 space-y-1">
                  <p className="font-semibold text-slate-700">Formatos aceptados:</p>
                  <p className="text-slate-500">
                    JPG, JPEG, PNG y WEBP • Compresión automática a ≤ 250 KB (máx. 1000 px).
                  </p>
                </div>
              </div>

              {/* Columna Derecha: Datos del Producto */}
              <div className="lg:col-span-7 bg-white p-4 rounded-2xl border border-slate-200 space-y-3.5 shadow-2xs">
                {/* Nombre */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">Nombre Oficial del Ladrillo *</label>
                  <input
                    type="text"
                    required
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  />
                </div>

                {/* Precios y Costos */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-orange-50/40 p-4 rounded-xl border border-orange-200/60">
                  <div>
                    <label className="block font-bold text-orange-950 mb-1.5 flex items-center space-x-1">
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
                      className="w-full px-3.5 py-2.5 border-2 border-orange-300 bg-white rounded-xl text-base font-bold text-orange-700 font-mono focus:ring-2 focus:ring-orange-500 focus:outline-none"
                    />
                    <p className="text-[11px] text-orange-600 mt-1">Precio oficial al público</p>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1.5">Costo Estimado (Bs.)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={editForm.estimated_cost}
                      onChange={(e) => setEditForm({ ...editForm, estimated_cost: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3.5 py-2.5 border border-slate-300 bg-white rounded-xl text-base font-semibold text-slate-700 font-mono focus:ring-2 focus:ring-orange-500 focus:outline-none"
                    />
                    <p className="text-[11px] text-slate-500 mt-1">
                      Margen: <strong className="text-emerald-700">Bs. {Math.max(0, editForm.sale_price - editForm.estimated_cost).toFixed(2)}</strong> ({editForm.sale_price > 0 ? (((editForm.sale_price - editForm.estimated_cost) / editForm.sale_price) * 100).toFixed(0) : 0}%)
                    </p>
                  </div>
                </div>

                {/* Dimensiones y Peso */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1.5">Dimensiones</label>
                    <input
                      type="text"
                      value={editForm.dimensions}
                      onChange={(e) => setEditForm({ ...editForm, dimensions: e.target.value })}
                      placeholder="Ej. 24x12x10 cm"
                      className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-orange-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1.5">Peso Unitario (kg)</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={editForm.weight_kg}
                      onChange={(e) => setEditForm({ ...editForm, weight_kg: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-orange-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Estado Activo */}
                <div className="flex items-center space-x-2.5 pt-3 border-t border-slate-200">
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
              </div>
            </div>
          </form>
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
