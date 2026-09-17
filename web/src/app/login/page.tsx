'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Archivo } from 'next/font/google'
import { createClient } from '@/lib/supabase/client'

const archivo = Archivo({ subsets: ['latin'], weight: ['200', '300', '400', '500'] })

const showTestShortcuts = process.env.NODE_ENV !== 'production'

type View = 'form' | 'sent'
type Role = 'member' | 'admin' | null

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [view, setView] = useState<View>('form')
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(false)
  const [role, setRole] = useState<Role>(null)
  const [sentTo, setSentTo] = useState('')

  const roleNote =
    role === 'admin'
      ? 'Admin signs in to the chamber-wide dashboard.'
      : role === 'member'
        ? 'Member signs in to the business Overview.'
        : 'Both roles share this login; the view after sign-in differs.'

  async function handleSubmit() {
    if (loading) return
    setLoading(true)
    setError(false)
    const supabase = createClient()
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (authError) {
      setError(true)
      return
    }
    router.push('/')
    router.refresh()
  }

  async function handleMagic() {
    if (!email) return
    setError(false)
    const supabase = createClient()
    const { error: authError } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false },
    })
    if (authError) {
      setError(true)
      return
    }
    setSentTo(email)
    setView('sent')
  }

  function fillMember() {
    setEmail('owner@baysideprovisions.com')
    setPassword('member-demo')
    setRole('member')
    setError(false)
  }

  function fillAdmin() {
    setEmail('staff@coralgableschamber.org')
    setPassword('admin-demo')
    setRole('admin')
    setError(false)
  }

  return (
    <div
      className={`${archivo.className} min-h-screen box-border bg-[#157779] flex flex-col items-center justify-center gap-[22px] px-[18px] py-10 text-black`}
    >
      <div className="text-center flex flex-col gap-[7px] max-w-[420px]">
        <div className="text-2xl font-light tracking-[-0.01em] text-white">Chamber Intelligence</div>
        <div className="text-[12.5px] font-extralight leading-[1.5] text-[#C7F8FA]">
          See what your reviews say, and reply to them.
        </div>
      </div>

      <div className="w-full max-w-[392px] bg-white rounded-2xl px-[26px] pt-[26px] pb-5 box-border flex flex-col gap-4 shadow-[0_1px_3px_rgba(0,0,0,0.10),0_12px_30px_rgba(0,0,0,0.14)]">
        <div className="flex flex-col gap-[5px]">
          <div className="text-[14.5px] font-medium">Sign in</div>
          <div className="text-[11px] font-extralight text-[#7A9596]">
            Chamber members only. The Chamber does not see or moderate replies.
          </div>
        </div>

        {error && view === 'form' && (
          <div className="flex gap-[9px] items-start bg-[rgba(214,73,102,0.10)] border border-[rgba(214,73,102,0.28)] rounded-[10px] px-3 py-[10px]">
            <div className="shrink-0 w-5 h-5 rounded-[6px] bg-[rgba(214,73,102,0.12)] text-[#A6304A] flex items-center justify-center text-xs">
              !
            </div>
            <div className="text-xs font-extralight leading-[1.45] text-[#A6304A]">
              That email and password do not match an account. Two attempts remain before the account locks.
            </div>
          </div>
        )}

        {view === 'form' && (
          <div className="flex flex-col gap-[13px]">
            <label className="flex flex-col gap-[6px]">
              <span className="text-[9.5px] font-normal tracking-[0.1em] uppercase whitespace-nowrap text-[#10595A]">
                Email
              </span>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  setError(false)
                }}
                placeholder="you@business.com"
                autoComplete="username"
                className="w-full box-border text-[13.5px] font-extralight text-black bg-[#F4FDFD] border border-[#DFF6F7] rounded-[9px] px-3 py-[10px] outline-none focus:border-[#25CED1]"
              />
            </label>
            <label className="flex flex-col gap-[6px]">
              <span className="flex justify-between items-baseline gap-[10px] text-[9.5px] font-normal tracking-[0.1em] uppercase whitespace-nowrap text-[#10595A]">
                <span>Password</span>
                <a href="#" className="text-[9.5px] tracking-[0.08em] text-[#157779]">
                  Forgot password
                </a>
              </span>
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  setError(false)
                }}
                placeholder="••••••••"
                autoComplete="current-password"
                className="w-full box-border text-[13.5px] font-extralight text-black bg-[#F4FDFD] border border-[#DFF6F7] rounded-[9px] px-3 py-[10px] outline-none focus:border-[#25CED1]"
              />
            </label>

            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full whitespace-nowrap shrink-0 text-[13px] font-normal text-white bg-[#157779] rounded-[9px] px-[14px] py-[11px] cursor-pointer hover:bg-[#10595A] disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>

            <div className="flex items-center gap-[10px]">
              <div className="flex-1 h-px bg-[#DFF6F7]" />
              <div className="text-[9.5px] font-normal tracking-[0.1em] uppercase whitespace-nowrap text-[#7A9596]">
                or
              </div>
              <div className="flex-1 h-px bg-[#DFF6F7]" />
            </div>

            <button
              onClick={handleMagic}
              className="w-full whitespace-nowrap shrink-0 text-[13px] font-light text-[#0E7C7E] bg-white border border-[rgba(37,206,209,0.5)] rounded-[9px] px-[14px] py-[10px] cursor-pointer hover:bg-[#F2FCFC]"
            >
              Email me a sign-in code
            </button>
          </div>
        )}

        {view === 'sent' && (
          <div className="flex flex-col gap-3">
            <div className="bg-[#F2FCFC] rounded-[10px] px-[14px] py-[14px]">
              <div className="text-[9.5px] font-normal tracking-[0.1em] uppercase whitespace-nowrap text-[#10595A] mb-[6px]">
                Code sent
              </div>
              <div className="text-[12.5px] font-extralight leading-[1.5]">
                A six-digit code is on its way to {sentTo || email || 'your email'}. It expires in 10 minutes.
              </div>
            </div>
            <button
              onClick={() => {
                setView('form')
                setError(false)
              }}
              className="w-full whitespace-nowrap shrink-0 text-[13px] font-light text-[#0E7C7E] bg-white border border-[rgba(37,206,209,0.5)] rounded-[9px] px-[14px] py-[10px] cursor-pointer hover:bg-[#F2FCFC]"
            >
              ← Back to sign in
            </button>
          </div>
        )}

        {showTestShortcuts && (
          <div className="border-t border-[#DFF6F7] pt-[14px] flex flex-col gap-[9px]">
            <div className="text-[9.5px] font-normal tracking-[0.1em] uppercase whitespace-nowrap text-[#7A9596]">
              Testing shortcuts
            </div>
            <div className="flex gap-[9px]">
              <button
                onClick={fillMember}
                className="flex-1 min-w-0 whitespace-nowrap text-xs font-light text-[#10595A] bg-[rgba(37,206,209,0.14)] border border-[rgba(37,206,209,0.28)] rounded-full px-3 py-2 cursor-pointer flex items-center justify-center gap-[7px] hover:bg-[rgba(37,206,209,0.22)]"
              >
                <span className="w-[6px] h-[6px] rounded-full bg-[#157779] shrink-0" />
                Member
              </button>
              <button
                onClick={fillAdmin}
                className="flex-1 min-w-0 whitespace-nowrap text-xs font-light text-[#6A4BE0] bg-[rgba(122,90,248,0.12)] border border-[rgba(122,90,248,0.28)] rounded-full px-3 py-2 cursor-pointer flex items-center justify-center gap-[7px] hover:bg-[rgba(122,90,248,0.2)]"
              >
                <span className="w-[6px] h-[6px] rounded-full bg-[#6A4BE0] shrink-0" />
                Admin
              </button>
            </div>
            {/* Requires member-demo / admin-demo accounts seeded in Supabase to actually sign in */}
            <div className="text-[11px] font-extralight leading-[1.45] text-[#7A9596]">
              Fills the credentials for that role, then sign in. {roleNote}
            </div>
          </div>
        )}
      </div>

      <div className="text-[11px] font-extralight text-[#C7F8FA] text-center">
        Need access? Contact the Chamber office.
      </div>
    </div>
  )
}
