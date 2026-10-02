import { Storefront } from '@/components/storefront'
import { hasSupabaseEnv } from '@/lib/supabase/config'
import { createClient } from '@/lib/supabase/server'
import type { AuthUser, Product } from '@/types/shop'

export const dynamic = 'force-dynamic'

export default async function Page() {
  let products: Product[] = []
  let user: AuthUser | null = null
  let setupError = false

  if (hasSupabaseEnv()) {
    const supabase = await createClient()
    const [{ data: productRows, error }, { data: authData }] = await Promise.all([
      supabase
        .from('products')
        .select('id,name,description,size,price,image_url,stock_status,created_at')
        .order('created_at'),
      supabase.auth.getUser(),
    ])

    if (error) setupError = true
    products = (productRows ?? []) as Product[]

    if (authData.user) {
      user = {
        name:
          authData.user.user_metadata.full_name ??
          authData.user.user_metadata.name ??
          null,
        email: authData.user.email ?? null,
        avatarUrl:
          authData.user.user_metadata.avatar_url ??
          authData.user.user_metadata.picture ??
          null,
      }
    }
  } else {
    setupError = true
  }

  return <Storefront products={products} user={user} setupError={setupError} />
}
