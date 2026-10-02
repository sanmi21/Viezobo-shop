import { redirect } from 'next/navigation'

import { CheckoutForm } from '@/components/checkout-form'
import { hasSupabaseEnv } from '@/lib/supabase/config'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function CheckoutPage() {
  if (!hasSupabaseEnv()) redirect('/?auth_error=not-configured')

  const supabase = await createClient()
  const { data } = await supabase.auth.getUser()
  if (!data.user) redirect('/auth/signin?next=/checkout')

  const { data: deliveryFee } = await supabase.rpc('get_delivery_fee')

  return (
    <CheckoutForm
      deliveryFee={typeof deliveryFee === 'number' ? deliveryFee : 1500}
      initialName={
        data.user.user_metadata.full_name ?? data.user.user_metadata.name ?? ''
      }
      initialEmail={data.user.email ?? ''}
    />
  )
}
