# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start dev server at localhost:3000
npm run build    # Build production bundle
npm run lint     # Run ESLint
npm start        # Run production server
```

No test framework is configured.

## Architecture

**Stack:** Next.js 16 (App Router) + React 19 + TypeScript + Supabase + Tailwind CSS v4 + shadcn/ui

**Supabase client** is initialized in `lib/supabase.ts` and imported directly into page components. There are no API routes — all database queries run client-side using the anon key. Row-level security in Supabase enforces data isolation by `empresa_id`.

**Auth flow:** Login page (`app/page.tsx`) → `supabase.auth.signInWithPassword` → redirect to `/dashboard`. Protected pages call `supabase.auth.getUser()` on mount and redirect to `/` if unauthenticated.

**Multi-tenancy:** Users belong to a `perfiles` row linked to `empresas`. All business data (wallets, products, sales) is scoped by `empresa_id` fetched from `perfiles`.

## Database Schema

- `perfiles`: `id`, `empresa_id`
- `empresas`: `id`, `nombre`
- `billeteras`: `id`, `empresa_id`, `nombre`, `saldo`, `color`, `icono`
- `productos`: `id`, `empresa_id`, `nombre`, `marca`, `stock_actual`, `stock_minimo`, `precio_venta`, `precio_compra`, `activo`
- `ventas`: `id`, `empresa_id`, `total`, `metodo_pago`, `created_at`
- `venta_items`: `id`, `venta_id`, `producto_id`, `nombre_producto`, `cantidad`, `precio_unitario`, `subtotal`

## Pages

- `/` — Login
- `/dashboard` — Wallet balances + product inventory with stock status (ok/bajo/critico)
- `/venta` — Two-step sales wizard: (1) add products to cart, (2) select payment method & calculate change

The sales confirmation flow in `/venta` does 4 sequential writes: insert `ventas`, insert `venta_items`, update `productos.stock_actual`, update `billeteras.saldo`.

## UI Conventions

Pages use **inline styles with `React.CSSProperties`**, not Tailwind utility classes (despite Tailwind being installed). The design follows a "Money+" aesthetic: dark blue (`#1B3A6B`) backgrounds, green (`#27B173`) accents, Nunito font, glassmorphism cards.

shadcn/ui components (`components/ui/`) exist but are mostly unused in current pages — custom inline-styled components are preferred.

Currency is always formatted as Colombian pesos (COP).

## Environment

Requires `.env.local` with:
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```
