"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"

export default function RecuperarContrasenaPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [error, setError] = useState("")

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) { setError("Ingresa tu correo electrónico"); return }
    setLoading(true)
    setError("")

    const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: "https://soci-self.vercel.app/nueva-contrasena",
    })

    setLoading(false)
    if (err) {
      setError("No pudimos enviar el correo. Verifica que el correo esté registrado.")
    } else {
      setEnviado(true)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    background: "rgba(0,0,0,0.25)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 14,
    padding: "14px 16px",
    fontSize: 15,
    color: "white",
    outline: "none",
    fontFamily: "var(--font-nunito)",
    boxSizing: "border-box",
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "#1B3A6B",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "24px 20px",
    }}>
      <div style={{ width: "100%", maxWidth: 400 }}>

        {/* Botón volver */}
        <button
          onClick={() => router.push("/")}
          style={{
            background: "none",
            border: "none",
            color: "rgba(255,255,255,0.5)",
            fontSize: 14,
            fontWeight: 700,
            cursor: "pointer",
            fontFamily: "var(--font-nunito)",
            padding: 0,
            marginBottom: 24,
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          ← Volver al inicio de sesión
        </button>

        <div style={{
          background: "rgba(0,0,0,0.3)",
          borderRadius: 24,
          padding: "32px 28px",
          border: "1px solid rgba(255,255,255,0.08)",
        }}>
          {enviado ? (
            /* Estado éxito */
            <div style={{ textAlign: "center" }}>
              <p style={{ fontSize: 48, marginBottom: 16 }}>📧</p>
              <p style={{ color: "#27B173", fontSize: 20, fontWeight: 900, marginBottom: 12 }}>
                ¡Correo enviado!
              </p>
              <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 14, lineHeight: 1.6, marginBottom: 8 }}>
                Te enviamos un enlace a <strong style={{ color: "white" }}>{email}</strong>.
                Ábrelo para crear tu nueva contraseña.
              </p>
              <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 13 }}>
                ¿No lo encuentras? Revisa tu carpeta de spam.
              </p>
            </div>
          ) : (
            /* Formulario */
            <>
              <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 12, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>
                Recuperar acceso
              </p>
              <p style={{ color: "white", fontSize: 22, fontWeight: 900, marginBottom: 24 }}>
                ¿Olvidaste tu contraseña?
              </p>

              <form onSubmit={enviar} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 13, fontWeight: 700, marginBottom: 8 }}>
                    Correo electrónico
                  </p>
                  <input
                    type="email"
                    placeholder="tucorreo@ejemplo.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    style={inputStyle}
                  />
                </div>

                {error && (
                  <p style={{ color: "#f87171", fontSize: 13, fontWeight: 600 }}>{error}</p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    width: "100%",
                    background: loading ? "rgba(39,177,115,0.5)" : "#27B173",
                    border: "none",
                    borderRadius: 14,
                    padding: "16px",
                    color: "white",
                    fontSize: 16,
                    fontWeight: 900,
                    cursor: loading ? "not-allowed" : "pointer",
                    fontFamily: "var(--font-nunito)",
                    transition: "background 0.2s",
                  }}
                >
                  {loading ? "Enviando..." : "Enviar enlace de recuperación"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
