'use client'

import { useEffect } from 'react'

function tampak(el: HTMLElement) {
  if (el.getAttribute('aria-hidden') === 'true') return false
  const st = window.getComputedStyle(el)
  if (st.display === 'none' || st.visibility === 'hidden') return false
  if (el.offsetParent === null && st.position !== 'fixed' && st.position !== 'sticky') return false
  return true
}

function isIsian(el: Element | null): el is HTMLInputElement | HTMLSelectElement {
  if (!el || !(el instanceof HTMLElement) || !tampak(el)) return false
  if (el instanceof HTMLSelectElement) return !el.disabled
  if (!(el instanceof HTMLInputElement)) return false
  if (el.disabled || el.readOnly) return false
  const t = (el.type || 'text').toLowerCase()
  if (['checkbox', 'radio', 'file', 'hidden', 'button', 'submit', 'reset', 'color', 'range'].includes(t)) return false
  return true
}

function lingkup(from: HTMLElement) {
  return (from.closest('form') || from.closest('[data-enter-root]') || document.body) as HTMLElement
}

function daftarIsian(from: HTMLElement) {
  return Array.from(lingkup(from).querySelectorAll('input, select')).filter(isIsian)
}

function tombolSimpan(from: HTMLElement): HTMLElement | null {
  const root = lingkup(from)
  const marked = root.querySelector<HTMLElement>('[data-save]')
  if (marked && tampak(marked) && !(marked as HTMLButtonElement).disabled) return marked
  const form = from.closest('form')
  if (form) {
    const s = form.querySelector<HTMLElement>('button[type="submit"], input[type="submit"]')
    if (s && tampak(s) && !(s as HTMLButtonElement).disabled) return s
  }
  const buttons = Array.from(root.querySelectorAll('button, input[type="submit"]')) as HTMLElement[]
  const hit = buttons.find((b) => {
    if (!tampak(b) || (b as HTMLButtonElement).disabled) return false
    const teks = `${b.textContent || ''} ${(b as HTMLInputElement).value || ''} ${b.getAttribute('aria-label') || ''}`
    return /simpan|\bsave\b|\bok\b/i.test(teks)
  })
  return hit || null
}

export default function FormKeys() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.isComposing) return
      const t = e.target as HTMLElement | null
      if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
        e.preventDefault()
        const from = (t && t instanceof HTMLElement) ? t : document.body
        const btn = tombolSimpan(from)
        if (btn) btn.click()
        else from.closest('form')?.requestSubmit()
        return
      }
      if (e.key !== 'Enter' || e.shiftKey || e.ctrlKey || e.altKey || e.metaKey) return
      if (!t || !isIsian(t)) return
      e.preventDefault()
      const list = daftarIsian(t)
      const i = list.indexOf(t as HTMLInputElement)
      if (i >= 0 && i < list.length - 1) {
        const n = list[i + 1]
        n.focus()
        if (n instanceof HTMLInputElement) n.select()
        return
      }
      const btn = tombolSimpan(t)
      if (btn) btn.click()
      else t.closest('form')?.requestSubmit()
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [])
  return null
}
