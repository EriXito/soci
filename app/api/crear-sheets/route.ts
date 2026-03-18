import { NextRequest, NextResponse } from "next/server"
import { google } from "googleapis"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

function buildAuth() {
  return new google.auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    scopes: [
      "https://www.googleapis.com/auth/spreadsheets",
      "https://www.googleapis.com/auth/drive",
    ],
  })
}

export async function POST(req: NextRequest) {
  try {
    const { empresa_id, nombre_empresa } = await req.json()
    console.log("[crear-sheets] empresa_id:", empresa_id, "nombre:", nombre_empresa)

    const auth = buildAuth()
    const drive = google.drive({ version: "v3", auth })
    const sheets = google.sheets({ version: "v4", auth })

    // 1. Crear el spreadsheet via Drive API
    const { data: archivo } = await drive.files.create({
      requestBody: {
        name: `SOCI - ${nombre_empresa}`,
        mimeType: "application/vnd.google-apps.spreadsheet",
      },
      fields: "id",
    })

    const sheetsId = archivo.id!
    console.log("[crear-sheets] spreadsheet creado:", sheetsId)

    // 2. Dar permiso de escritura a la cuenta de servicio (ya tiene acceso por ser
    //    el creador, pero lo hacemos explícito para que otros puedan compartirlo)
    await drive.permissions.create({
      fileId: sheetsId,
      requestBody: {
        role: "writer",
        type: "user",
        emailAddress: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      },
    })

    // 3. Crear hojas con headers desde el inicio
    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId: sheetsId })
    const hojaDefaultId = spreadsheet.data.sheets?.[0]?.properties?.sheetId ?? 0

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: sheetsId,
      requestBody: {
        requests: [
          // Renombrar hoja 1 a "Ventas"
          {
            updateSheetProperties: {
              properties: { sheetId: hojaDefaultId, title: "Ventas" },
              fields: "title",
            },
          },
          // Agregar hoja "Inventario"
          { addSheet: { properties: { title: "Inventario" } } },
        ],
      },
    })

    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: sheetsId,
      requestBody: {
        valueInputOption: "RAW",
        data: [
          {
            range: "Ventas!A1",
            values: [["Fecha", "Hora", "ID Venta", "Producto", "Cantidad", "Precio Unitario", "Subtotal", "Total Venta", "Medio de Pago"]],
          },
          {
            range: "Inventario!A1",
            values: [["Nombre", "Marca", "Precio Compra", "Precio Venta", "Stock Actual", "Stock Mínimo"]],
          },
        ],
      },
    })

    // 4. Guardar sheets_id en Supabase
    const { error: updateError } = await supabase
      .from("empresas")
      .update({ sheets_id: sheetsId })
      .eq("id", empresa_id)

    if (updateError) {
      console.error("[crear-sheets] error guardando sheets_id:", updateError)
    }

    const sheets_url = `https://docs.google.com/spreadsheets/d/${sheetsId}`
    console.log("[crear-sheets] listo:", sheets_url)

    return NextResponse.json({ ok: true, sheets_id: sheetsId, sheets_url })
  } catch (err) {
    console.error("[crear-sheets] error:", err)
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}
