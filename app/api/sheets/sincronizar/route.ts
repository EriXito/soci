import { NextRequest, NextResponse } from "next/server"
import { google } from "googleapis"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

function buildSheetsClient() {
  const auth = new google.auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  })
  return google.sheets({ version: "v4", auth })
}

type VentaItem = {
  nombre_producto: string
  cantidad: number
  precio_unitario: number
  subtotal: number
}

type Venta = {
  id: string
  total: number
  metodo_pago: string
  created_at: string
  venta_items: VentaItem[]
}

/** Convierte timestamp UTC a fecha/hora Colombia (UTC-5) */
function colDateTime(utcIso: string) {
  const d = new Date(new Date(utcIso).getTime() - 5 * 60 * 60 * 1000)
  const fecha = d.toISOString().slice(0, 10)
  const hora = d.toISOString().slice(11, 16)
  return { fecha, hora }
}

export async function POST(req: NextRequest) {
  try {
    const { empresa_id } = await req.json()
    console.log("[sincronizar] empresa_id:", empresa_id)

    // 1. Obtener sheets_id de la empresa
    const { data: empresa } = await supabase
      .from("empresas")
      .select("sheets_id")
      .eq("id", empresa_id)
      .maybeSingle()

    if (!empresa?.sheets_id) {
      return NextResponse.json({ ok: false, error: "Sin sheets configurado" }, { status: 400 })
    }
    const spreadsheetId = empresa.sheets_id

    // 2. Obtener todas las ventas de la empresa con sus items
    const { data: ventas } = await supabase
      .from("ventas")
      .select("id, total, metodo_pago, created_at, venta_items(nombre_producto, cantidad, precio_unitario, subtotal)")
      .eq("empresa_id", empresa_id)
      .order("created_at")

    if (!ventas || ventas.length === 0) {
      return NextResponse.json({ ok: true, sincronizadas: 0, omitidas: 0 })
    }

    const sheets = buildSheetsClient()

    // 3. Leer IDs de venta ya existentes en columna C de la hoja "Ventas"
    const resExistentes = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "Ventas!C:C",
    })
    const idsExistentes = new Set(
      (resExistentes.data.values ?? [])
        .flat()
        .filter(Boolean)
        .slice(1) // saltar el header "ID Venta"
    )
    console.log("[sincronizar] IDs ya en sheets:", idsExistentes.size)

    // 4. Construir filas solo de ventas cuyo ID no está en la hoja
    const filasNuevas: (string | number)[][] = []
    let omitidas = 0

    for (const venta of ventas as Venta[]) {
      if (idsExistentes.has(venta.id)) {
        omitidas++
        continue
      }
      const { fecha, hora } = colDateTime(venta.created_at)
      for (const item of venta.venta_items) {
        filasNuevas.push([
          fecha,
          hora,
          venta.id,
          item.nombre_producto,
          item.cantidad,
          item.precio_unitario,
          item.subtotal,
          venta.total,
          venta.metodo_pago,
        ])
      }
    }

    const sincronizadas = ventas.length - omitidas - (idsExistentes.size > 0 ? 0 : 0)
    const ventasNuevas = (ventas as Venta[]).filter(v => !idsExistentes.has(v.id)).length

    if (filasNuevas.length > 0) {
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: "Ventas!A:I",
        valueInputOption: "RAW",
        insertDataOption: "INSERT_ROWS",
        requestBody: { values: filasNuevas },
      })
    }

    console.log("[sincronizar] filas nuevas:", filasNuevas.length, "ventas omitidas:", omitidas)
    return NextResponse.json({ ok: true, sincronizadas: ventasNuevas, omitidas })
  } catch (err) {
    console.error("[sincronizar] error:", err)
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}
