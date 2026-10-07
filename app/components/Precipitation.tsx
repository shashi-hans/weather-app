'use client'
import { useEffect, useRef } from 'react'
import type { Scene, Weight } from '../lib/sky'

/**
 * Rain and snow, drawn on a canvas across the whole window.
 *
 * A canvas rather than elements because the density is the point: rain that reads as
 * rain needs hundreds of streaks, and hundreds of DOM nodes each carrying their own
 * animation cost frames on a phone. One canvas draws the lot in a single pass.
 *
 * Rain falls straight down. Snow drifts, because a flake is light enough for the air
 * to carry it and a reader expects to see that.
 */

type Props = {
  scene: Scene
  weight: Weight
  /** Pauses the loop when the page is not the one being looked at. */
  active: boolean
  /**
   * Written to, not read: how brightly the cloud should be lit by lightning right
   * now, 0 to 1. The shader reads the same object each frame, which keeps the two
   * canvases in step without pushing a value through React sixty times a second.
   */
  flash?: { current: number }
}

type Drop = { x: number; y: number; len: number; speed: number; width: number; alpha: number }
type Bolt = {
  points: Array<{ x: number; y: number }>
  forks: Array<Array<{ x: number; y: number }>>
  struck: number
}
type Flake = { x: number; y: number; r: number; speed: number; sway: number; phase: number; alpha: number }

const RAIN_COUNT: Record<Weight, number> = { drizzle: 170, light: 50, medium: 190, heavy: 760 }
const SNOW_COUNT: Record<Weight, number> = { drizzle: 70, light: 70, medium: 140, heavy: 240 }

/** Milliseconds the stroke burns at full strength before it starts to cool. */
const STRIKE_MS = 70

/** Milliseconds the stroke and the light it casts take to fade away. */
const FADE_MS = 900

/** Seconds for a flake to swing from one side of its path to the other and back. */
const SWAY_PERIOD = 17

/**
 * Seconds for the fall to go from its lightest to its heaviest and back. Real rain
 * comes in and eases off over minutes; a constant stream is the thing that gives a
 * loop away once someone has watched it for a while.
 */
const SWELL_PERIOD = 95

/** The share of the particles still falling at the lightest point of the swell. */
const SWELL_FLOOR = 0.45

