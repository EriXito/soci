"use client"

import { useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { obtenerVentasPendientes, eliminarVentaPendiente } from "@/lib/offline"

export function useSync(onSincronizado?: (cantidad: number) => void) {
  useEffect(() => {
    const sincronizar = async () => {
      if (!navigator.onLine) return

      let pendientes: Awaited<ReturnType<typeof obtenerVentasPendientes>>
      try {
        pendientes = await obtenerVentasPendientes()
      } catch {
        return
      }
      if (pendientes.length === 0) return

      let sincronizadas = 0

      for (const venta of pendientes) {
        try {
          // 1. Insertar venta
          const { data: ventaDB } = await supabase
            .from("ventas")
            .insert({
              empresa_id: venta.empresa_id,
              total: venta.total,
              metodo_pago: venta.metodo_pago,
              created_at: new Date(venta.timestamp).toISOString(),
            })
            .select()
            .single()

          if (!ventaDB) continue

          // 2. Insertar items
          const items = venta.items.map((item: any) => ({
            ...item,
            venta_id: ventaDB.id,
          }))
          await supabase.from("venta_items").insert(items)

          // 3. Actualizar stock
          for (const upd of venta.stock_updates as any[]) {
            await supabase
              .from("productos")
              .update({ stock_actual: upd.stock_actual })
              .eq("id", upd.id)
          }

          // 4. Actualizar billetera
          const { data: billetera } = await supabase
            .from("billeteras")
            .select("id, saldo")
            .eq("empresa_id", venta.empresa_id)
            .ilike("nombre", `%${venta.metodo_pago}%`)
            .single()

          if (billetera) {
            await supabase
              .from("billeteras")
              .update({ saldo: billetera.saldo + venta.total })
              .eq("id", billetera.id)
          }

          // 5. Eliminar de IndexedDB
          await eliminarVentaPendiente(venta.id)
          sincronizadas++
        } catch {
          // Si falla esta venta, intentar la siguiente
        }
      }

      if (sincronizadas > 0) onSincronizado?.(sincronizadas)
    }

    // Sincronizar cuando vuelve internet
    window.addEventListener("online", sincronizar)
    // Intentar también al montar (por si ya hay internet y hay pendientes)
    sincronizar()

    return () => window.removeEventListener("online", sincronizar)
  }, [onSincronizado])
}
