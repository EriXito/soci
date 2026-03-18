import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  try {
    const { transcripcion, productos, empresa_id } = await req.json()

    console.log("[voz] transcripcion:", transcripcion, "empresa:", empresa_id, "productos:", productos.length)

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY!,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        messages: [{
          role: "user",
          content: `Eres un asistente para una tienda en Colombia.
El tendero dijo: "${transcripcion}"

Lista de productos disponibles:
${JSON.stringify(productos)}

Identifica qué productos vendió y en qué cantidad.
Responde SOLO con un JSON array así:
[{"producto_id": "uuid", "cantidad": 2}]
Si no encuentras el producto en la lista responde [].
No incluyas texto adicional, solo el JSON.`,
        }],
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      console.error("[voz] Anthropic error:", err)
      return NextResponse.json({ ok: false, error: err }, { status: 500 })
    }

    const data = await response.json()
    const texto = (data.content?.[0]?.text ?? "[]").trim()
    console.log("[voz] respuesta Claude:", texto)

    const items = JSON.parse(texto)
    return NextResponse.json({ ok: true, items })
  } catch (err) {
    console.error("[voz] error:", err)
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}
