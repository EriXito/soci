"use client"

import { useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { obtenerVentasPendientes, eliminarVentaPendiente, marcarSincronizando } from "@/lib/offline"

// Flag de módulo — persiste entre re-renders y re-montajes del hook
let sincronizando = false

export function useSync(onSincronizado?: (cantidad: number) => void) {
  useEffect(() => {
    const sincronizar = async () => {
      if (!navigator.onLine) return
      if (sincronizando) return

      let pendientes: Awaited<ReturnType<typeof obtenerVentasPendientes>>
      try {
        pendientes = await obtenerVentasPendientes()
      } catch {
        return
      }

      // Filtrar las que ya están siendo procesadas
      const porProcesar = pendientes.filter(v => !v.sincronizando)
      if (porProcesar.length === 0) return

      sincronizando = true
      let sincronizadas = 0

      for (const venta of porProcesar) {
        try {
          // Marcar como en proceso ANTES de insertar — evita doble procesamiento
          await marcarSincronizando(venta.id)

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

          if (!ventaDB) {
            // Si falló el insert revertir el flag para poder reintentar
            await marcarSincronizando(venta.id, false)
            continue
          }

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

          // 5. Eliminar de IndexedDB — ya sincronizada
          await eliminarVentaPendiente(venta.id)
          sincronizadas++
        } catch {
          // Si falla, dejar en IndexedDB para el próximo intento
        }
      }

      sincronizando = false
      if (sincronizadas > 0) onSincronizado?.(sincronizadas)
    }

    window.addEventListener("online", sincronizar)
    sincronizar()

    return () => window.removeEventListener("online", sincronizar)
  }, [onSincronizado])
}
