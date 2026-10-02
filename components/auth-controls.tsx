import Link from 'next/link'

import type { AuthUser } from '@/types/shop'

export function AuthControls({ user }: { user: AuthUser | null }) {
  if (!user) {
    return (
      <Link
        href="/auth/signin?next=/"
        className="hidden rounded-full px-4 py-2 text-sm font-semibold transition-colors hover:bg-[#f5e8df] sm:block"
      >
        Sign in
      </Link>
    )
  }

  return (
    <div className="hidden items-center gap-3 sm:flex">
      {user.avatarUrl ? (
        <img
          src={user.avatarUrl}
          alt=""
          referrerPolicy="no-referrer"
          className="size-8 rounded-full object-cover"
        />
      ) : null}
      <div className="max-w-32">
        <p className="truncate text-xs font-semibold">{user.name ?? user.email}</p>
        <form action="/auth/signout" method="post">
          <button className="text-[11px] text-[#351522]/55 underline">Sign out</button>
        </form>
      </div>
    </div>
  )
}
