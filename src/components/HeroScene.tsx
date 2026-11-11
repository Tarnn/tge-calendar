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
  Vector3,
  WebGLRenderer,
} from "three"
import type { EventType } from "@/types"
import type { ResolvedTheme } from "@/hooks/useTheme"
import { FAR_RADIUS, NEAR_RADIUS, orbitSlot } from "@/lib/orbit"

/**
 * Hero scene: a coin drawn in particles, its face a 7×5 calendar grid with one
 * day lit, circled by the next few launches as satellites — the sooner a
 * launch, the tighter its orbit.
 *
 * The satellites are real buttons laid over the canvas and moved each frame to
 * follow their 3D positions, so they are focusable, labelled and clickable
 * like any other control. Without WebGL the overlay stays hidden and the page
 * is complete without it.
 */

export interface Satellite {
  id: string
  /** Short text on the marker, usually the ticker. */
  tag: string
  title: string
  detail: string
  type: EventType
  /** Days until the event; sets the orbit radius. */
  days: number
}

const CLOUD_VERTEX = /* glsl */ `
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

const CLOUD_FRAGMENT = /* glsl */ `
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

const SATELLITE_VERTEX = /* glsl */ `
  attribute vec3 aColor;
  uniform float uTime;
  uniform float uPixelRatio;
  varying vec3 vColor;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    float pulse = 1.0 + 0.12 * sin(uTime * 2.2 + position.x * 3.0);
    gl_PointSize = 13.0 * pulse * uPixelRatio * (15.0 / -mv.z);
    vColor = aColor;
  }
`

const SATELLITE_FRAGMENT = /* glsl */ `
  precision mediump float;
  uniform float uOpacity;
  uniform float uCore;
  varying vec3 vColor;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float core = smoothstep(0.16, 0.02, d);
    float halo = smoothstep(0.5, 0.0, d) * 0.5;
    gl_FragColor = vec4(mix(vColor, vec3(1.0), core * uCore), (core + halo) * uOpacity);
  }
`

const PALETTE: Record<ResolvedTheme, { a: string; b: string; c: string; opacity: number; additive: boolean }> = {
  dark: { a: "#f7931a", b: "#ffe2b0", c: "#a78bfa", opacity: 0.95, additive: true },
  light: { a: "#d97706", b: "#7c2d12", c: "#6d28d9", opacity: 0.8, additive: false },
}

