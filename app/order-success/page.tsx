import Link from 'next/link'
import { Check } from 'lucide-react'
import { notFound, redirect } from 'next/navigation'

import { Brand } from '@/components/brand'
import { money } from '@/lib/money'
import { hasSupabaseEnv } from '@/lib/supabase/config'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function OrderSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ reference?: string; email?: string }>
}) {
  const query = await searchParams
  const reference = query.reference?.trim()
  if (!reference || !/^VZ-[A-Z0-9]{8}$/.test(reference)) notFound()
  if (!hasSupabaseEnv()) redirect('/')

  const supabase = await createClient()
  const { data: authData } = await supabase.auth.getUser()
  if (!authData.user) redirect(`/auth/signin?next=/order-success?reference=${reference}`)

  const { data: order } = await supabase
    .from('orders')
    .select('order_reference,email,total')
    .eq('order_reference', reference)
    .single()

  if (!order) notFound()

  return (
    <main className="min-h-screen bg-[#fffaf5] px-6 text-[#351522]">
      <header className="mx-auto flex max-w-6xl items-center py-6"><Brand /></header>
      <section className="mx-auto mt-10 max-w-xl rounded-[32px] bg-white p-8 text-center shadow-[0_25px_70px_-45px_#351522] sm:p-12">
        <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-[#dce8d6] text-[#079a50]"><Check size={30} /></div>
        <p className="mt-7 text-xs font-bold uppercase tracking-[0.2em] text-[#b70b4c]">Order received</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-[-0.04em]">Thank you for<br />your order.</h1>
        <div className="mt-8 rounded-2xl bg-[#f8ede8] p-5 text-left text-sm">
          <div className="flex justify-between gap-4"><span className="text-[#351522]/55">Order reference</span><strong>{order.order_reference}</strong></div>
          <div className="mt-3 flex justify-between gap-4"><span className="text-[#351522]/55">Customer email</span><strong className="truncate">{order.email}</strong></div>
          <div className="mt-3 flex justify-between gap-4"><span className="text-[#351522]/55">Total</span><strong>{money(order.total)}</strong></div>
        </div>
        <p className="mt-6 text-sm leading-6 text-[#351522]/60">
          {query.email === 'sent'
            ? `A confirmation email has been sent to ${order.email}.`
            : `Your order is saved. Email delivery is pending; keep reference ${order.order_reference} for your records.`}
        </p>
        <Link href="/#drinks" className="mt-8 inline-flex w-full items-center justify-center rounded-full bg-[#f22b86] py-4 text-sm font-bold text-white">Continue shopping</Link>
      </section>
    </main>
  )
}
