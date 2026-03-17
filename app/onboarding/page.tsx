"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"

const SLIDES = [
  {
    emoji: "🎉",
    titulo: "Bienvenido a SOCI",
    subtitulo: "Tu socio tecnológico para llevar tu tienda con orden y tranquilidad",
  },
  {
    emoji: "💵",
    titulo: "Registra tus ventas",
    subtitulo: "En pocos toques registra lo que vendiste, elige cómo te pagaron y el sistema calcula las vueltas solo",
  },
  {
    emoji: "📦",
    titulo: "Controla tu inventario",
    subtitulo: "Mira de un vistazo qué productos están por agotarse con el semáforo de stock",
  },
  {
    emoji: "🧾",
    titulo: "Cierra tu caja cada día",
    subtitulo: "Al final del día revisa cuánto vendiste, cuánto gastaste y cuánto ganaste",
  },
]

export default function OnboardingPage() {
  const router = useRouter()
  const [slide, setSlide] = useState(0)
  const touchStartX = useRef(0)
  const touchStartY = useRef(0)
  const ultimo = slide === SLIDES.length - 1

  useEffect(() => {
    if (localStorage.getItem("soci_onboarding_done")) {
      router.replace("/dashboard")
    }
  }, [router])

  const finalizar = () => {
    localStorage.setItem("soci_onboarding_done", "true")
    router.push("/dashboard")
  }

  const irA = (n: number) => {
    if (n >= 0 && n < SLIDES.length) setSlide(n)
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    const dx = touchStartX.current - e.changedTouches[0].clientX
    const dy = Math.abs(touchStartY.current - e.changedTouches[0].clientY)
    // Solo swipe horizontal (no confundir con scroll vertical)
    if (Math.abs(dx) > 50 && Math.abs(dx) > dy * 1.5) {
      if (dx > 0) irA(slide + 1)
      else irA(slide - 1)
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#1B3A6B",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        position: "relative",
        userSelect: "none",
      }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >

      {/* Botón saltar */}
      <div style={{
        position: "absolute",
        top: 0, right: 0,
        padding: "48px 24px 0",
        zIndex: 10,
      }}>
        {!ultimo && (
          <button
            onClick={finalizar}
            style={{
              background: "none",
              border: "none",
              color: "rgba(255,255,255,0.38)",
              fontSize: 14,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: "var(--font-nunito)",
              padding: "8px 4px",
            }}
          >
            Saltar
          </button>
        )}
      </div>

      {/* Track de slides */}
      <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
        {SLIDES.map((s, i) => (
            <div
              key={i}
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "0 40px 24px",
                textAlign: "center",
                transform: `translateX(${(i - slide) * 100}%)`,
                transition: "transform 0.38s cubic-bezier(0.4, 0, 0.2, 1)",
              }}
            >
              {/* Fondo decorativo detrás del emoji */}
              <div style={{
                width: 160,
                height: 160,
                borderRadius: "50%",
                background: "rgba(39,177,115,0.08)",
                border: "2px solid rgba(39,177,115,0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 40,
                fontSize: 80,
                lineHeight: 1,
              }}>
                {s.emoji}
              </div>

              <h1 style={{
                color: "white",
                fontSize: 28,
                fontWeight: 900,
                marginBottom: 16,
                letterSpacing: -0.5,
                fontFamily: "var(--font-nunito)",
                lineHeight: 1.2,
              }}>
                {s.titulo}
              </h1>

              <p style={{
                color: "rgba(255,255,255,0.55)",
                fontSize: 16,
                lineHeight: 1.65,
                fontWeight: 500,
                maxWidth: 320,
                fontFamily: "var(--font-nunito)",
              }}>
                {s.subtitulo}
              </p>
            </div>
          ))}
      </div>

      {/* Área inferior: dots + botón */}
      <div style={{
        padding: "16px 32px 56px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 32,
      }}>

        {/* Indicadores */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => irA(i)}
              style={{
                width: i === slide ? 28 : 8,
                height: 8,
                borderRadius: 4,
                background: i === slide ? "#27B173" : "rgba(255,255,255,0.22)",
                border: "none",
                cursor: "pointer",
                padding: 0,
                transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
              }}
            />
          ))}
        </div>

        {/* Botón acción */}
        {ultimo ? (
          <button
            onClick={finalizar}
            style={{
              width: "100%",
              maxWidth: 380,
              background: "#27B173",
              border: "none",
              borderRadius: 20,
              padding: "20px",
              color: "white",
              fontSize: 18,
              fontWeight: 900,
              cursor: "pointer",
              fontFamily: "var(--font-nunito)",
              letterSpacing: -0.3,
            }}
          >
            ¡Empezar ahora!
          </button>
        ) : (
          <button
            onClick={() => irA(slide + 1)}
            style={{
              width: "100%",
              maxWidth: 380,
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.18)",
              borderRadius: 20,
              padding: "18px",
              color: "rgba(255,255,255,0.85)",
              fontSize: 16,
              fontWeight: 800,
              cursor: "pointer",
              fontFamily: "var(--font-nunito)",
            }}
          >
            Siguiente →
          </button>
        )}
      </div>

    </div>
  )
}