function prefersStill(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export default function Precipitation({ scene, weight, active, flash }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const falling = scene === 'rain' || scene === 'storm' || scene === 'snow'
    if (!falling) {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      // Cleared as well, or a storm left mid-fade keeps the cloud lit for ever.
      if (flash) flash.current = 0
      return
    }

    let width = 0
    let height = 0
    let drops: Drop[] = []
    let flakes: Flake[] = []

    /*
     * Capped at 2, because a canvas this size at a phone's full device ratio costs
     * more to fill than the extra sharpness is worth on particles this small.
     */
    const ratio = Math.min(window.devicePixelRatio || 1, 2)

    const isSnow = scene === 'snow'
    const count = isSnow ? SNOW_COUNT[weight] : RAIN_COUNT[weight]

    function seed() {
      drops = []
      flakes = []
      for (let i = 0; i < count; i++) {
        // depth 0 is far and faint, 1 is near, fast and bright.
        const depth = Math.random()
        if (isSnow) {
          flakes.push({
            x: Math.random() * width,
            y: Math.random() * height,
            r: 0.8 + depth * 2.6,
            speed: 14 + depth * 42,
            sway: 8 + depth * 26,
            phase: Math.random() * Math.PI * 2,
            alpha: 0.25 + depth * 0.65,
          })
        } else {
          /*
           * Drizzle is many small drops that hang in the air; heavy rain is fewer,
           * far bigger ones coming down hard. Size and speed carry that difference,
           * not the count alone.
           */
          const fine = weight === 'drizzle'
          const hard = weight === 'heavy'
          drops.push({
            x: Math.random() * width,
            y: Math.random() * height,
            // Droplets, so the length is the drop's own height rather than a streak.
            // Heavy rain is more drops falling faster, not bigger ones: past a
            // certain size a drop reads as a blob rather than as water.
            len: 1.0 + depth * 1.5,
            speed: fine ? 70 + depth * 110 : hard ? 260 + depth * 520 : 150 + depth * 300,
            width: 0.45 + depth * 0.35,
            alpha: fine ? 0.2 + depth * 0.35 : 0.3 + depth * 0.6,
          })
        }
      }
    }

    /*
     * Sized from the panel it sits in rather than from the window, and watched,
     * because the panel changes height as a card loads or a note appears above it.
     */
    function resize() {
      const box = canvas!.parentElement ?? canvas!
      const next = { w: box.clientWidth, h: box.clientHeight }
      if (next.w === width && next.h === height) return
      width = next.w
      height = next.h
      canvas!.width = Math.max(1, Math.floor(width * ratio))
      canvas!.height = Math.max(1, Math.floor(height * ratio))
      ctx!.setTransform(ratio, 0, 0, ratio, 0, 0)
      seed()
    }

    resize()

    const observer = new ResizeObserver(resize)
    if (canvas.parentElement) observer.observe(canvas.parentElement)

    let raf = 0
    let last = performance.now()
    let elapsed = 0

    /*
     * Lightning is a drawn stroke rather than the whole sky going white. A flash with
     * no bolt in it reads as the screen glitching; the bolt is what says storm.
     */
    let bolt: Bolt | null = null
    let nextBolt = performance.now() + 1200

    function makeBolt(now: number): Bolt {
      const step = height / 9
      const points = [{ x: width * (0.15 + Math.random() * 0.7), y: -6 }]
      for (let i = 1; i <= 9; i++) {
        const prev = points[i - 1]
        points.push({ x: prev.x + (Math.random() - 0.5) * width * 0.16, y: i * step })
      }

      /* One or two short branches, which is what gives a bolt its shape. */
      const forks: Array<Array<{ x: number; y: number }>> = []
      for (let f = 0; f < 1 + Math.round(Math.random()); f++) {
        const from = points[3 + Math.floor(Math.random() * 4)]
        const branch = [from]
        for (let i = 1; i <= 3; i++) {
          const prev = branch[i - 1]
          branch.push({
            x: prev.x + (Math.random() - 0.5) * width * 0.2,
            y: prev.y + step * 0.7,
          })
        }
        forks.push(branch)
      }
      return { points, forks, struck: now }
    }

    function trace(path: Array<{ x: number; y: number }>, lineWidth: number) {
      ctx!.lineWidth = lineWidth
      ctx!.beginPath()
      ctx!.moveTo(path[0].x, path[0].y)
      for (let i = 1; i < path.length; i++) ctx!.lineTo(path[i].x, path[i].y)
      ctx!.stroke()
    }

    function drawBolt(now: number) {
      if (scene !== 'storm') {
        if (flash) flash.current = 0
        return
      }
      if (!bolt && now >= nextBolt) {
        bolt = makeBolt(now)
        nextBolt = now + 1800 + Math.random() * 500
      }
      if (!bolt) {
        if (flash) flash.current = 0
        return
      }

      /*
       * Full for the strike itself, then fading over the rest of a second. A stroke
       * that vanishes on a fixed frame reads as a dropped frame; real lightning
       * leaves the channel glowing as it cools.
       */
      const age = now - bolt.struck
      const life = age < STRIKE_MS ? 1 : 1 - (age - STRIKE_MS) / FADE_MS
      if (life <= 0) {
        bolt = null
        if (flash) flash.current = 0
        return
      }

      // The cloud is lit by the bolt, which is what a flash actually is.
      if (flash) flash.current = life * life

      ctx!.save()
      ctx!.globalAlpha = life
      ctx!.lineCap = 'round'
      ctx!.lineJoin = 'round'
      ctx!.strokeStyle = 'rgba(190, 214, 255, 0.55)'
      ctx!.shadowColor = 'rgba(200, 220, 255, 0.9)'
      ctx!.shadowBlur = 24
      trace(bolt.points, 7)
      for (const fork of bolt.forks) trace(fork, 4)
      // The core, drawn over its own glow so the strike has a hot centre.
      ctx!.shadowBlur = 8
      ctx!.strokeStyle = '#fff'
      trace(bolt.points, 2.2)
      for (const fork of bolt.forks) trace(fork, 1.2)
      ctx!.restore()
    }

    function frame(now: number) {
      // Clamped, so a tab that was parked does not teleport every particle on return.
      const dt = Math.min((now - last) / 1000, 0.05)
      last = now
      elapsed += dt

      /* Only snow drifts. Rain falls straight down, whatever it is doing outside. */
      const sway = Math.sin((elapsed / SWAY_PERIOD) * Math.PI * 2) * 40

      /*
       * The two cycles are deliberately out of step with each other, so the fall does
       * not return to the same state on a period anyone can pick out.
       */
      const swellPhase = (Math.sin((elapsed / SWELL_PERIOD) * Math.PI * 2) + 1) / 2
      const falling = SWELL_FLOOR + (1 - SWELL_FLOOR) * swellPhase

      ctx!.clearRect(0, 0, width, height)

      /*
       * The swell is applied by holding back the tail of the list rather than by
       * fading everything, so the drops still falling stay at full strength and the
       * rain thins out instead of going see-through.
       */
      const shown = Math.round((isSnow ? flakes.length : drops.length) * falling)

      if (isSnow) {
        ctx!.fillStyle = '#fff'
        for (let i = 0; i < shown; i++) {
          const f = flakes[i]
          f.y += f.speed * dt
          f.phase += dt * 0.8
          f.x += (sway * 0.5 + Math.sin(f.phase) * f.sway) * dt
          if (f.y - f.r > height) { f.y = -f.r; f.x = Math.random() * width }
          if (f.x < -10) f.x = width + 10
          if (f.x > width + 10) f.x = -10
          ctx!.globalAlpha = f.alpha
          ctx!.beginPath()
          ctx!.arc(f.x, f.y, f.r, 0, Math.PI * 2)
          ctx!.fill()
        }
      } else {
        ctx!.fillStyle = '#fff'
        for (let i = 0; i < shown; i++) {
          const d = drops[i]
          d.y += d.speed * dt
          if (d.y - d.len > height) {
            d.y = -d.len
            d.x = Math.random() * width
          }

          /*
           * A droplet, not a streak: round at the bottom where the water gathers and
           * drawn to a point at the top.
           */
          ctx!.globalAlpha = d.alpha
          ctx!.beginPath()
          ctx!.moveTo(d.x, d.y - d.len)
          ctx!.quadraticCurveTo(d.x + d.width, d.y - d.len * 0.15, d.x + d.width, d.y + d.len * 0.18)
          ctx!.arc(d.x, d.y + d.len * 0.18, d.width, 0, Math.PI)
          ctx!.quadraticCurveTo(d.x - d.width, d.y - d.len * 0.15, d.x, d.y - d.len)
          ctx!.fill()
        }
        drawBolt(now)
      }

      ctx!.globalAlpha = 1
      raf = requestAnimationFrame(frame)
    }

    if (prefersStill()) {
      // One frame, held. The weather is still shown, it simply does not move.
      frame(performance.now())
      cancelAnimationFrame(raf)
      raf = 0
    } else if (active) {
      raf = requestAnimationFrame(frame)
    }

    return () => {
      if (raf) cancelAnimationFrame(raf)
      observer.disconnect()
    }
  }, [scene, weight, active, flash])

  return <canvas ref={canvasRef} className="sky-canvas" aria-hidden="true" />
}
