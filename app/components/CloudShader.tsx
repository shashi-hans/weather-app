'use client'
import { useEffect, useRef } from 'react'

/**
 * Sky and cloud, drawn by a fragment shader.
 *
 * The cloud is domain-warped fractal noise: noise is sampled once to displace the
 * coordinates, and the displaced coordinates are sampled again. That second step is
 * what turns an even field of noise into billows with wisps trailing off them, and
 * it is the difference between cloud and smoke.
 *
 * Shading comes from the field's own vertical gradient. Where the cloud thickens
 * going up it catches light, and where it thins it falls into shadow, so the mass
 * is lit from above without anything being drawn by hand.
 *
 * Reports failure to the caller rather than throwing, so the CSS cloud layers can
 * stand in on a device with no working WebGL.
 */

type Props = {
  /** Top and bottom of the sky, as [r, g, b] in 0..1. */
  skyTop: [number, number, number]
  skyBottom: [number, number, number]
  lit: [number, number, number]
  shadow: [number, number, number]
  /** How much of the sky the cloud fills, 0 to 1. */
  coverage: number
  active: boolean
  /** How brightly lightning is lighting the cloud right now, 0 to 1. */
  flash?: { current: number }
  onFail: () => void
}

const VERTEX = `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`

const FRAGMENT = `
precision highp float;

uniform vec2  uRes;
uniform float uTime;
uniform vec3  uSkyTop;
uniform vec3  uSkyBottom;
uniform vec3  uLit;
uniform vec3  uShadow;
uniform float uCoverage;
uniform float uFlash;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

/* Value noise, smoothed so the lattice the samples sit on cannot be seen. */
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

/* Five octaves: enough for a soft mass with detail on its edges. */
float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p *= 2.02;
    a *= 0.5;
  }
  return v;
}

/*
 * Billowed noise: each octave is folded about its midpoint before being added, which
 * turns the smooth hills of plain noise into rounded heaps with creases between them.
 * That is the shape of cloud. Plain fbm alone gives an even haze.
 */
float billow(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * abs(noise(p) * 2.0 - 1.0);
    p *= 2.03;
    a *= 0.5;
  }
  return 1.0 - v;
}

void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  float aspect = uRes.x / uRes.y;

  /* y measured from the top, so the sky reads the way it is described. */
  float down = 1.0 - uv.y;

  vec3 sky = mix(uSkyTop, uSkyBottom, down);

  /*
   * Squashed hard, because cloud seen from the ground lies in layers: what reads as
   * sky is long horizontal strata, not round heaps stacked up the frame.
   */
  vec2 p = vec2(uv.x * aspect, down * 2.7) * 1.9;

  /* Fast enough to be seen moving within a few seconds of looking at it. */
  vec2 drift = vec2(uTime * 0.045, 0.0);

  /* The warp runs at a third of the drift, so the cloud reshapes as it travels. */
  vec2 warp = drift * 0.34 + vec2(0.0, uTime * 0.006);
  vec2 q = vec2(fbm(p + warp), fbm(p + warp + vec2(5.2, 1.3)));

  /*
   * Light warp only. It tears the edges without stirring the field: the more the
   * coordinates are displaced, the more the heaps smear into each other and the
   * less round each one reads.
   */
  vec2 w = p + 0.85 * q + drift;

  /* Heaps for the body, a finer layer for the torn edges. */
  float body   = billow(w);
  float detail = fbm(w * 2.8);
  float d      = body * 0.9 + detail * 0.1;

  /* The same field a little higher up, for the light. */
  float dAbove = billow(w + vec2(0.0, -0.11)) * 0.9 + detail * 0.1;

  /* More cloud towards the top of the sky, thinning out lower down. */
  float band = smoothstep(1.25, 0.05, down);

  /*
   * The cut is interpolated between a sky with a few heaps and a sky filled by them.
   * Taking it off 1.0 instead left low coverage above everything the field produces,
   * so "few clouds" drew none at all.
   */
  float threshold = mix(0.66, 0.26, uCoverage);

  /*
   * Squared after the ramp, which firms up the middle of a mass while leaving its
   * edge soft. A single smoothstep makes the whole cloud equally hazy.
   */
  /*
   * Strata. A single field of noise fills the sky evenly, which no real sky does:
   * cloud gathers in layers with clearer air between them, and that banding is most
   * of what makes a drawn sky read as one.
   */
  float layers = fbm(vec2(p.x * 0.22, down * 5.0) + drift * 0.25);
  float strata = mix(0.3, 1.0, smoothstep(0.32, 0.62, layers));

  float ramp = smoothstep(threshold, threshold + 0.3, d) * strata;

  /*
   * Faded out entirely as coverage reaches zero. The threshold alone never rises
   * past everything the field produces, so a clear sky kept a few wisps in it.
   */
  float density = ramp * ramp * (3.0 - 2.0 * ramp) * band * smoothstep(0.0, 0.06, uCoverage);

  float light = clamp((d - dAbove) * 4.2, -1.0, 1.0);
  vec3 cloud = mix(uShadow, uLit, clamp(0.5 + light * 0.75, 0.0, 1.0));

  /*
   * Lightning lights the cloud it is inside, brightest where the cloud is thickest.
   * Whitening the whole frame instead is what makes a flash read as a glitch.
   */
  cloud += vec3(0.85, 0.88, 1.0) * uFlash * (0.35 + density * 0.65);
  sky += vec3(0.1, 0.12, 0.16) * uFlash * 0.5;

  vec3 col = mix(sky, min(cloud, vec3(1.0)), density);

  /* A little darker at the corners, which settles the sky behind the page. */
  vec2 fromCentre = uv - 0.5;
  col *= 1.0 - dot(fromCentre, fromCentre) * 0.35;

  gl_FragColor = vec4(col, 1.0);
}
`

