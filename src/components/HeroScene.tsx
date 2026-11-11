import { useEffect, useRef } from "react"
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  Group,
  NormalBlending,
  PerspectiveCamera,
  Points,
  Scene,
  ShaderMaterial,
  WebGLRenderer,
} from "three"
import type { ResolvedTheme } from "@/hooks/useTheme"

/**
 * Hero backdrop: a coin drawn entirely in particles, its face a 7×5 calendar
 * grid with one day lit, circled by two orbits whose twelve bright nodes stand
 * for the months. Pure decoration — it is aria-hidden and the page is complete
 * without it (no WebGL, reduced motion and tests all fall back to nothing).
 */

const VERTEX = /* glsl */ `
  attribute float aSize;
  attribute float aMix;
  attribute float aSeed;
  uniform float uTime;
  uniform float uPixelRatio;
  varying float vMix;
  varying float vFade;
  void main() {
    vec3 p = position;
    // A slow breathing shimmer so the cloud never looks frozen.
    float wobble = sin(uTime * 0.9 + aSeed * 6.2831) * 0.012;
    p += normalize(p + 0.0001) * wobble;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    float twinkle = 0.75 + 0.25 * sin(uTime * 1.7 + aSeed * 40.0);
    gl_PointSize = aSize * twinkle * uPixelRatio * (15.0 / -mv.z);
    vMix = aMix;
    vFade = smoothstep(-11.0, -4.0, mv.z);
  }
`

const FRAGMENT = /* glsl */ `
  precision mediump float;
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  uniform vec3 uColorC;
  uniform float uOpacity;
  varying float vMix;
  varying float vFade;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float alpha = smoothstep(0.5, 0.05, d);
    // aMix 0..1 blends A→B; values above 1 select the accent colour C.
    vec3 color = vMix > 1.0 ? uColorC : mix(uColorA, uColorB, vMix);
    gl_FragColor = vec4(color, alpha * uOpacity * (0.35 + 0.65 * vFade));
  }
`

const PALETTE: Record<ResolvedTheme, { a: string; b: string; c: string; opacity: number; additive: boolean }> = {
  dark: { a: "#f7931a", b: "#ffe2b0", c: "#a78bfa", opacity: 0.95, additive: true },
  light: { a: "#d97706", b: "#7c2d12", c: "#6d28d9", opacity: 0.8, additive: false },
}

interface Cloud {
  positions: number[]
  sizes: number[]
  mixes: number[]
  seeds: number[]
}

function emptyCloud(): Cloud {
  return { positions: [], sizes: [], mixes: [], seeds: [] }
}

function push(cloud: Cloud, x: number, y: number, z: number, size: number, mix: number): void {
  cloud.positions.push(x, y, z)
  cloud.sizes.push(size)
  cloud.mixes.push(mix)
  cloud.seeds.push(Math.random())
}

function gaussian(): number {
  // Box–Muller; good enough for scattering points.
  return Math.sqrt(-2 * Math.log(1 - Math.random())) * Math.cos(2 * Math.PI * Math.random())
}

function buildCoin(): Cloud {
  const cloud = emptyCloud()
  const radius = 1.55
  const thickness = 0.1

  // Milled edge.
  for (let i = 0; i < 3400; i += 1) {
    const theta = Math.random() * Math.PI * 2
    const phi = Math.random() * Math.PI * 2
    const r = radius + Math.cos(phi) * 0.07
    push(cloud, Math.cos(theta) * r, Math.sin(theta) * r, Math.sin(phi) * thickness, 2.2, Math.random() * 0.5)
  }
  // Two engraved rings on each face.
  for (const ringRadius of [1.28, 1.2]) {
    for (let i = 0; i < 520; i += 1) {
      const theta = Math.random() * Math.PI * 2
      const z = (Math.random() < 0.5 ? 1 : -1) * thickness
      push(cloud, Math.cos(theta) * ringRadius, Math.sin(theta) * ringRadius, z, 1.5, 0.75)
    }
  }
  // Calendar grid: seven columns, five rows, one cell lit as "today".
  const columns = 7
  const rows = 5
  const gap = 0.27
  const today = { column: 4, row: 1 }
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const cx = (column - (columns - 1) / 2) * gap
      const cy = ((rows - 1) / 2 - row) * gap
      const lit = column === today.column && row === today.row
      const count = lit ? 90 : 26
      for (let i = 0; i < count; i += 1) {
        const spread = lit ? 0.05 : 0.032
        for (const z of [thickness, -thickness]) {
          push(cloud, cx + gaussian() * spread, cy + gaussian() * spread, z, lit ? 3.2 : 1.7, lit ? 1 : 0.2)
        }
      }
    }
  }
  // Faint dust across the face so it reads as a solid disc from an angle.
  for (let i = 0; i < 700; i += 1) {
    const r = Math.sqrt(Math.random()) * radius * 0.97
    const theta = Math.random() * Math.PI * 2
    push(cloud, Math.cos(theta) * r, Math.sin(theta) * r, (Math.random() - 0.5) * thickness, 0.9, 0.4)
  }
  return cloud
}

