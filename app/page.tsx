"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError("Correo o contraseña incorrectos")
      setLoading(false)
      return
    }

    window.location.href = "/dashboard"
  }

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        
        <div className="text-center mb-8">
          <h1 className="text-4xl font-black text-zinc-900 tracking-tight">SOCI</h1>
          <p className="text-zinc-500 mt-1 text-sm">Tu socio tecnológico</p>
        </div>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold">Entrar a tu tienda</CardTitle>
            <CardDescription>Ingresa con tu correo y contraseña</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="flex flex-col gap-4">
              
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="email">Correo</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="tucorreo@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="password">Contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              {error && (
                <p className="text-sm text-red-500 text-center">{error}</p>
              )}

              <Button
                type="submit"
                className="w-full h-11 text-base font-semibold mt-2"
                disabled={loading}
              >
                {loading ? "Entrando..." : "Entrar"}
              </Button>

            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-zinc-400 mt-6">
          ¿No tienes cuenta? Escríbenos por WhatsApp
        </p>

      </div>
    </div>
  )
}