function compile(gl: WebGLRenderingContext, type: number, source: string): WebGLShader | null {
  const shader = gl.createShader(type)
  if (!shader) return null
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.warn('Cloud shader failed to compile:', gl.getShaderInfoLog(shader))
    gl.deleteShader(shader)
    return null
  }
  return shader
}

/**
 * Drawn at a fraction of the screen's pixels and scaled up by the browser. Cloud has
 * no hard edge to soften, so the difference cannot be seen, and a full-screen noise
 * shader at a phone's real pixel count is the one thing here that would cost frames.
 */
const RENDER_SCALE = 0.55

export default function CloudShader({ skyTop, skyBottom, lit, shadow, coverage, active, flash, onFail }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  /* Held in refs so a colour change does not tear down and rebuild the GL program. */
  const uniforms = useRef({ skyTop, skyBottom, lit, shadow, coverage })
  uniforms.current = { skyTop, skyBottom, lit, shadow, coverage }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const gl = canvas.getContext('webgl', { alpha: false, antialias: false, depth: false })
    if (!gl) { onFail(); return }

    const vertex = compile(gl, gl.VERTEX_SHADER, VERTEX)
    const fragment = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT)
    const program = vertex && fragment ? gl.createProgram() : null
    if (!vertex || !fragment || !program) { onFail(); return }

    gl.attachShader(program, vertex)
    gl.attachShader(program, fragment)
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.warn('Cloud shader failed to link:', gl.getProgramInfoLog(program))
      onFail()
      return
    }
    gl.useProgram(program)

    const buffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
    const aPos = gl.getAttribLocation(program, 'aPos')
    gl.enableVertexAttribArray(aPos)
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0)

    const loc = {
      res: gl.getUniformLocation(program, 'uRes'),
      time: gl.getUniformLocation(program, 'uTime'),
      skyTop: gl.getUniformLocation(program, 'uSkyTop'),
      skyBottom: gl.getUniformLocation(program, 'uSkyBottom'),
      lit: gl.getUniformLocation(program, 'uLit'),
      shadow: gl.getUniformLocation(program, 'uShadow'),
      coverage: gl.getUniformLocation(program, 'uCoverage'),
      flash: gl.getUniformLocation(program, 'uFlash'),
    }

    let width = 0
    let height = 0

    function resize() {
      const box = canvas!.parentElement ?? canvas!
      const w = Math.max(1, Math.floor(box.clientWidth * RENDER_SCALE))
      const h = Math.max(1, Math.floor(box.clientHeight * RENDER_SCALE))
      if (w === width && h === height) return
      width = w
      height = h
      canvas!.width = w
      canvas!.height = h
      gl!.viewport(0, 0, w, h)
    }

    resize()
    const observer = new ResizeObserver(resize)
    if (canvas.parentElement) observer.observe(canvas.parentElement)

    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const started = performance.now()
    let raf = 0

    function draw(now: number) {
      const u = uniforms.current
      gl!.uniform2f(loc.res, width, height)
      gl!.uniform1f(loc.time, still ? 40 : (now - started) / 1000)
      gl!.uniform3fv(loc.skyTop, u.skyTop)
      gl!.uniform3fv(loc.skyBottom, u.skyBottom)
      gl!.uniform3fv(loc.lit, u.lit)
      gl!.uniform3fv(loc.shadow, u.shadow)
      gl!.uniform1f(loc.coverage, u.coverage)
      gl!.uniform1f(loc.flash, flash?.current ?? 0)
      gl!.drawArrays(gl!.TRIANGLES, 0, 3)
      if (!still) raf = requestAnimationFrame(draw)
    }

    if (still || !active) draw(performance.now())
    else raf = requestAnimationFrame(draw)

    return () => {
      if (raf) cancelAnimationFrame(raf)
      observer.disconnect()
      gl.deleteProgram(program)
      gl.deleteShader(vertex)
      gl.deleteShader(fragment)
      gl.deleteBuffer(buffer)
    }
  }, [active, flash, onFail])

  return <canvas ref={canvasRef} className="sky-canvas" aria-hidden="true" />
}
