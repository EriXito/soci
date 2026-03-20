"use client"

import { useState, useRef } from "react"

interface ProductoSimple {
  id: string
  nombre: string
  marca: string
  precio_venta: number
}

interface ItemIdentificado {
  producto_id: string
  cantidad: number
}

interface Props {
  productos: ProductoSimple[]
  empresaId: string
  onProductosIdentificados: (items: ItemIdentificado[]) => void
}

type Estado = "idle" | "escuchando" | "procesando" | "listo" | "error"

export default function BotonVoz({ productos, empresaId, onProductosIdentificados }: Props) {
  const [estado, setEstado] = useState<Estado>("idle")
  const [texto, setTexto] = useState("")
  const [transcriptParcial, setTranscriptParcial] = useState("")
  const recognitionRef = useRef<any>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const resultadoRecibido = useRef(false)

  const limpiarTimeout = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }

  const detener = () => {
    limpiarTimeout()
    recognitionRef.current?.stop()
  }

  const procesar = async (transcripcion: string) => {
    setTexto(transcripcion)
    setTranscriptParcial("")
    setEstado("procesando")

    try {
      const res = await fetch("/api/voz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcripcion,
          productos: productos.map(p => ({ id: p.id, nombre: p.nombre, marca: p.marca, precio_venta: p.precio_venta })),
          empresa_id: empresaId,
        }),
      })
      const data = await res.json()
      if (data.ok && Array.isArray(data.items) && data.items.length > 0) {
        onProductosIdentificados(data.items)
        setEstado("listo")
      } else {
        setTexto("No encontré productos")
        setEstado("error")
      }
    } catch {
      setTexto("Error de conexión")
      setEstado("error")
    }

    setTimeout(() => { setEstado("idle"); setTexto(""); setTranscriptParcial("") }, 3000)
  }

  const iniciar = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) {
      setTexto("Tu navegador no soporta voz")
      setEstado("error")
      setTimeout(() => { setEstado("idle"); setTexto("") }, 3000)
      return
    }

    const recognition = new SR()
    recognitionRef.current = recognition
    recognition.lang = "es-CO"
    recognition.continuous = false
    recognition.interimResults = true  // resultados parciales en tiempo real
    resultadoRecibido.current = false

    recognition.onstart = () => {
      setEstado("escuchando")
      setTranscriptParcial("")
      // Timeout de 10 segundos por si onend no dispara en móvil
      timeoutRef.current = setTimeout(() => {
        recognition.stop()
      }, 10000)
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      let interim = ""
      let final = ""
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript
        if (event.results[i].isFinal) final += t
        else interim += t
      }
      // Mostrar texto parcial en tiempo real
      setTranscriptParcial(final || interim)

      if (final) {
        resultadoRecibido.current = true
        limpiarTimeout()
        recognition.stop()
        procesar(final.trim())
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onerror = (event: any) => {
      resultadoRecibido.current = true
      limpiarTimeout()
      setTranscriptParcial("")
      setTexto(event.error === "not-allowed" ? "Permiso de micrófono denegado" : "Error al escuchar")
      setEstado("error")
      setTimeout(() => { setEstado("idle"); setTexto("") }, 3000)
    }

    recognition.onend = () => {
      limpiarTimeout()
      // Si no hubo resultado final, volver a idle (el usuario no habló)
      if (!resultadoRecibido.current) {
        setTranscriptParcial("")
        setEstado("idle")
      }
    }

    recognition.start()
  }

  const btnColor = estado === "error" ? "rgba(239,68,68,0.85)"
    : estado === "listo" ? "#1fa866"
    : "#27B173"

  const label = estado === "idle" ? "Dictar venta"
    : estado === "escuchando" ? "Escuchando..."
    : estado === "procesando" ? "Procesando..."
    : estado === "listo" ? (texto || "Listo")
    : (texto || "Error")

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, marginBottom: 16 }}>
      <style>{`
        @keyframes vozPulse {
          0%, 100% { box-shadow: 0 0 0 6px rgba(39,177,115,0.35), 0 0 0 14px rgba(39,177,115,0.15); }
          50%       { box-shadow: 0 0 0 10px rgba(39,177,115,0.2), 0 0 0 22px rgba(39,177,115,0.07); }
        }
      `}</style>

      {/* Botones en fila cuando está escuchando */}
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <button
          onClick={estado === "idle" ? iniciar : undefined}
          disabled={estado === "procesando"}
          style={{
            width: 64,
            height: 64,
            borderRadius: "50%",
            background: btnColor,
            border: "none",
            cursor: estado === "procesando" ? "not-allowed" : estado === "idle" ? "pointer" : "default",
            fontSize: 28,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "background 0.2s, box-shadow 0.2s",
            animation: estado === "escuchando" ? "vozPulse 1.2s ease-in-out infinite" : "none",
            flexShrink: 0,
          }}
        >
          {estado === "procesando" ? "⏳" : estado === "listo" ? "✓" : estado === "error" ? "✕" : "🎤"}
        </button>

        {/* Botón Detener — solo visible mientras escucha */}
        {estado === "escuchando" && (
          <button
            onClick={detener}
            style={{
              width: 64,
              height: 64,
              borderRadius: "50%",
              background: "#E24B4A",
              border: "none",
              cursor: "pointer",
              fontSize: 22,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            ⏹
          </button>
        )}
      </div>

      {/* Etiqueta de estado */}
      <p style={{
        color: estado === "error" ? "#f87171" : estado === "listo" ? "#27B173" : "rgba(255,255,255,0.45)",
        fontSize: 12,
        fontWeight: 700,
        textAlign: "center",
        maxWidth: 220,
        lineHeight: 1.3,
        margin: 0,
      }}>
        {label}
      </p>

      {/* Transcript parcial en tiempo real */}
      {transcriptParcial && estado === "escuchando" && (
        <p style={{
          color: "rgba(255,255,255,0.75)",
          fontSize: 13,
          fontWeight: 600,
          textAlign: "center",
          maxWidth: 260,
          lineHeight: 1.4,
          margin: 0,
          fontStyle: "italic",
        }}>
          "{transcriptParcial}"
        </p>
      )}
    </div>
  )
}
