'use client'
import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Pull down from the top of the page to reload every card.
 *
 * Written against touch events rather than a library, because the gesture has to
 * share the screen with the city carousel: a drag that starts sideways belongs to
 * that, and only a drag that is clearly downward from a page already at the top
 * becomes a refresh.
 */

type Props = {
  onRefresh: () => Promise<void>
}

/** How far the finger must travel before letting go actually refreshes. */
const TRIGGER = 72

/** The furthest the indicator travels, however hard the page is pulled. */
const MAX_PULL = 110

/** Travel is divided by this, so the sheet follows the finger without keeping pace. */
const RESISTANCE = 2.2

/** A drag is only a pull once it is this much more vertical than horizontal. */
const DIRECTION_BIAS = 1.4

export default function PullToRefresh({ onRefresh }: Props) {
  const [pull, setPull] = useState(0)
  const [busy, setBusy] = useState(false)

  const start = useRef<{ x: number; y: number } | null>(null)
  const claimed = useRef(false)
  const busyRef = useRef(false)
  /* Mirrors `pull` for the handlers, which read it outside of a render. */
  const pullRef = useRef(0)

  const setPullTo = useCallback((next: number) => {
    pullRef.current = next
    setPull(next)
  }, [])

  const finish = useCallback(async () => {
    setBusy(true)
    busyRef.current = true
    setPullTo(TRIGGER)
    try {
      await onRefresh()
    } finally {
      setBusy(false)
      busyRef.current = false
      setPullTo(0)
    }
  }, [onRefresh, setPullTo])

  useEffect(() => {
    const onStart = (e: TouchEvent) => {
      if (busyRef.current || window.scrollY > 0 || e.touches.length !== 1) {
        start.current = null
        return
      }
      start.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
      claimed.current = false
    }

    const onMove = (e: TouchEvent) => {
      const from = start.current
      if (!from || busyRef.current) return

      const dy = e.touches[0].clientY - from.y
      const dx = e.touches[0].clientX - from.x

      if (dy <= 0 || window.scrollY > 0) {
        start.current = null
        setPullTo(0)
        return
      }
      if (!claimed.current) {
        // Sideways drags belong to the carousel, so the gesture is left alone.
        if (Math.abs(dx) * DIRECTION_BIAS > dy) { start.current = null; return }
        if (dy < 8) return
        claimed.current = true
      }

      /*
       * The browser's own overscroll would otherwise bounce the page while the
       * sheet is being pulled, and the two moving at once reads as a glitch.
       */
      if (e.cancelable) e.preventDefault()
      setPullTo(Math.min(dy / RESISTANCE, MAX_PULL))
    }

    const onEnd = () => {
      const pulled = claimed.current
      start.current = null
      claimed.current = false
      if (!pulled || busyRef.current) return
      if (pullRef.current >= TRIGGER) void finish()
      else setPullTo(0)
    }

    window.addEventListener('touchstart', onStart, { passive: true })
    window.addEventListener('touchmove', onMove, { passive: false })
    window.addEventListener('touchend', onEnd, { passive: true })
    window.addEventListener('touchcancel', onEnd, { passive: true })
    return () => {
      window.removeEventListener('touchstart', onStart)
      window.removeEventListener('touchmove', onMove)
      window.removeEventListener('touchend', onEnd)
      window.removeEventListener('touchcancel', onEnd)
    }
  }, [finish, setPullTo])

  const ready = pull >= TRIGGER

  return (
    <div
      className="pull-sheet"
      style={{
        transform: `translate(-50%, ${pull}px)`,
        opacity: pull > 4 ? 1 : 0,
        transition: pull === 0 || busy ? 'transform 0.25s ease, opacity 0.25s ease' : 'none',
      }}
      aria-hidden={pull === 0}
    >
      <span
        className={busy ? 'pull-spinner' : undefined}
        style={{ transform: busy ? undefined : `rotate(${pull * 2.6}deg)` }}
      >
        {busy ? '↻' : ready ? '↑' : '↓'}
      </span>
    </div>
  )
}
