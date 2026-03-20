import { openDB } from "idb"

const DB_NAME = "soci-offline"
const DB_VERSION = 1

export async function getDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains("ventas_pendientes")) {
        db.createObjectStore("ventas_pendientes", { keyPath: "id" })
      }
    },
  })
}

export async function guardarVentaPendiente(venta: {
  empresa_id: string
  total: number
  metodo_pago: string
  items: {
    producto_id: string
    nombre_producto: string
    cantidad: number
    precio_unitario: number
    subtotal: number
  }[]
  stock_updates: { id: string; stock_actual: number }[]
}) {
  const db = await getDB()
  await db.add("ventas_pendientes", {
    ...venta,
    id: crypto.randomUUID(),
    timestamp: Date.now(),
  })
}

export async function obtenerVentasPendientes() {
  const db = await getDB()
  return db.getAll("ventas_pendientes")
}

export async function eliminarVentaPendiente(id: string) {
  const db = await getDB()
  await db.delete("ventas_pendientes", id)
}
