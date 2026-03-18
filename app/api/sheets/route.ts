import { NextRequest, NextResponse } from "next/server"
import { google } from "googleapis"
import { createClient } from "@supabase/supabase-js"

// Cliente Supabase server-side
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

/** Crea la hoja con headers si no existe todavía */
async function asegurarHoja(
  sheets: ReturnType<typeof buildSheetsClient>,
  spreadsheetId: string,
  nombre: string,
  headers: string[]
) {
  const { data } = await sheets.spreadsheets.get({ spreadsheetId })
  const existe = data.sheets?.some(s => s.properties?.title === nombre)

  if (!existe) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests: [{ addSheet: { properties: { title: nombre } } }] },
    })
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${nombre}!A1`,
      valueInputOption: "RAW",
      requestBody: { values: [headers] },
    })
  } else {
    // Verificar si los headers actuales coinciden; si no, actualizarlos
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${nombre}!1:1`,
    })
    const headersActuales = res.data.values?.[0] ?? []
    const coinciden = headers.every((h, i) => headersActuales[i] === h)
    if (!coinciden) {
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${nombre}!A1`,
        valueInputOption: "RAW",
        requestBody: { values: [headers] },
      })
    }
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    console.log("SHEETS API llamado con:", JSON.stringify(body))
    const { tipo, empresa_id, datos } = body

    // Buscar sheets_id de la empresa
    const { data: empresa, error: empresaError } = await supabase
      .from("empresas")
      .select("sheets_id")
      .eq("id", empresa_id)
      .maybeSingle()

    console.log("empresa result:", empresa, "error:", empresaError)

    if (empresaError || !empresa || !empresa.sheets_id) {
      console.log("No sheets_id configurado, saltando sync")
      return NextResponse.json({ ok: true, skipped: true })
    }

    console.log("sheets_id encontrado:", empresa.sheets_id)

    const sheets = buildSheetsClient()
    console.log("Google auth OK")
    const spreadsheetId = empresa.sheets_id

    if (tipo === "venta") {
      await asegurarHoja(sheets, spreadsheetId, "Ventas", [
        "Fecha", "Hora", "ID Venta", "Producto", "Cantidad",
        "Precio Unitario", "Subtotal", "Total Venta", "Medio de Pago",
      ])

      // Hora Colombia (UTC-5)
      const col = new Date(Date.now() - 5 * 60 * 60 * 1000)
      const fecha = col.toISOString().slice(0, 10)
      const hora = col.toISOString().slice(11, 16) // HH:MM en UTC-5

      type Item = { nombre_producto: string; cantidad: number; precio_unitario: number; subtotal: number }
      const filas = (datos.items as Item[]).map(item => [
        fecha,
        hora,
        datos.venta_id,
        item.nombre_producto,
        item.cantidad,
        item.precio_unitario,
        item.subtotal,
        datos.total,
        datos.metodo_pago,
      ])

      console.log("Escribiendo en sheets...")
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: "Ventas!A:I",
        valueInputOption: "RAW",
        insertDataOption: "INSERT_ROWS",
        requestBody: { values: filas },
      })

    } else if (tipo === "producto") {
      await asegurarHoja(sheets, spreadsheetId, "Inventario", [
        "Nombre", "Marca", "Precio Compra", "Precio Venta", "Stock Actual", "Stock Mínimo",
      ])

      const fila = [
        datos.nombre,
        datos.marca || "",
        datos.precio_compra ?? 0,
        datos.precio_venta ?? 0,
        datos.stock_actual ?? 0,
        datos.stock_minimo ?? 0,
      ]

      const res = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: "Inventario!A:A",
      })
      const filas = res.data.values || []
      const idx = filas.findIndex(r => r[0] === datos.nombre)

      console.log("Escribiendo en sheets...")
      if (idx > 0) {
        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `Inventario!A${idx + 1}`,
          valueInputOption: "RAW",
          requestBody: { values: [fila] },
        })
      } else {
        await sheets.spreadsheets.values.append({
          spreadsheetId,
          range: "Inventario!A:F",
          valueInputOption: "RAW",
          insertDataOption: "INSERT_ROWS",
          requestBody: { values: [fila] },
        })
      }
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("Error detallado:", err)
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}