function buildOrbit(radius: number, nodes: number, accent: boolean): Cloud {
  const cloud = emptyCloud()
  for (let i = 0; i < 520; i += 1) {
    const theta = Math.random() * Math.PI * 2
    const r = radius + gaussian() * 0.012
    push(cloud, Math.cos(theta) * r, 0, Math.sin(theta) * r, 1.0, accent ? 2 : 0.6)
  }
  for (let node = 0; node < nodes; node += 1) {
    const theta = (node / nodes) * Math.PI * 2
    for (let i = 0; i < 24; i += 1) {
      push(
        cloud,
        Math.cos(theta) * radius + gaussian() * 0.025,
        gaussian() * 0.025,
        Math.sin(theta) * radius + gaussian() * 0.025,
        2.6,
        accent ? 2 : 1,
      )
    }
  }
  return cloud
}

function buildDust(): Cloud {
  const cloud = emptyCloud()
  for (let i = 0; i < 420; i += 1) {
    push(cloud, (Math.random() - 0.5) * 16, (Math.random() - 0.5) * 9, -2 - Math.random() * 6, 1.1, Math.random())
  }
  return cloud
}

function toGeometry(cloud: Cloud): BufferGeometry {
  const geometry = new BufferGeometry()
  geometry.setAttribute("position", new BufferAttribute(new Float32Array(cloud.positions), 3))
  geometry.setAttribute("aSize", new BufferAttribute(new Float32Array(cloud.sizes), 1))
  geometry.setAttribute("aMix", new BufferAttribute(new Float32Array(cloud.mixes), 1))
  geometry.setAttribute("aSeed", new BufferAttribute(new Float32Array(cloud.seeds), 1))
  return geometry
}

