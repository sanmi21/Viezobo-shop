'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMemo, useState, type FormEvent } from 'react'
import { ArrowLeft, LockKeyhole, ShoppingBag } from 'lucide-react'

import { Brand } from '@/components/brand'
import { useCart } from '@/components/cart-provider'
import { money } from '@/lib/money'

const inputClass =
  'mt-2 w-full rounded-2xl border border-[#351522]/15 bg-white px-4 py-3.5 text-sm outline-none transition focus:border-[#b70b4c] focus:ring-2 focus:ring-[#b70b4c]/10'

export function CheckoutForm({
  initialName,
  initialEmail,
  deliveryFee,
}: {
  initialName: string
  initialEmail: string
  deliveryFee: number
}) {
  const router = useRouter()
  const { cart, hydrated, subtotal, clearCart } = useCart()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    customerName: initialName,
    email: initialEmail,
    phone: '',
    deliveryAddress: '',
    deliveryArea: '',
    paymentMethod: 'Bank Transfer' as const,
    notes: '',
  })
  const total = useMemo(() => subtotal + deliveryFee, [subtotal, deliveryFee])

  function update(name: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [name]: value }))
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!cart.length || submitting) return
    setSubmitting(true)
    setError('')

    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          items: cart.map((item) => ({
            productId: item.product.id,
            quantity: item.quantity,
          })),
        }),
      })
      const result = (await response.json()) as {
        reference?: string
        emailSent?: boolean
        error?: string
      }

      if (!response.ok || !result.reference) {
        throw new Error(result.error ?? 'Unable to place the order.')
      }

      clearCart()
      router.push(
        `/order-success?reference=${encodeURIComponent(result.reference)}&email=${result.emailSent ? 'sent' : 'pending'}`,
      )
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to place the order.')
      setSubmitting(false)
    }
  }

  if (!hydrated) {
    return <main className="min-h-screen bg-[#fffaf5]" aria-busy="true" />
  }

  if (!cart.length) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#fffaf5] px-6 text-[#351522]">
        <div className="max-w-md text-center">
          <ShoppingBag className="mx-auto text-[#b70b4c]" size={38} strokeWidth={1.4} />
          <h1 className="mt-5 text-4xl font-semibold tracking-[-0.04em]">Your cart is empty</h1>
          <p className="mt-3 text-sm leading-6 text-[#351522]/60">Choose at least one VieZobo drink before checking out.</p>
          <Link href="/#drinks" className="mt-7 inline-flex rounded-full bg-[#f22b86] px-7 py-4 text-sm font-bold text-white">Browse drinks</Link>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#fffaf5] text-[#351522]">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6 lg:px-10">
        <Brand />
        <Link href="/" className="flex items-center gap-2 text-sm font-semibold text-[#351522]/65"><ArrowLeft size={16} /> Back to shop</Link>
      </header>

      <div className="mx-auto grid max-w-6xl gap-10 px-6 pb-20 pt-5 lg:grid-cols-[1.15fr_0.85fr] lg:px-10">
        <section>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#b70b4c]">Secure checkout</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">Where should we<br />send your order?</h1>
          <form onSubmit={submit} className="mt-10 grid gap-5 sm:grid-cols-2">
            <label className="text-sm font-semibold">Customer name<input className={inputClass} required minLength={2} maxLength={100} autoComplete="name" value={form.customerName} onChange={(event) => update('customerName', event.target.value)} /></label>
            <label className="text-sm font-semibold">Email<input className={inputClass} required type="email" maxLength={254} autoComplete="email" value={form.email} onChange={(event) => update('email', event.target.value)} /></label>
            <label className="text-sm font-semibold">Phone number<input className={inputClass} required minLength={7} maxLength={30} autoComplete="tel" value={form.phone} onChange={(event) => update('phone', event.target.value)} /></label>
            <label className="text-sm font-semibold">Delivery area<input className={inputClass} required minLength={2} maxLength={100} placeholder="e.g. Yaba, Lagos" value={form.deliveryArea} onChange={(event) => update('deliveryArea', event.target.value)} /></label>
            <label className="text-sm font-semibold sm:col-span-2">Delivery address<textarea className={`${inputClass} min-h-28 resize-y`} required minLength={8} maxLength={300} autoComplete="street-address" value={form.deliveryAddress} onChange={(event) => update('deliveryAddress', event.target.value)} /></label>
            <label className="text-sm font-semibold sm:col-span-2">Payment method<select className={inputClass} value={form.paymentMethod} disabled><option>Bank Transfer</option></select><span className="mt-2 block text-xs font-normal text-[#351522]/50">Payment instructions will be confirmed after your order is received.</span></label>
            <label className="text-sm font-semibold sm:col-span-2">Order notes <span className="font-normal text-[#351522]/45">(optional)</span><textarea className={`${inputClass} min-h-24 resize-y`} maxLength={500} placeholder="Anything we should know about your order?" value={form.notes} onChange={(event) => update('notes', event.target.value)} /></label>

            {error && <div role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700 sm:col-span-2">{error}</div>}
            <button disabled={submitting} className="flex w-full items-center justify-center gap-2 rounded-full bg-[#f22b86] py-4 text-sm font-bold text-white disabled:cursor-wait disabled:opacity-60 sm:col-span-2"><LockKeyhole size={16} />{submitting ? 'Placing your order…' : `Place order · ${money(total)}`}</button>
          </form>
        </section>

        <aside className="h-fit rounded-[28px] bg-[#f8ede8] p-6 sm:p-8 lg:sticky lg:top-8">
          <h2 className="text-2xl font-semibold">Order summary</h2>
          <div className="mt-6 space-y-5">
            {cart.map(({ product, quantity }) => (
              <div key={product.id} className="flex gap-4">
                <img src={product.image_url} alt="" className="size-16 rounded-xl object-cover" />
                <div className="min-w-0 flex-1"><p className="truncate font-semibold">{product.name}</p><p className="mt-1 text-xs text-[#351522]/55">{product.size} · Qty {quantity}</p></div>
                <strong className="text-sm">{money(product.price * quantity)}</strong>
              </div>
            ))}
          </div>
          <div className="mt-7 space-y-3 border-t border-[#351522]/10 pt-6 text-sm"><div className="flex justify-between"><span className="text-[#351522]/55">Subtotal</span><span>{money(subtotal)}</span></div><div className="flex justify-between"><span className="text-[#351522]/55">Delivery fee</span><span>{money(deliveryFee)}</span></div><div className="flex justify-between border-t border-[#351522]/10 pt-4 text-base"><strong>Total</strong><strong>{money(total)}</strong></div></div>
          <p className="mt-5 text-xs leading-5 text-[#351522]/50">Your final price is recalculated securely from the shop database when you place the order.</p>
        </aside>
      </div>
    </main>
  )
}
