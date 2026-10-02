'use client'

import Link from 'next/link'
import { useState } from 'react'
import { ArrowRight, Check, Minus, Plus, ShoppingBag, Sparkles, Truck, X } from 'lucide-react'

import { AuthControls } from '@/components/auth-controls'
import { Brand } from '@/components/brand'
import { useCart } from '@/components/cart-provider'
import { money } from '@/lib/money'
import type { AuthUser, Product } from '@/types/shop'

const cardStyles = [
  { color: 'bg-[#f3d5dc]', tag: 'Signature' },
  { color: 'bg-[#f6dfc5]', tag: 'Tropical' },
  { color: 'bg-[#dce8d6]', tag: 'Spiced' },
]

export function Storefront({
  products,
  user,
  setupError,
}: {
  products: Product[]
  user: AuthUser | null
  setupError: boolean
}) {
  const [cartOpen, setCartOpen] = useState(false)
  const { cart, itemCount, subtotal, addToCart, updateQuantity, removeFromCart } = useCart()

  function addProduct(product: Product) {
    addToCart(product)
    setCartOpen(true)
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#fffaf5] text-[#351522]">
      <div className="bg-[#351522] px-6 py-2.5 text-center text-[11px] font-medium tracking-[0.18em] text-[#fffaf5]">
        FRESHLY PREPARED VIEZOBO DRINKS
      </div>
      <header className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6 lg:px-10">
        <Brand />
        <nav className="hidden items-center gap-9 text-sm font-medium md:flex" aria-label="Main navigation">
          <a className="text-[#b70b4c]" href="#top">Home</a>
          <a href="#drinks" className="transition-colors hover:text-[#b70b4c]">Our drinks</a>
          <a href="#story" className="transition-colors hover:text-[#b70b4c]">Our story</a>
          <a href="#delivery" className="transition-colors hover:text-[#b70b4c]">Delivery</a>
        </nav>
        <div className="flex items-center gap-3">
          <AuthControls user={user} />
          <button
            onClick={() => setCartOpen(true)}
            className="relative flex size-11 items-center justify-center rounded-full border border-[#351522]/15 transition-colors hover:bg-[#f5e8df]"
            aria-label={`Open cart with ${itemCount} items`}
          >
            <ShoppingBag size={18} strokeWidth={1.8} />
            {itemCount > 0 && <span className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-[#f22b86] text-[10px] font-bold text-white">{itemCount}</span>}
          </button>
        </div>
      </header>

      <section id="top" className="mx-auto grid max-w-7xl items-center gap-10 px-6 pb-20 pt-8 lg:grid-cols-[0.88fr_1.12fr] lg:px-10 lg:pb-28 lg:pt-12">
        <div className="max-w-xl">
          <div className="mb-7 flex items-center gap-3 text-xs font-bold uppercase tracking-[0.2em] text-[#079a50]"><span className="h-px w-9 bg-[#079a50]" />Made for everyday refreshment</div>
          <h1 className="max-w-lg text-6xl font-semibold leading-[0.96] tracking-[-0.055em] text-[#351522] sm:text-7xl lg:text-[88px]">
            Refreshment,<br /><em className="font-serif font-normal text-[#b70b4c]">thoughtfully</em> made.
          </h1>
          <p className="mt-7 max-w-md text-lg leading-8 text-[#351522]/65">Freshly prepared zobo made with hibiscus, fruit and spices, bottled with care in Lagos.</p>
          <div className="mt-9 flex flex-wrap items-center gap-4">
            <a href="#drinks" className="flex items-center gap-3 rounded-full bg-[#f22b86] px-7 py-4 text-sm font-bold text-white shadow-[0_12px_25px_-12px_#f22b86] transition-transform hover:-translate-y-0.5">Shop our drinks <ArrowRight size={17} /></a>
            <a href="#story" className="flex items-center gap-2 px-3 py-3 text-sm font-semibold underline decoration-[#f5a9c5] decoration-2 underline-offset-8">Our story</a>
          </div>
          <div className="mt-14 flex items-center gap-7 text-xs text-[#351522]/60">
            <div className="flex -space-x-2"><span className="size-8 rounded-full border-2 border-[#fffaf5] bg-[#d9907d]" /><span className="size-8 rounded-full border-2 border-[#fffaf5] bg-[#e5b79c]" /><span className="size-8 rounded-full border-2 border-[#fffaf5] bg-[#9a5b43]" /></div>
            <span><strong className="text-[#351522]">Three distinct blends</strong><br />prepared by VieZobo</span>
          </div>
        </div>
        <div className="relative mx-auto w-full max-w-[620px]">
          <div className="absolute -right-4 top-6 size-24 rounded-full border border-[#f22b86]/25 lg:-right-8 lg:top-10 lg:size-36" />
          <div className="absolute -bottom-5 left-1/4 size-14 rounded-full bg-[#f7941d] lg:size-20" />
          <div className="relative aspect-[1.02] overflow-hidden rounded-[45%_45%_12%_12%/18%_18%_12%_12%] bg-[#f5a9c5]">
            <img src="https://images.unsplash.com/photo-1625772299848-391b6a87d7b3?auto=format&fit=crop&w=1200&q=90" alt="A refreshing red hibiscus drink" className="h-full w-full object-cover mix-blend-multiply opacity-90" />
            <div className="absolute inset-0 bg-gradient-to-tr from-[#b70b4c]/25 to-transparent" />
          </div>
          <div className="absolute bottom-7 left-5 rounded-2xl bg-[#fffaf5]/90 px-4 py-3 shadow-lg backdrop-blur-sm lg:bottom-10 lg:left-8">
            <div className="flex items-center gap-2 text-xs font-bold"><span className="size-2 rounded-full bg-[#079a50]" />Small-batch drinks</div>
            <p className="mt-1 text-[11px] text-[#351522]/60">Hibiscus, fruit and spice blends</p>
          </div>
        </div>
      </section>

      <section id="drinks" className="bg-[#f8ede8] px-6 py-20 lg:px-10 lg:py-28">
        <div className="mx-auto max-w-7xl">
          <div className="mb-12 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div><p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-[#b70b4c]">Pick your pleasure</p><h2 className="text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">Our drinks</h2></div>
            <p className="max-w-xs text-sm leading-6 text-[#351522]/60">Explore the VieZobo range and choose the blend that suits your taste.</p>
          </div>
          {setupError ? (
            <div className="rounded-[24px] border border-[#b70b4c]/15 bg-[#fffaf5] p-8 text-center"><h3 className="text-xl font-semibold">The shop is being stocked.</h3><p className="mt-2 text-sm text-[#351522]/60">Complete the Supabase setup in the README, then refresh this page.</p></div>
          ) : products.length === 0 ? (
            <div className="rounded-[24px] bg-[#fffaf5] p-8 text-center text-sm text-[#351522]/60">No drinks are available right now. Please check back soon.</div>
          ) : (
            <div className="grid gap-5 md:grid-cols-3">
              {products.map((product, index) => {
                const style = cardStyles[index % cardStyles.length]
                return (
                  <article key={product.id} className="group overflow-hidden rounded-[24px] bg-[#fffaf5]">
                    <div className={`relative aspect-[1.08] overflow-hidden ${style.color}`}>
                      <img src={product.image_url} alt={product.name} className="h-full w-full object-cover mix-blend-multiply transition-transform duration-500 group-hover:scale-105" />
                      <span className="absolute left-4 top-4 rounded-full bg-[#fffaf5]/85 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[#b70b4c]">{style.tag}</span>
                    </div>
                    <div className="p-5">
                      <div className="flex items-start justify-between gap-3"><div><h3 className="text-xl font-semibold">{product.name}</h3><p className="mt-1 max-w-[230px] text-sm leading-5 text-[#351522]/55">{product.description}</p></div><p className="whitespace-nowrap text-sm font-bold">{money(product.price)}</p></div>
                      <div className="mt-5 flex items-center justify-between border-t border-[#351522]/10 pt-4">
                        <span className="text-xs text-[#351522]/50">{product.size} · <span className={product.stock_status ? 'text-[#079a50]' : 'text-[#b70b4c]'}>{product.stock_status ? 'In stock' : 'Unavailable'}</span></span>
                        <button onClick={() => addProduct(product)} disabled={!product.stock_status} className="flex items-center gap-2 rounded-full bg-[#351522] px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-[#b70b4c] disabled:cursor-not-allowed disabled:opacity-40">Add to cart <Plus size={14} /></button>
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </div>
      </section>

      <section id="story" className="mx-auto grid max-w-7xl items-center gap-14 px-6 py-20 lg:grid-cols-2 lg:px-10 lg:py-28">
        <div className="relative order-2 lg:order-1">
          <div className="aspect-[0.88] overflow-hidden rounded-[30px] bg-[#dce8d6]"><img src="https://images.unsplash.com/photo-1544145945-f90425340c7e?auto=format&fit=crop&w=900&q=85" alt="A bottle of a refreshing drink" className="h-full w-full object-cover mix-blend-multiply" /></div>
          <div className="absolute -bottom-6 -right-3 rounded-2xl bg-[#f7941d] px-5 py-4 text-sm font-bold text-[#351522] shadow-lg lg:-right-8">Familiar flavours,<br />a fresh perspective.</div>
        </div>
        <div className="order-1 max-w-lg lg:order-2">
          <p className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-[#079a50]">A little about us</p>
          <h2 className="text-4xl font-semibold leading-tight tracking-[-0.04em] sm:text-5xl">Zobo is more<br />than a drink.</h2>
          <p className="mt-6 text-base leading-8 text-[#351522]/65">VieZobo brings a fresh perspective to a Nigerian classic. Our drinks combine hibiscus with fruit and spice flavours for a memorable everyday refreshment.</p>
          <a href="#delivery" className="mt-8 inline-flex items-center gap-2 text-sm font-bold text-[#b70b4c]">Discover VieZobo <ArrowRight size={16} /></a>
        </div>
      </section>

      <section id="delivery" className="bg-[#b70b4c] px-6 py-16 text-[#fffaf5] lg:px-10 lg:py-20">
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.7fr_1.3fr] lg:items-center">
          <div><p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-[#f5a9c5]">Why VieZobo?</p><h2 className="max-w-sm text-4xl font-semibold leading-tight tracking-[-0.04em] sm:text-5xl">Little bottles,<br />big joy.</h2></div>
          <div className="grid gap-8 sm:grid-cols-3">
            <div><Sparkles className="mb-5" size={25} /><h3 className="font-semibold">Prepared in batches</h3><p className="mt-2 text-sm leading-6 text-white/65">Each VieZobo batch is carefully prepared and bottled.</p></div>
            <div><Check className="mb-5" size={25} /><h3 className="font-semibold">Distinct blends</h3><p className="mt-2 text-sm leading-6 text-white/65">Choose classic, pineapple or ginger-forward flavours.</p></div>
            <div><Truck className="mb-5" size={25} /><h3 className="font-semibold">Order online</h3><p className="mt-2 text-sm leading-6 text-white/65">Enter your delivery details during checkout to place an order.</p></div>
          </div>
        </div>
      </section>

      <footer className="mx-auto flex max-w-7xl flex-col gap-8 px-6 py-10 text-sm lg:flex-row lg:items-center lg:justify-between lg:px-10">
        <div className="flex items-center gap-3"><Brand compact /><p className="text-xs text-[#351522]/55">Joy in a bottle.</p></div>
        <div className="flex flex-wrap gap-x-7 gap-y-3 text-xs text-[#351522]/60"><a href="mailto:hello@viezobo.com">hello@viezobo.com</a><a href="https://wa.me/2348000000000">WhatsApp us</a><span>© {new Date().getFullYear()} VieZobo</span></div>
      </footer>

      {cartOpen && (
        <div className="fixed inset-0 z-50">
          <button className="absolute inset-0 bg-[#351522]/35 backdrop-blur-sm" onClick={() => setCartOpen(false)} aria-label="Close cart" />
          <aside className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-[#fffaf5] p-6 shadow-2xl sm:p-8">
            <div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-[#b70b4c]">Your selection</p><h2 className="mt-1 text-3xl font-semibold">Your cart <span className="text-[#351522]/35">({itemCount})</span></h2></div><button onClick={() => setCartOpen(false)} className="flex size-10 items-center justify-center rounded-full border border-[#351522]/10" aria-label="Close cart"><X size={18} /></button></div>
            {cart.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center text-center"><ShoppingBag size={35} strokeWidth={1.3} className="mb-5 text-[#b70b4c]" /><h3 className="text-xl font-semibold">Your cart is empty</h3><p className="mt-2 text-sm text-[#351522]/55">Add a bottle of joy to get started.</p><button onClick={() => setCartOpen(false)} className="mt-6 rounded-full bg-[#f22b86] px-6 py-3 text-sm font-bold text-white">Explore drinks</button></div>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto py-8">
                  {cart.map(({ product, quantity }) => (
                    <div key={product.id} className="mb-5 flex gap-4">
                      <img src={product.image_url} alt="" className="size-20 rounded-xl object-cover" />
                      <div className="flex-1"><div className="flex justify-between gap-3"><h3 className="font-semibold">{product.name}</h3><button onClick={() => removeFromCart(product.id)} className="text-xs text-[#351522]/40 underline">Remove</button></div><p className="mt-1 text-sm text-[#351522]/55">{money(product.price)}</p><div className="mt-3 flex w-fit items-center gap-3 rounded-full border border-[#351522]/15 px-2 py-1"><button onClick={() => updateQuantity(product.id, -1)} aria-label="Decrease quantity"><Minus size={13} /></button><span className="w-4 text-center text-xs font-bold">{quantity}</span><button onClick={() => updateQuantity(product.id, 1)} aria-label="Increase quantity"><Plus size={13} /></button></div></div>
                    </div>
                  ))}
                </div>
                <div className="border-t border-[#351522]/10 pt-5"><div className="flex justify-between text-sm"><span className="text-[#351522]/55">Subtotal</span><strong>{money(subtotal)}</strong></div><p className="mt-2 text-xs text-[#351522]/45">Delivery fee calculated at checkout.</p><Link href={user ? '/checkout' : '/auth/signin?next=/checkout'} onClick={() => setCartOpen(false)} className="mt-5 flex w-full items-center justify-center rounded-full bg-[#f22b86] py-4 text-sm font-bold text-white">{user ? 'Continue to checkout' : 'Sign in to checkout'} <ArrowRight size={16} className="ml-2" /></Link></div>
              </>
            )}
          </aside>
        </div>
      )}
    </main>
  )
}