export default function HeroScene({ theme }: { theme: ResolvedTheme }) {
  const hostRef = useRef<HTMLDivElement>(null)
  const applyThemeRef = useRef<((theme: ResolvedTheme) => void) | null>(null)

  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    let renderer: WebGLRenderer
    try {
      renderer = new WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" })
    } catch {
      return // No WebGL: the CSS backdrop carries the hero on its own.
    }
    renderer.setClearColor(0x000000, 0)
    renderer.domElement.style.display = "block"
    host.appendChild(renderer.domElement)

    const scene = new Scene()
    const camera = new PerspectiveCamera(42, 1, 0.1, 50)
    camera.position.set(0, 0, 7.4)

    const uniforms = {
      uTime: { value: 0 },
      uPixelRatio: { value: 1 },
      uColorA: { value: new Color() },
      uColorB: { value: new Color() },
      uColorC: { value: new Color() },
      uOpacity: { value: 1 },
    }
    const material = new ShaderMaterial({
      uniforms,
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      transparent: true,
      depthWrite: false,
    })

    const rig = new Group() // follows the pointer
    const coin = new Points(toGeometry(buildCoin()), material)
    const orbitA = new Points(toGeometry(buildOrbit(2.35, 12, false)), material)
    const orbitB = new Points(toGeometry(buildOrbit(2.95, 4, true)), material)
    const dust = new Points(toGeometry(buildDust()), material)
    orbitA.rotation.set(1.15, 0, 0.35)
    orbitB.rotation.set(1.35, 0, -0.5)
    rig.add(coin, orbitA, orbitB)
    scene.add(rig, dust)

    const applyTheme = (next: ResolvedTheme): void => {
      const palette = PALETTE[next]
      uniforms.uColorA.value.set(palette.a)
      uniforms.uColorB.value.set(palette.b)
      uniforms.uColorC.value.set(palette.c)
      uniforms.uOpacity.value = palette.opacity
      material.blending = palette.additive ? AdditiveBlending : NormalBlending
      material.needsUpdate = true
    }
    applyThemeRef.current = (next) => {
      applyTheme(next)
      renderFrame()
    }

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const pointer = { x: 0, y: 0 }
    // Start on a three-quarter view of the coin. With reduced motion this is
    // also the only frame ever drawn, so it must not be edge-on.
    let elapsed = 1.4
    let last = performance.now()
    let frame = 0
    let visible = true

    function renderFrame(): void {
      uniforms.uTime.value = elapsed
      coin.rotation.y = elapsed * 0.32
      coin.rotation.x = 0.28 + Math.sin(elapsed * 0.4) * 0.06
      orbitA.rotation.y = elapsed * 0.11
      orbitB.rotation.y = -elapsed * 0.07
      dust.rotation.z = elapsed * 0.01
      rig.rotation.y += (pointer.x * 0.35 - rig.rotation.y) * 0.05
      rig.rotation.x += (pointer.y * 0.22 - rig.rotation.x) * 0.05
      renderer.render(scene, camera)
    }

    function loop(now: number): void {
      elapsed += Math.min(0.05, (now - last) / 1000)
      last = now
      renderFrame()
      frame = requestAnimationFrame(loop)
    }

    function start(): void {
      if (frame || reducedMotion || !visible || document.hidden) return
      last = performance.now()
      frame = requestAnimationFrame(loop)
    }

    function stop(): void {
      cancelAnimationFrame(frame)
      frame = 0
    }

    function resize(): void {
      const width = host?.clientWidth ?? 0
      const height = host?.clientHeight ?? 0
      if (width === 0 || height === 0) return
      const ratio = Math.min(window.devicePixelRatio || 1, 2)
      renderer.setPixelRatio(ratio)
      renderer.setSize(width, height, false)
      renderer.domElement.style.width = `${width}px`
      renderer.domElement.style.height = `${height}px`
      uniforms.uPixelRatio.value = ratio
      camera.aspect = width / height
      // Keep the whole composition in frame on narrow (portrait) hosts.
      camera.position.z = camera.aspect < 1 ? 7.4 / Math.max(0.55, camera.aspect) : 7.4
      camera.updateProjectionMatrix()
      renderFrame()
    }

    function onPointerMove(event: PointerEvent): void {
      pointer.x = (event.clientX / window.innerWidth) * 2 - 1
      pointer.y = (event.clientY / window.innerHeight) * 2 - 1
    }

    const onVisibility = (): void => (document.hidden ? stop() : start())
    const resizeObserver = new ResizeObserver(resize)
    const intersectionObserver = new IntersectionObserver(([entry]) => {
      visible = entry?.isIntersecting ?? true
      if (visible) start()
      else stop()
    })

    applyTheme((document.documentElement.dataset.theme as ResolvedTheme | undefined) ?? "dark")
    resize()
    resizeObserver.observe(host)
    intersectionObserver.observe(host)
    document.addEventListener("visibilitychange", onVisibility)
    if (!reducedMotion) window.addEventListener("pointermove", onPointerMove, { passive: true })
    start()

    return () => {
      stop()
      applyThemeRef.current = null
      resizeObserver.disconnect()
      intersectionObserver.disconnect()
      document.removeEventListener("visibilitychange", onVisibility)
      window.removeEventListener("pointermove", onPointerMove)
      for (const points of [coin, orbitA, orbitB, dust]) points.geometry.dispose()
      material.dispose()
      renderer.dispose()
      renderer.domElement.remove()
    }
  }, [])

  // Recolour in place when the theme flips — no need to rebuild the scene.
  useEffect(() => {
    applyThemeRef.current?.(theme)
  }, [theme])

  return <div ref={hostRef} aria-hidden className="size-full" />
}
