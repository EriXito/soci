/**
 * Helpers fire-and-forget para sincronizar con Google Sheets.
 * No lanzan excepciones — si falla, el flujo principal no se interrumpe.
 */

export function syncVentaSheets(
  empresa_id: string,
  venta: { total: number; metodo_pago: string },
  items: { nombre_producto: string; cantidad: number }[]
) {
  fetch("/api/sheets", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tipo: "venta", empresa_id, datos: { ...venta, items } }),
  }).catch(() => {/* silencioso */})
}

export function syncProductoSheets(
  empresa_id: string,
  producto: {
    nombre: string
    marca?: string
    precio_compra?: number
    precio_venta?: number
    stock_actual?: number
    stock_minimo?: number
  }
) {
  fetch("/api/sheets", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tipo: "producto", empresa_id, datos: producto }),
  }).catch(() => {/* silencioso */})
}