/** Same hues as the event-type badges, one per theme. */
const TYPE_COLOR: Record<EventType, Record<ResolvedTheme, string>> = {
  tge: { dark: "#ffb454", light: "#b45309" },
  listing: { dark: "#2dd4bf", light: "#115e59" },
  sale: { dark: "#5cc8ff", light: "#0369a1" },
  airdrop: { dark: "#4ade80", light: "#0f6b33" },
  unlock: { dark: "#fb7185", light: "#be123c" },
  mainnet: { dark: "#a5b4fc", light: "#4338ca" },
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

/** A faint ring marking the near or far edge of the orbit band. */
function buildRing(radius: number, accent: boolean): Cloud {
  const cloud = emptyCloud()
  for (let i = 0; i < 620; i += 1) {
    const theta = Math.random() * Math.PI * 2
    const r = radius + gaussian() * 0.012
    push(cloud, Math.cos(theta) * r, 0, Math.sin(theta) * r, 0.95, accent ? 2 : 0.6)
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

interface SceneApi {
  setTheme: (theme: ResolvedTheme) => void
  setSatellites: (satellites: Satellite[], theme: ResolvedTheme) => void
}

export interface HeroSceneProps {
  theme: ResolvedTheme
  satellites: Satellite[]
  onSelect: (id: string) => void
  /** Accessible name for the group of satellite buttons. */
  label: string
}

export default function HeroScene({ theme, satellites, onSelect, label }: HeroSceneProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const apiRef = useRef<SceneApi | null>(null)
  /** True while a satellite is hovered or focused: the orbit holds still so it can be clicked. */
  const heldRef = useRef(false)

  useEffect(() => {
    const host = hostRef.current
    const overlay = overlayRef.current
    if (!host || !overlay) return

    let renderer: WebGLRenderer
    try {
      renderer = new WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" })
    } catch {
      return // No WebGL: the CSS backdrop carries the hero on its own.
    }
    renderer.setClearColor(0x000000, 0)
    const canvas = renderer.domElement
    canvas.style.cssText = "position:absolute;inset:0;display:block"
    host.insertBefore(canvas, host.firstChild)

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
      vertexShader: CLOUD_VERTEX,
      fragmentShader: CLOUD_FRAGMENT,
      transparent: true,
      depthWrite: false,
    })
    const satelliteUniforms = {
      uTime: uniforms.uTime,
      uPixelRatio: uniforms.uPixelRatio,
      uOpacity: { value: 1 },
      uCore: { value: 0.7 },
    }
    const satelliteMaterial = new ShaderMaterial({
      uniforms: satelliteUniforms,
      vertexShader: SATELLITE_VERTEX,
      fragmentShader: SATELLITE_FRAGMENT,
      transparent: true,
      depthWrite: false,
    })

    const rig = new Group() // follows the pointer
    const coin = new Points(toGeometry(buildCoin()), material)
    const orbit = new Group() // tilts the orbit plane
    const spin = new Group() // turns within that plane
    const ringNear = new Points(toGeometry(buildRing(NEAR_RADIUS, false)), material)
    const ringFar = new Points(toGeometry(buildRing(FAR_RADIUS, true)), material)
    const satelliteGeometry = new BufferGeometry()
    const satellitePoints = new Points(satelliteGeometry, satelliteMaterial)
    const dust = new Points(toGeometry(buildDust()), material)
    orbit.rotation.set(1.0, 0, 0.32)
    spin.add(ringNear, ringFar, satellitePoints)
    orbit.add(spin)
    rig.add(coin, orbit)
    scene.add(rig, dust)

    let slots: Vector3[] = []
    const world = new Vector3()
    const projected = new Vector3()
    let width = 0
    let height = 0

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const pointer = { x: 0, y: 0 }
    // Start on a three-quarter view of the coin. With reduced motion this is
    // also the only frame ever drawn, so it must not be edge-on.
    let elapsed = 1.4
    let spinAngle = 0
    let last = performance.now()
    let frame = 0
    let visible = true

    /** Move each overlay button onto its satellite. */
    function placeMarkers(): void {
      spin.updateWorldMatrix(true, false)
      for (let i = 0; i < slots.length; i += 1) {
        const marker = overlay?.children[i] as HTMLElement | undefined
        const slot = slots[i]
        if (!marker || !slot) continue
        world.copy(slot).applyMatrix4(spin.matrixWorld)
        const inFront = world.z >= 0
        projected.copy(world).project(camera)
        const x = (projected.x * 0.5 + 0.5) * width
        const y = (-projected.y * 0.5 + 0.5) * height
        // The label hangs to the right of its glowing dot rather than covering it.
        marker.style.transform = `translate3d(${(x + 11).toFixed(1)}px, ${y.toFixed(1)}px, 0) translateY(-50%) scale(${inFront ? 1 : 0.86})`
        marker.style.opacity = inFront ? "1" : "0.45"
        marker.style.zIndex = inFront ? "2" : "1"
      }
      if (overlay) overlay.style.visibility = "visible"
    }

    function renderFrame(): void {
      uniforms.uTime.value = elapsed
      coin.rotation.y = elapsed * 0.32
      coin.rotation.x = 0.28 + Math.sin(elapsed * 0.4) * 0.06
      spin.rotation.y = spinAngle
      dust.rotation.z = elapsed * 0.01
      rig.rotation.y += (pointer.x * 0.3 - rig.rotation.y) * 0.05
      rig.rotation.x += (pointer.y * 0.18 - rig.rotation.x) * 0.05
      renderer.render(scene, camera)
      placeMarkers()
    }

    function loop(now: number): void {
      const delta = Math.min(0.05, (now - last) / 1000)
      last = now
      elapsed += delta
      if (!heldRef.current) spinAngle += delta * 0.07
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
      width = host?.clientWidth ?? 0
      height = host?.clientHeight ?? 0
      if (width === 0 || height === 0) return
      const ratio = Math.min(window.devicePixelRatio || 1, 2)
      renderer.setPixelRatio(ratio)
      renderer.setSize(width, height, false)
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      uniforms.uPixelRatio.value = ratio
      camera.aspect = width / height
      // Keep the whole composition in frame on narrow (portrait) hosts.
      camera.position.z = camera.aspect < 1 ? 7.4 / Math.max(0.55, camera.aspect) : 7.4
      camera.updateProjectionMatrix()
      renderFrame()
    }

    function setTheme(next: ResolvedTheme): void {
      const palette = PALETTE[next]
      uniforms.uColorA.value.set(palette.a)
      uniforms.uColorB.value.set(palette.b)
      uniforms.uColorC.value.set(palette.c)
      uniforms.uOpacity.value = palette.opacity
      satelliteUniforms.uCore.value = palette.additive ? 0.7 : 0.15
      for (const m of [material, satelliteMaterial]) {
        m.blending = palette.additive ? AdditiveBlending : NormalBlending
        m.needsUpdate = true
      }
    }

    function setSatellites(next: Satellite[], forTheme: ResolvedTheme): void {
      const positions = new Float32Array(next.length * 3)
      const colors = new Float32Array(next.length * 3)
      const color = new Color()
      slots = next.map((satellite, index) => {
        const { x, z } = orbitSlot(index, satellite.days)
        positions.set([x, 0, z], index * 3)
        color.set(TYPE_COLOR[satellite.type][forTheme])
        colors.set([color.r, color.g, color.b], index * 3)
        return new Vector3(x, 0, z)
      })
      satelliteGeometry.setAttribute("position", new BufferAttribute(positions, 3))
      satelliteGeometry.setAttribute("aColor", new BufferAttribute(colors, 3))
      satelliteGeometry.computeBoundingSphere()
    }

    apiRef.current = {
      setTheme(next) {
        setTheme(next)
        renderFrame()
      },
      setSatellites(next, forTheme) {
        setSatellites(next, forTheme)
        renderFrame()
      },
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

    setTheme((document.documentElement.dataset.theme as ResolvedTheme | undefined) ?? "dark")
    resize()
    resizeObserver.observe(host)
    intersectionObserver.observe(host)
    document.addEventListener("visibilitychange", onVisibility)
    if (!reducedMotion) window.addEventListener("pointermove", onPointerMove, { passive: true })
    start()

    return () => {
      stop()
      apiRef.current = null
      overlay.style.visibility = "hidden"
      resizeObserver.disconnect()
      intersectionObserver.disconnect()
      document.removeEventListener("visibilitychange", onVisibility)
      window.removeEventListener("pointermove", onPointerMove)
      for (const points of [coin, ringNear, ringFar, dust, satellitePoints]) points.geometry.dispose()
      material.dispose()
      satelliteMaterial.dispose()
      renderer.dispose()
      canvas.remove()
    }
  }, [])

  // Recolour and re-seat satellites in place — no need to rebuild the scene.
  useEffect(() => {
    apiRef.current?.setTheme(theme)
    apiRef.current?.setSatellites(satellites, theme)
  }, [theme, satellites])

  const hold = (value: boolean) => (): void => {
    heldRef.current = value
  }

  return (
    <div ref={hostRef} className="relative size-full">
      {/* Hidden until the first frame has positioned the markers (and for good without WebGL). */}
      <div ref={overlayRef} role="group" aria-label={label} className="absolute inset-0" style={{ visibility: "hidden" }}>
        {satellites.map((satellite) => (
          <button
            key={satellite.id}
            type="button"
            onClick={() => onSelect(satellite.id)}
            onPointerEnter={hold(true)}
            onPointerLeave={hold(false)}
            onFocus={hold(true)}
            onBlur={hold(false)}
            aria-label={`${satellite.title} — ${satellite.detail}`}
            className="group pointer-events-auto absolute top-0 left-0 origin-left rounded-full border border-line-strong bg-surface/85 px-2.5 py-1 font-mono text-[11px] font-semibold text-ink shadow-card backdrop-blur-md transition-[opacity,border-color,background-color] duration-300 will-change-transform hover:z-10! hover:border-[var(--sat)] hover:bg-surface hover:opacity-100! focus-visible:z-10! focus-visible:border-[var(--sat)] focus-visible:opacity-100!"
            style={{ "--sat": TYPE_COLOR[satellite.type][theme] } as React.CSSProperties}
          >
            {satellite.tag}
            <span
              aria-hidden
              className="pointer-events-none absolute top-full left-1/2 z-10 mt-2 w-max max-w-56 -translate-x-1/2 translate-y-1 rounded-xl border border-line bg-surface px-3 py-2 text-left font-sans text-xs font-normal text-ink-soft opacity-0 shadow-card transition-[opacity,translate] duration-200 group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100"
            >
              <span className="block font-display text-sm font-semibold text-ink">{satellite.title}</span>
              {satellite.detail}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
