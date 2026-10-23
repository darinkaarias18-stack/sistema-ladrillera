/**
 * Motor de Sincronización Automática Bidireccional entre Sistema Next.js y Supabase
 * ERP Planta Industrial INCEGUA S.R.L.
 */

export type SyncStatus = "idle" | "syncing" | "synced" | "error" | "offline";

export interface SyncState {
  status: SyncStatus;
  lastSyncTime: Date | null;
  pendingCount: number;
  lastError: string | null;
  counts: Record<string, number>;
}

export interface QueuedOperation {
  id: string;
  table: string;
  action: "insert" | "update" | "delete" | "upsert";
  data?: any;
  recordId?: string;
  match?: Record<string, any>;
  timestamp: number;
}

type SyncListener = (state: SyncState) => void;

class SupabaseSyncEngine {
  private status: SyncStatus = "idle";
  private lastSyncTime: Date | null = null;
  private lastError: string | null = null;
  private counts: Record<string, number> = {};
  private listeners: Set<SyncListener> = new Set();
  private isSyncing = false;
  private autoSyncIntervalId: any = null;
  private isInitialized = false;

  constructor() {
    if (typeof window !== "undefined") {
      this.initListeners();
    }
  }

  public subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => this.listeners.delete(listener);
  }

  private notify() {
    const state = this.getState();
    this.listeners.forEach((fn) => {
      try {
        fn(state);
      } catch (e) {
        console.error("Error in sync listener:", e);
      }
    });

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("erp_sync_state_changed", { detail: state }));
    }
  }

  public getState(): SyncState {
    return {
      status: this.status,
      lastSyncTime: this.lastSyncTime,
      pendingCount: this.getQueue().length,
      lastError: this.lastError,
      counts: { ...this.counts }
    };
  }

  private getQueue(): QueuedOperation[] {
    if (typeof window === "undefined") return [];
    try {
      const saved = localStorage.getItem("erp_sync_queue");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  }

  private saveQueue(queue: QueuedOperation[]) {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem("erp_sync_queue", JSON.stringify(queue));
      this.notify();
    } catch (e) {
      console.error("Error saving sync queue:", e);
    }
  }

  public queueOperation(op: Omit<QueuedOperation, "id" | "timestamp">) {
    const queue = this.getQueue();
    const newOp: QueuedOperation = {
      ...op,
      id: `op-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: Date.now()
    };
    queue.push(newOp);
    this.saveQueue(queue);

    // Intentar vaciar la cola inmediatamente si estamos online
    if (typeof navigator === "undefined" || navigator.onLine) {
      this.flushQueue();
    }
  }

  public async flushQueue(): Promise<boolean> {
    const queue = this.getQueue();
    if (queue.length === 0) return true;

    try {
      const res = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ operations: queue.map(q => ({
          table: q.table,
          action: q.action,
          data: q.data,
          id: q.recordId,
          match: q.match
        })) })
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          this.saveQueue([]);
          return true;
        }
      }
      return false;
    } catch (err: any) {
      console.warn("Could not flush sync queue, will retry later:", err.message);
      return false;
    }
  }

  /**
   * Sincroniza desde Supabase hacia la aplicación (PULL).
   * Actualiza el store y almacena en caché local para persistencia.
   */
  public async pullFromSupabase(): Promise<boolean> {
    if (this.isSyncing) return false;
    this.isSyncing = true;
    this.status = "syncing";
    this.notify();

    try {
      const response = await fetch("/api/sync", {
        method: "GET",
        headers: { "Cache-Control": "no-cache" }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const json = await response.json();
      if (!json.success || !json.data) {
        throw new Error(json.error || "Formato de respuesta inválido");
      }

      const data = json.data;
      this.counts = json.counts || {};

      // Guardar en el store en memoria y localStorage
      if (typeof window !== "undefined") {
        // Importación dinámica para evitar ciclos
        const { store } = await import("./store");
        store.loadFromSupabaseData(data);

        // Guardar marca de tiempo
        this.lastSyncTime = new Date();
        this.lastError = null;
        this.status = "synced";
        localStorage.setItem("erp_last_sync_time", this.lastSyncTime.toISOString());

        // Procesar cualquier cambio pendiente en cola
        await this.flushQueue();

        // Despachar eventos de actualización a toda la interfaz
        window.dispatchEvent(new CustomEvent("erp_sync_completed", { detail: this.counts }));
        window.dispatchEvent(new CustomEvent("erp_employees_updated"));
        window.dispatchEvent(new CustomEvent("erp_customers_updated"));
        window.dispatchEvent(new CustomEvent("erp_batches_updated"));
        window.dispatchEvent(new CustomEvent("erp_inventory_updated"));
        window.dispatchEvent(new CustomEvent("erp_orders_updated"));
        window.dispatchEvent(new CustomEvent("erp_sales_updated"));
        window.dispatchEvent(new CustomEvent("erp_payroll_updated"));
        window.dispatchEvent(new CustomEvent("erp_cash_updated"));
        window.dispatchEvent(new CustomEvent("erp_attendance_updated"));
      }

      return true;
    } catch (err: any) {
      console.error("Error pulling from Supabase:", err);
      this.lastError = err.message || "Error al conectar con Supabase";
      this.status = typeof navigator !== "undefined" && !navigator.onLine ? "offline" : "error";
      return false;
    } finally {
      this.isSyncing = false;
      this.notify();
    }
  }

  /**
   * Envía una mutación inmediatamente a Supabase (PUSH).
   * Si falla por conectividad, la encola automáticamente.
   */
  public async pushChange(
    table: string,
    action: "insert" | "update" | "delete" | "upsert",
    data?: any,
    recordId?: string,
    match?: Record<string, any>
  ): Promise<boolean> {
    try {
      const res = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ table, action, data, id: recordId, match })
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const json = await res.json();
      if (json.success) {
        this.lastSyncTime = new Date();
        this.status = "synced";
        this.notify();
        return true;
      } else {
        throw new Error(json.error || "Operación no completada en Supabase");
      }
    } catch (err: any) {
      console.warn(`[Sync] PUSH a ${table} falló, encolando para reintento:`, err.message);
      this.queueOperation({ table, action, data, recordId, match });
      this.status = "error";
      this.lastError = `Pendiente de sincronizar: ${table}`;
      this.notify();
      return false;
    }
  }

  private initListeners() {
    if (this.isInitialized) return;
    this.isInitialized = true;

    // Cargar última sincronización guardada
    try {
      const savedTime = localStorage.getItem("erp_last_sync_time");
      if (savedTime) {
        this.lastSyncTime = new Date(savedTime);
      }
    } catch {}

    // Eventos de conexión
    window.addEventListener("online", () => {
      this.status = "syncing";
      this.notify();
      this.flushQueue().then(() => this.pullFromSupabase());
    });

    window.addEventListener("offline", () => {
      this.status = "offline";
      this.notify();
    });

    // Sincronizar automáticamente cuando el usuario regresa a la pestaña
    window.addEventListener("focus", () => {
      const now = Date.now();
      const last = this.lastSyncTime ? this.lastSyncTime.getTime() : 0;
      // Si pasaron más de 15 segundos desde la última sync, actualizar
      if (now - last > 15000) {
        this.pullFromSupabase();
      }
    });

    // Iniciar auto-sync cada 30 segundos en segundo plano
    this.startAutoSync(30);

    // Ejecución inicial después de que la página cargue
    setTimeout(() => {
      this.pullFromSupabase();
    }, 100);
  }

  public startAutoSync(intervalSeconds = 30) {
    if (this.autoSyncIntervalId) {
      clearInterval(this.autoSyncIntervalId);
    }
    this.autoSyncIntervalId = setInterval(() => {
      if (typeof navigator !== "undefined" && navigator.onLine) {
        this.pullFromSupabase();
      }
    }, intervalSeconds * 1000);
  }

  public stopAutoSync() {
    if (this.autoSyncIntervalId) {
      clearInterval(this.autoSyncIntervalId);
      this.autoSyncIntervalId = null;
    }
  }
}

// Singleton de sincronización global
export const supabaseSync = new SupabaseSyncEngine();
