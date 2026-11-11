import { useEffect, useRef, type CSSProperties, type RefObject } from "react"
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Color,
  ColorManagement,
  DoubleSide,
  Group,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  LatheGeometry,
  LinearSRGBColorSpace,
  Mesh,
  MeshBasicMaterial,
  NormalBlending,
  PerspectiveCamera,
  PlaneGeometry,
  Points,
  Scene,
  ShaderMaterial,
  Vector2,
  Vector3,
  Vector4,
  WebGLRenderer,
} from "three"
import type { EventStatus, EventType } from "@/types"
import type { ResolvedTheme } from "@/hooks/useTheme"
import { cn } from "@/lib/cn"
import { DAY_DEPTH, placeBeams, type BeamPlacement } from "@/lib/runway"
import {
  BEAM_FRAGMENT,
  BEAM_VERTEX,
  DUST_VERTEX,
  GROUND_FRAGMENT,
  GROUND_VERTEX,
  POINT_FRAGMENT,
  SKY_FRAGMENT,
  SKY_VERTEX,
  SPARK_VERTEX,
  STAR_VERTEX,
  TOKEN_FRAGMENT,
  TOKEN_VERTEX,
} from "@/components/hero/shaders"

/**
 * Hero scene, "the runway": a ground grid in which every cell is one day and
 * time runs away from the viewer towards a glowing horizon. Each upcoming
 * launch is a beam of light standing on its date — nearer means sooner — with
 * a coin turning inside it. A confirmed date burns steadily, an expected one
 * breathes, a tentative one is dashed.
 *
 * The labels are real buttons laid over the canvas and moved every frame to
 * sit on top of their beams, so each launch is focusable, labelled and
 * clickable like any other control. Without WebGL nothing is drawn and the
 * page is complete without it.
 */

/** Shader colours are written as sRGB and drawn as-is; three.js must not convert them. */
ColorManagement.enabled = false

export interface Beacon {
  id: string
  /** Short text on the label, usually the ticker. */
  tag: string
  title: string
  detail: string
  type: EventType
  status: EventStatus
  /** Days from now, fractional. Sets how far down the runway the beam stands. */
  days: number
  /** The launch the hero counts down to. */
  lead: boolean
  /** Extra words on the label, e.g. the time left for the lead launch. */
  note?: string
}

export interface RunwayMark {
  /** Days from now to the middle of the day's cell. */
  offset: number
  /** Day of the month, painted on the ground. */
  label: string
  /** Month name, on today's cell and on the first of a month. */
  tag?: string
}

/** Must match MAX_BEACONS in the shaders. */
const MAX_BEACONS = 12
const CAMERA_HEIGHT = 3
/** How far behind the "now" line the camera stands. */
const CAMERA_BACK = 11
const INTRO_SECONDS = 2.8
/** Frames slower than this on average (about 24 a second) mean the device is struggling. */
const SLOW_FRAME_MS = 42
/** Slower than this and lowering the quality will not save it. */
const HOPELESS_FRAME_MS = 110
const LOWEST_QUALITY = 0.5
/** Remembered for the visit, so a struggling device is not asked to try again on every page load. */
const STILL_KEY = "tge:scene:still"

function storedStill(): boolean {
  try {
    return window.sessionStorage.getItem(STILL_KEY) === "1"
  } catch {
    return false
  }
}
const SPARKS_PER_BEAM = 16

interface Palette {
  line: string
  lineAlpha: number
  accent: string
  /** How strongly light adds to the ground: full at night, restrained on paper. */
  glow: number
  additive: boolean
  sun: string
  veil: string
  haze: number
  /** What a polished coin reflects: sky, horizon, ground and the glow between them. */
  env: { sky: string; horizon: string; ground: string; glow: string }
  dust: string
  ink: string
  inkAlpha: number
  stars: boolean
  beam: number
  /** Width of the soft light round a beam: generous in the dark, tight on a light page. */
  halo: number
  sky: number
}

const PALETTE: Record<ResolvedTheme, Palette> = {
  dark: {
    line: "#8d94c9",
    lineAlpha: 0.3,
    accent: "#ffb454",
    glow: 1,
    additive: true,
    sun: "#ff9a3d",
    veil: "#6f63ff",
    haze: 0.2,
    env: { sky: "#1c2140", horizon: "#5a4252", ground: "#06060a", glow: "#ffa04a" },
    dust: "#ffd9a8",
    ink: "#f3f3f5",
    inkAlpha: 0.55,
    stars: true,
    beam: 1,
    halo: 1,
    sky: 1,
  },
  light: {
    line: "#3d3829",
    lineAlpha: 0.2,
    accent: "#c2570a",
    glow: 0.7,
    additive: false,
    sun: "#ffb561",
    veil: "#f0a35e",
    haze: 0.16,
    env: { sky: "#f4f6ff", horizon: "#ffe6cf", ground: "#8a8274", glow: "#ffc27a" },
    dust: "#9a5a12",
    ink: "#17150f",
    inkAlpha: 0.5,
    stars: false,
    beam: 0.9,
    halo: 0.4,
    sky: 0.7,
  },
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

const BEAM_STYLE: Record<EventStatus, number> = { confirmed: 0, expected: 1, tentative: 2, market: 2 }

function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3
}

function easeOutExpo(t: number): number {
  return t >= 1 ? 1 : 1 - 2 ** (-10 * t)
}

/** The same overshoot the beam shader uses, so a label rides the top of its beam as it rises. */
function easeOutBack(t: number): number {
  const c = 1.70158
  const u = t - 1
  return 1 + (c + 1) * u * u * u + c * u * u
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value))
}

/** A day number (and, on major cells, the month) as white text on a transparent square. */
function drawMark(mark: RunwayMark): HTMLCanvasElement {
  const canvas = document.createElement("canvas")
  canvas.width = 256
  canvas.height = 256
  const context = canvas.getContext("2d")
  if (!context) return canvas
  context.fillStyle = "#ffffff"
  context.textAlign = "center"
  context.textBaseline = "alphabetic"
  const family = '"Space Grotesk Variable", "Inter Variable", system-ui, sans-serif'
  if (mark.tag) {
    context.font = `600 46px ${family}`
    context.fillText(mark.tag, 128, 62)
  }
  context.font = `600 ${mark.label.length > 1 ? 168 : 180}px ${family}`
  context.fillText(mark.label, 128, mark.tag ? 222 : 196)
  return canvas
}

/** A short word in small capitals, for the "now" line. */
function drawWord(word: string): HTMLCanvasElement {
  const canvas = document.createElement("canvas")
  canvas.width = 512
  canvas.height = 128
  const context = canvas.getContext("2d")
  if (!context) return canvas
  context.fillStyle = "#ffffff"
  context.textAlign = "right"
  context.textBaseline = "middle"
  context.font = '600 84px "Space Grotesk Variable", "Inter Variable", system-ui, sans-serif'
  context.fillText(word.toUpperCase(), 500, 68, 480)
  return canvas
}

interface SceneApi {
  setTheme: (theme: ResolvedTheme) => void
  setBeacons: (beacons: Beacon[]) => void
  setMarks: (marks: RunwayMark[], phase: number, nowWord: string) => void
  setHover: (index: number) => void
}

export interface HeroSceneProps {
  theme: ResolvedTheme
  beacons: Beacon[]
  marks: RunwayMark[]
  /** How far into the local day it is, 0–1: shifts the day lines so midnight is where it should be. */
  dayPhase: number
  /** The word painted beside the line that marks the present moment. */
  nowLabel: string
  /**
   * The part of the hero kept clear for the scene. The vanishing point and
   * the fan of beams are placed inside it, wherever the layout puts it.
   */
  anchor: RefObject<HTMLElement | null>
  onSelect: (id: string) => void
  /** Accessible name for the group of launch buttons. */
  label: string
  onReady?: () => void
  /** Called when the browser cannot provide WebGL, so the layout can close the gap kept for the scene. */
  onUnavailable?: () => void
}

export default function HeroScene({
  theme,
  beacons,
  marks,
  dayPhase,
  nowLabel,
  anchor,
  onSelect,
  label,
  onReady,
  onUnavailable,
}: HeroSceneProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const apiRef = useRef<SceneApi | null>(null)
  const readyRef = useRef(onReady)
  const unavailableRef = useRef(onUnavailable)

  useEffect(() => {
    readyRef.current = onReady
    unavailableRef.current = onUnavailable
  }, [onReady, onUnavailable])

  useEffect(() => {
    const host = hostRef.current
    const overlay = overlayRef.current
    if (!host || !overlay) return

    let renderer: WebGLRenderer
    try {
      renderer = new WebGLRenderer({ antialias: true, alpha: true })
    } catch {
      // No WebGL: the CSS backdrop carries the hero on its own.
      unavailableRef.current?.()
      return
    }
    renderer.outputColorSpace = LinearSRGBColorSpace
    renderer.setClearColor(0x000000, 0)
    const canvas = renderer.domElement
    canvas.style.cssText = "position:absolute;inset:0;display:block"
    host.insertBefore(canvas, host.firstChild)

    const scene = new Scene()
    const camera = new PerspectiveCamera(50, 1, 0.1, 900)
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches

    /* ── Shared uniforms ──────────────────────────────────────────────── */
    const time = { value: 0 }
    const intro = { value: reducedMotion ? 1 : 0 }
    const pixelRatio = { value: 1 }
    const cameraPosition = { value: new Vector3() }
    const gain = { value: new Float32Array(MAX_BEACONS) }

    /* ── Ground ───────────────────────────────────────────────────────── */
    const groundUniforms = {
      uTime: time,
      uCell: { value: DAY_DEPTH },
      uPhase: { value: 0 },
      uReveal: { value: reducedMotion ? 900 : 0 },
      uOpacity: { value: 1 },
      uLineAlpha: { value: 0.3 },
      uGlow: { value: 1 },
      uCam: cameraPosition,
      uLine: { value: new Color() },
      uAccent: { value: new Color() },
      uMouse: { value: new Vector3(0, 0, 0) },
      uCount: { value: 0 },
      uLead: { value: -1 },
      uBeacon: { value: Array.from({ length: MAX_BEACONS }, () => new Vector4()) },
      uBeaconColor: { value: Array.from({ length: MAX_BEACONS }, () => new Color()) },
    }
    const groundMaterial = new ShaderMaterial({
      uniforms: groundUniforms,
      vertexShader: GROUND_VERTEX,
      fragmentShader: GROUND_FRAGMENT,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    })
    const ground = new Mesh(new PlaneGeometry(1200, 620), groundMaterial)
    ground.rotation.x = -Math.PI / 2
    ground.position.z = -260
    ground.renderOrder = 0
    ground.frustumCulled = false

    /* ── Sky ──────────────────────────────────────────────────────────── */
    const SKY_WIDTH = 980
    const SKY_HEIGHT = 320
    const SKY_DISTANCE = 420
    /** Share of the sky quad that hangs below the horizon, where the glow spills onto the ground. */
    const SKY_HORIZON = 0.22
    const skyUniforms = {
      uOpacity: { value: 1 },
      uIntro: intro,
      uHaze: { value: 0.2 },
      uHorizon: { value: SKY_HORIZON },
      uSun: { value: new Color() },
      uVeil: { value: new Color() },
    }
    const skyMaterial = new ShaderMaterial({
      uniforms: skyUniforms,
      vertexShader: SKY_VERTEX,
      fragmentShader: SKY_FRAGMENT,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    })
    const sky = new Mesh(new PlaneGeometry(SKY_WIDTH, SKY_HEIGHT), skyMaterial)
    sky.renderOrder = 1
    sky.frustumCulled = false

    /* ── Stars and dust ───────────────────────────────────────────────── */
    const small = window.innerWidth < 768
    const starCount = small ? 380 : 900
    const starPositions = new Float32Array(starCount * 3)
    const starSeeds = new Float32Array(starCount * 3)
    for (let i = 0; i < starCount; i += 1) {
      // Scattered over the half of the sky dome the camera looks at.
      const azimuth = (Math.random() - 0.5) * Math.PI * 1.25
      const elevation = Math.asin(Math.random() ** 1.5 * 0.92)
      const radius = 520
      starPositions.set(
        [
          Math.sin(azimuth) * Math.cos(elevation) * radius,
          Math.sin(elevation) * radius,
          -Math.cos(azimuth) * Math.cos(elevation) * radius,
        ],
        i * 3,
      )
      starSeeds.set([Math.random(), Math.random(), Math.random()], i * 3)
    }
    const starGeometry = new BufferGeometry()
    starGeometry.setAttribute("position", new BufferAttribute(starPositions, 3))
    starGeometry.setAttribute("aSeed", new BufferAttribute(starSeeds, 3))
    const pointUniforms = { uTime: time, uPixelRatio: pixelRatio, uIntro: intro, uOpacity: { value: 1 } }
    const starMaterial = new ShaderMaterial({
      uniforms: pointUniforms,
      vertexShader: STAR_VERTEX,
      fragmentShader: POINT_FRAGMENT,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      blending: AdditiveBlending,
    })
    const stars = new Points(starGeometry, starMaterial)
    stars.renderOrder = 1
    stars.frustumCulled = false

    const dustCount = small ? 110 : 260
    const dustPositions = new Float32Array(dustCount * 3)
    const dustSeeds = new Float32Array(dustCount * 3)
    for (let i = 0; i < dustCount; i += 1) {
      dustPositions.set([(Math.random() - 0.5) * 70, 0.3 + Math.random() * 11, 14 - Math.random() * 120], i * 3)
      dustSeeds.set([Math.random(), Math.random(), Math.random()], i * 3)
    }
    const dustGeometry = new BufferGeometry()
    dustGeometry.setAttribute("position", new BufferAttribute(dustPositions, 3))
    dustGeometry.setAttribute("aSeed", new BufferAttribute(dustSeeds, 3))
    const dustUniforms = { ...pointUniforms, uOpacity: { value: 1 }, uTint: { value: new Color() } }
    const dustMaterial = new ShaderMaterial({
      uniforms: dustUniforms,
      vertexShader: DUST_VERTEX,
      fragmentShader: POINT_FRAGMENT,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    })
    const dust = new Points(dustGeometry, dustMaterial)
    dust.renderOrder = 6
    dust.frustumCulled = false

    /* ── Beams, coins and sparks: one instance per launch ─────────────── */
    const quad = new PlaneGeometry(1, 1)
    const beamGeometry = new InstancedBufferGeometry()
    beamGeometry.index = quad.index
    beamGeometry.setAttribute("position", quad.getAttribute("position"))
    beamGeometry.setAttribute("uv", quad.getAttribute("uv"))
    const beamBase = new InstancedBufferAttribute(new Float32Array(MAX_BEACONS * 3), 3)
    const beamSize = new InstancedBufferAttribute(new Float32Array(MAX_BEACONS * 2), 2)
    const beamColor = new InstancedBufferAttribute(new Float32Array(MAX_BEACONS * 3), 3)
    const beamStyle = new InstancedBufferAttribute(new Float32Array(MAX_BEACONS), 1)
    const beamIndex = new InstancedBufferAttribute(Float32Array.from({ length: MAX_BEACONS }, (_, i) => i), 1)
    beamGeometry.setAttribute("aBase", beamBase)
    beamGeometry.setAttribute("aSize", beamSize)
    beamGeometry.setAttribute("aColor", beamColor)
    beamGeometry.setAttribute("aStyle", beamStyle)
    beamGeometry.setAttribute("aIndex", beamIndex)
    beamGeometry.instanceCount = 0
    const beamUniforms = {
      uTime: time,
      uIntro: intro,
      uCam: cameraPosition,
      uGain: gain,
      uOpacity: { value: 1 },
      uWhite: { value: 1 },
      uHalo: { value: 1 },
    }
    const beamMaterial = new ShaderMaterial({
      uniforms: beamUniforms,
      vertexShader: BEAM_VERTEX,
      fragmentShader: BEAM_FRAGMENT,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    })
    const beams = new Mesh(beamGeometry, beamMaterial)
    beams.renderOrder = 3
    beams.frustumCulled = false

    // A coin turned on a lathe: a recessed face inside a raised rim, with a
    // bevelled edge, so that it catches the light the way struck metal does.
    const coin = new LatheGeometry(
      [
        [0, -0.032],
        [0.34, -0.032],
        [0.372, -0.05],
        [0.458, -0.05],
        [0.5, -0.024],
        [0.5, 0.024],
        [0.458, 0.05],
        [0.372, 0.05],
        [0.34, 0.032],
        [0, 0.032],
      ].map(([radius, height]) => new Vector2(radius, height)),
      56,
    )
    coin.rotateX(Math.PI / 2)
    const tokenGeometry = new InstancedBufferGeometry()
    tokenGeometry.index = coin.index
    tokenGeometry.setAttribute("position", coin.getAttribute("position"))
    tokenGeometry.setAttribute("normal", coin.getAttribute("normal"))
    const tokenBase = new InstancedBufferAttribute(new Float32Array(MAX_BEACONS * 3), 3)
    const tokenScale = new InstancedBufferAttribute(new Float32Array(MAX_BEACONS), 1)
    tokenGeometry.setAttribute("aBase", tokenBase)
    tokenGeometry.setAttribute("aScale", tokenScale)
    tokenGeometry.setAttribute("aColor", beamColor)
    tokenGeometry.setAttribute("aIndex", beamIndex)
    tokenGeometry.instanceCount = 0
    const tokenUniforms = {
      uTime: time,
      uIntro: intro,
      uCam: cameraPosition,
      uGain: gain,
      uOpacity: { value: 1 },
      uEnvSky: { value: new Color() },
      uEnvHorizon: { value: new Color() },
      uEnvGround: { value: new Color() },
      uEnvGlow: { value: new Color() },
    }
    // The one solid in the scene: it sorts its own faces with the depth buffer.
    const tokenMaterial = new ShaderMaterial({
      uniforms: tokenUniforms,
      vertexShader: TOKEN_VERTEX,
      fragmentShader: TOKEN_FRAGMENT,
      transparent: true,
      side: DoubleSide,
    })
    const tokens = new Mesh(tokenGeometry, tokenMaterial)
    tokens.renderOrder = 4
    tokens.frustumCulled = false

    const sparkTotal = MAX_BEACONS * SPARKS_PER_BEAM
    const sparkRandom = Float32Array.from({ length: sparkTotal * 4 }, () => Math.random())
    const sparkBase = new BufferAttribute(new Float32Array(sparkTotal * 3), 3)
    const sparkColor = new BufferAttribute(new Float32Array(sparkTotal * 3), 3)
    const sparkSeed = new BufferAttribute(new Float32Array(sparkTotal * 4), 4)
    const sparkIndex = new BufferAttribute(new Float32Array(sparkTotal), 1)
    const sparkGeometry = new BufferGeometry()
    sparkGeometry.setAttribute("position", new BufferAttribute(new Float32Array(sparkTotal * 3), 3))
    sparkGeometry.setAttribute("aBase", sparkBase)
    sparkGeometry.setAttribute("aColor", sparkColor)
    sparkGeometry.setAttribute("aSeed", sparkSeed)
    sparkGeometry.setAttribute("aIndex", sparkIndex)
    sparkGeometry.setDrawRange(0, 0)
    const sparkMaterial = new ShaderMaterial({
      uniforms: { ...pointUniforms, uOpacity: { value: 1 }, uGain: gain },
      vertexShader: SPARK_VERTEX,
      fragmentShader: POINT_FRAGMENT,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    })
    const sparks = new Points(sparkGeometry, sparkMaterial)
    sparks.renderOrder = 5
    sparks.frustumCulled = false

    /* ── Dates painted on the ground ──────────────────────────────────── */
    const markGroup = new Group()
    const markGeometry = new PlaneGeometry(1.5, 1.5)
    const wordGeometry = new PlaneGeometry(2.4, 0.6)
    interface MarkMesh {
      mesh: Mesh<PlaneGeometry, MeshBasicMaterial>
      texture: CanvasTexture
      fade: number
    }
    let markMeshes: MarkMesh[] = []

    scene.add(ground, sky, stars, markGroup, beams, tokens, sparks, dust)

    /* ── State ────────────────────────────────────────────────────────── */
    let palette = PALETTE.dark
    let themeName: ResolvedTheme = "dark"
    let current: Beacon[] = []
    let placements: BeamPlacement[] = []
    let labelShown: boolean[] = []
    let width = 0
    let height = 0
    let vanishX = 0
    let vanishY = 0
    let hovered = -1
    let elapsed = 0
    let introTime = reducedMotion || storedStill() ? INTRO_SECONDS : 0
    let last = performance.now()
    let frame = 0
    let visible = true
    let announced = false
    /** Share of the usual pixel density being drawn; lowered when frames run slow. */
    let quality = 1
    /** True when the scene is a still picture: by preference, or because the device cannot animate it. */
    let still = reducedMotion || storedStill()
    const governor = { settleUntil: 0, total: 0, frames: 0 }
    const pointer = { x: 0, y: 0, inside: false }
    const drift = { x: 0, y: 0 }
    const gains = new Float32Array(MAX_BEACONS)
    const top = new Vector3()
    const foot = new Vector3()
    const ray = new Vector3()
    const color = new Color()

    /** Seat every beam, coin, spark and ground light for the current launches and viewport. */
    function layout(): void {
      const count = Math.min(current.length, MAX_BEACONS)
      const focal = height / 2 / Math.tan((camera.fov * Math.PI) / 360)
      const hostBox = host?.getBoundingClientRect()
      const box = anchor.current?.getBoundingClientRect()
      // Without an anchor the scene centres itself in the right-hand half.
      const left = box && hostBox ? box.left - hostBox.left : width * 0.5
      const boxTop = box && hostBox ? box.top - hostBox.top : 0
      const boxWidth = box ? box.width : width * 0.5
      const boxHeight = box ? box.height : height
      // Beside the copy, the date column stands at the left of the scene and
      // the beams fan out to its right. Stacked under the headline (phones,
      // tablets), it is centred with beams on both sides.
      const narrow = boxWidth > width * 0.7
      vanishX = left + boxWidth * (narrow ? 0.5 : 0.1)
      vanishY = boxTop + boxHeight * (narrow ? 0.5 : 0.46)
      const gap = Math.max(44, boxWidth * (narrow ? 0.1 : 0.14))
      // The beams may run past the column to the edge of the viewport.
      const right = Math.max(left + boxWidth, width - 12) - 26
      // Shift the picture so the vanishing point lands on that spot.
      camera.setViewOffset(width, height, width / 2 - vanishX, height / 2 - vanishY, width, height)
      camera.updateProjectionMatrix()

      placements = placeBeams(
        current.slice(0, count).map((beacon) => beacon.days),
        {
          vanishX,
          focal,
          fans: narrow
            ? [
                [left + 22, vanishX - gap],
                [vanishX + gap, right],
              ]
            : [[vanishX + gap, right]],
          cameraBack: CAMERA_BACK,
          cameraHeight: CAMERA_HEIGHT,
          ceiling: vanishY - boxTop - 34,
        },
      )

      for (let i = 0; i < count; i += 1) {
        const beacon = current[i]
        const place = placements[i]
        if (!beacon || !place) continue
        const lead = beacon.lead ? 1.25 : 1
        color.set(TYPE_COLOR[beacon.type][themeName])
        beamBase.setXYZ(i, place.x, 0, place.z)
        beamSize.setXY(i, (1.5 + place.distance * 0.034) * lead, place.height)
        beamColor.setXYZ(i, color.r, color.g, color.b)
        beamStyle.setX(i, BEAM_STYLE[beacon.status])
        tokenBase.setXYZ(i, place.x, 0.95 + place.distance * 0.012, place.z)
        tokenScale.setX(i, (0.4 + place.distance * 0.012) * lead)
        groundUniforms.uBeacon.value[i]?.set(place.x, place.z, 1, (1.5 + place.distance * 0.03) * lead)
        groundUniforms.uBeaconColor.value[i]?.copy(color)
        for (let s = 0; s < SPARKS_PER_BEAM; s += 1) {
          const at = i * SPARKS_PER_BEAM + s
          sparkBase.setXYZ(at, place.x, 0, place.z)
          sparkColor.setXYZ(at, color.r, color.g, color.b)
          // The same spark keeps the same path however often the scene is laid out again.
          const at4 = at * 4
          sparkSeed.setXYZW(
            at,
            sparkRandom[at4] ?? 0,
            sparkRandom[at4 + 1] ?? 0,
            sparkRandom[at4 + 2] ?? 0,
            place.height * (0.5 + (sparkRandom[at4 + 3] ?? 0) * 0.45),
          )
          sparkIndex.setX(at, i)
        }
      }
      for (const attribute of [beamBase, beamSize, beamColor, beamStyle, tokenBase, tokenScale]) {
        attribute.needsUpdate = true
      }
      for (const attribute of [sparkBase, sparkColor, sparkSeed, sparkIndex]) attribute.needsUpdate = true
      beamGeometry.instanceCount = count
      tokenGeometry.instanceCount = count
      sparkGeometry.setDrawRange(0, count * SPARKS_PER_BEAM)
      groundUniforms.uCount.value = count
      groundUniforms.uLead.value = current.slice(0, count).findIndex((beacon) => beacon.lead)

      // Labels that would land on top of a sooner launch's label stay hidden.
      const taken: { left: number; right: number; top: number; bottom: number }[] = []
      labelShown = placements.map((place, i) => {
        const words = `${current[i]?.tag ?? ""}${current[i]?.note ? `  ${current[i]?.note}` : ""}`
        const half = (30 + words.length * 7.6) / 2 + 3
        const y = vanishY - ((place.height + 0.35 - CAMERA_HEIGHT) / place.distance) * focal
        const rect = { left: place.screenX - half, right: place.screenX + half, top: y - 30, bottom: y + 3 }
        const clash = taken.some(
          (other) =>
            rect.left < other.right && rect.right > other.left && rect.top < other.bottom && rect.bottom > other.top,
        )
        if (!clash) taken.push(rect)
        return !clash
      })

    }

    function applyTheme(next: ResolvedTheme): void {
      themeName = next
      palette = PALETTE[next]
      groundUniforms.uLine.value.set(palette.line)
      groundUniforms.uAccent.value.set(palette.accent)
      groundUniforms.uLineAlpha.value = palette.lineAlpha
      groundUniforms.uGlow.value = palette.glow
      skyUniforms.uSun.value.set(palette.sun)
      skyUniforms.uVeil.value.set(palette.veil)
      skyUniforms.uHaze.value = palette.haze
      tokenUniforms.uEnvSky.value.set(palette.env.sky)
      tokenUniforms.uEnvHorizon.value.set(palette.env.horizon)
      tokenUniforms.uEnvGround.value.set(palette.env.ground)
      tokenUniforms.uEnvGlow.value.set(palette.env.glow)
      dustUniforms.uTint.value.set(palette.dust)
      beamUniforms.uWhite.value = palette.additive ? 1 : 0
      beamUniforms.uOpacity.value = palette.beam
      beamUniforms.uHalo.value = palette.halo
      skyUniforms.uOpacity.value = palette.sky
      stars.visible = palette.stars
      for (const material of [skyMaterial, beamMaterial, sparkMaterial, dustMaterial]) {
        material.blending = palette.additive ? AdditiveBlending : NormalBlending
        material.needsUpdate = true
      }
      for (const { mesh, fade } of markMeshes) {
        mesh.material.color.set(palette.ink)
        mesh.material.opacity = palette.inkAlpha * fade
      }
    }

    function buildMarks(next: RunwayMark[], phase: number, nowWord: string): void {
      for (const { mesh, texture } of markMeshes) {
        markGroup.remove(mesh)
        mesh.material.dispose()
        texture.dispose()
      }
      // Midnight lines sit a fraction of a cell beyond "now", further on as the day goes by.
      groundUniforms.uPhase.value = -phase * DAY_DEPTH
      markMeshes = next.map((mark) => {
        const texture = new CanvasTexture(drawMark(mark))
        texture.anisotropy = renderer.capabilities.getMaxAnisotropy()
        const material = new MeshBasicMaterial({
          map: texture,
          transparent: true,
          depthTest: false,
          depthWrite: false,
          color: palette.ink,
        })
        const mesh = new Mesh(markGeometry, material)
        mesh.rotation.x = -Math.PI / 2
        mesh.position.set(0, 0, -mark.offset * DAY_DEPTH)
        mesh.scale.set(1, 1.45, 1)
        mesh.renderOrder = 2
        // Fainter with distance, like the grid they are painted on.
        const fade = Math.exp(-(CAMERA_BACK + mark.offset * DAY_DEPTH) * 0.03)
        material.opacity = palette.inkAlpha * fade
        markGroup.add(mesh)
        return { mesh, texture, fade }
      })

      // "Now", written on the near side of its line, just left of the date column.
      const texture = new CanvasTexture(drawWord(nowWord))
      texture.anisotropy = renderer.capabilities.getMaxAnisotropy()
      const material = new MeshBasicMaterial({
        map: texture,
        transparent: true,
        depthTest: false,
        depthWrite: false,
        color: palette.ink,
        opacity: palette.inkAlpha * 0.9,
      })
      const mesh = new Mesh(wordGeometry, material)
      mesh.rotation.x = -Math.PI / 2
      mesh.position.set(-2.3, 0, 0.5)
      mesh.renderOrder = 2
      markGroup.add(mesh)
      markMeshes.push({ mesh, texture, fade: 0.9 })
    }

    /** Put each label on top of its beam and stretch its hit area down the beam. */
    function placeLabels(): void {
      const count = placements.length
      for (let i = 0; i < count; i += 1) {
        const marker = overlay?.children[i] as HTMLElement | undefined
        const place = placements[i]
        if (!marker || !place) continue
        const t = clamp01(intro.value * 2.4 - i * 0.11)
        const rise = t <= 0 ? 0 : easeOutBack(t)
        top.set(place.x, place.height * rise + 0.35, place.z).project(camera)
        foot.set(place.x, 0, place.z).project(camera)
        const x = (top.x * 0.5 + 0.5) * width
        const y = (-top.y * 0.5 + 0.5) * height
        const footY = (-foot.y * 0.5 + 0.5) * height
        const shown = labelShown[i] !== false && top.z < 1 && t > 0.35
        const scale = Math.max(0.8, 1.04 - place.distance * 0.004)
        marker.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-50%, -100%) scale(${scale.toFixed(3)})`
        marker.style.opacity = shown ? String(clamp01((t - 0.35) * 3)) : "0"
        marker.style.pointerEvents = shown ? "auto" : "none"
        marker.style.setProperty("--beam-h", `${Math.max(0, (footY - y) / scale).toFixed(0)}px`)
      }
      if (overlay) overlay.style.visibility = "visible"
    }

    function renderFrame(): void {
      time.value = elapsed
      const t = clamp01(introTime / INTRO_SECONDS)
      intro.value = t
      groundUniforms.uReveal.value = reducedMotion ? 900 : 12 + easeOutCubic(t) * 420

      // The camera drops in from above, then idles; the pointer nudges it and
      // scrolling lifts it up and over the runway.
      const arrive = 1 - easeOutExpo(clamp01(introTime / 2.3))
      const scroll = still ? 0 : clamp01(window.scrollY / Math.max(1, height * 0.85))
      const lift = scroll * scroll * (3 - 2 * scroll)
      if (!still) {
        drift.x += (pointer.x - drift.x) * 0.045
        drift.y += (pointer.y - drift.y) * 0.045
      }
      const sway = still ? 0 : 1
      camera.position.set(
        drift.x * 1.5 + Math.sin(elapsed * 0.27) * 0.16 * sway,
        // Whatever the inputs do, the camera stays above the ground.
        Math.max(1.6, CAMERA_HEIGHT + arrive * 10 + lift * 9 - drift.y * 0.45 + Math.sin(elapsed * 0.43) * 0.07 * sway),
        CAMERA_BACK + arrive * 20 - lift * 20,
      )
      camera.rotation.set(-arrive * 0.36 - lift * 0.24, -drift.x * 0.02, 0)
      camera.updateMatrixWorld()
      cameraPosition.value.copy(camera.position)

      // The sky hangs at a fixed distance, its foot on the horizon.
      sky.position.set(
        camera.position.x,
        camera.position.y + SKY_HEIGHT * (0.5 - SKY_HORIZON),
        camera.position.z - SKY_DISTANCE,
      )
      stars.position.copy(camera.position)

      // Where the pointer's line of sight meets the ground.
      const mouse = groundUniforms.uMouse.value
      let lit = 0
      if (pointer.inside && !still) {
        ray.set(pointer.x, -pointer.y, 0.5).unproject(camera).sub(camera.position)
        if (ray.y < -0.0001) {
          const reach = -camera.position.y / ray.y
          if (reach < 260) {
            mouse.x = camera.position.x + ray.x * reach
            mouse.y = camera.position.z + ray.z * reach
            lit = 1
          }
        }
      }
      mouse.z = still ? 0 : mouse.z + (lit - mouse.z) * 0.08

      // The hovered beam flares; the others step back.
      for (let i = 0; i < MAX_BEACONS; i += 1) {
        const base = current[i]?.lead ? 1.3 : 1
        const target = i >= placements.length ? 0 : hovered < 0 ? base : i === hovered ? 1.9 : 0.4
        const value = gains[i] ?? 0
        gains[i] = still ? target : value + (target - value) * 0.14
        const light = groundUniforms.uBeacon.value[i]
        if (light) light.z = gains[i] ?? 0
      }
      gain.value.set(gains)

      renderer.render(scene, camera)
      placeLabels()
      if (!announced) {
        announced = true
        readyRef.current?.()
      }
    }

    /**
     * Watch how long frames really take. A device that cannot keep up first
     * gets fewer pixels to fill; one that still cannot is given a single
     * still frame, the same picture a visitor who prefers reduced motion
     * sees. The page must never be slow for the sake of its decoration.
     */
    function govern(now: number, frameMs: number): void {
      // Shader compilation makes the first frames slow on any device, and a
      // long gap means the tab was in the background, not that drawing is slow.
      if (now < governor.settleUntil || frameMs > 1500) return
      governor.total += frameMs
      governor.frames += 1
      if (governor.frames < 20 && governor.total < 1200) return
      const average = governor.total / governor.frames
      governor.total = 0
      governor.frames = 0
      if (average <= SLOW_FRAME_MS) return
      if (average > HOPELESS_FRAME_MS || quality <= LOWEST_QUALITY) {
        freeze()
        return
      }
      quality = Math.max(LOWEST_QUALITY, quality * 0.66)
      governor.settleUntil = now + 400
      resize()
    }

    /** Stop animating and leave the settled picture on screen. */
    function freeze(): void {
      still = true
      stop()
      introTime = INTRO_SECONDS
      // The still picture is taken from the resting camera, not from wherever it was heading.
      releasePointer()
      drift.x = 0
      drift.y = 0
      groundUniforms.uMouse.value.z = 0
      try {
        window.sessionStorage.setItem(STILL_KEY, "1")
      } catch {
        // Storage can be unavailable (private mode); the scene is still frozen for this visit.
      }
      // The page drops its own decorative animations too (see index.css).
      document.documentElement.dataset.lite = ""
      renderFrame()
    }

    function loop(now: number): void {
      const frameMs = now - last
      const delta = Math.min(0.05, frameMs / 1000)
      last = now
      elapsed += delta
      introTime += delta
      renderFrame()
      frame = requestAnimationFrame(loop)
      govern(now, frameMs)
    }

    function start(): void {
      if (frame || still || !visible || document.hidden) return
      last = performance.now()
      governor.settleUntil = last + 700
      governor.total = 0
      governor.frames = 0
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
      // Keep the pixel count in check on very large or very dense screens.
      const budget = Math.sqrt(4_600_000 / (width * height))
      const ratio = Math.max(1, Math.min(window.devicePixelRatio || 1, 2, budget)) * quality
      renderer.setPixelRatio(ratio)
      renderer.setSize(width, height, false)
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      pixelRatio.value = ratio
      camera.aspect = width / height
      // A tall, narrow viewport needs a wider lens to keep the horizon in view.
      camera.fov = camera.aspect < 1 ? 62 : 50
      layout()
      renderFrame()
    }

    apiRef.current = {
      setTheme(next) {
        applyTheme(next)
        layout()
        renderFrame()
      },
      setBeacons(next) {
        current = next
        layout()
        renderFrame()
      },
      setMarks(next, phase, nowWord) {
        buildMarks(next, phase, nowWord)
        renderFrame()
      },
      setHover(index) {
        hovered = index
        if (still) renderFrame()
      },
    }

    /** Let the camera settle back to its resting place. */
    function releasePointer(): void {
      pointer.x = 0
      pointer.y = 0
      pointer.inside = false
    }

    function onPointerMove(event: PointerEvent): void {
      // Only a mouse steers the camera. A finger scrolling the page is not
      // pointing at anything, and its coordinates are measured against a hero
      // that may be thousands of pixels off screen.
      if (event.pointerType !== "mouse") return
      const box = host?.getBoundingClientRect()
      if (!box || box.width === 0 || box.height === 0) return
      const x = ((event.clientX - box.left) / box.width) * 2 - 1
      const y = ((event.clientY - box.top) / box.height) * 2 - 1
      // Outside the hero the pointer has no say: without this, moving the
      // mouse far down the page would drag the camera through the ground.
      if (Math.abs(x) > 1 || Math.abs(y) > 1) {
        releasePointer()
        return
      }
      pointer.x = x
      pointer.y = y
      pointer.inside = true
    }

    const onVisibility = (): void => (document.hidden ? stop() : start())
    const resizeObserver = new ResizeObserver(resize)
    const intersectionObserver = new IntersectionObserver(([entry]) => {
      visible = entry?.isIntersecting ?? true
      if (visible) {
        start()
      } else {
        // Coming back into view, the scene starts from rest rather than from
        // wherever the pointer last was.
        releasePointer()
        stop()
      }
    })

    if (storedStill()) document.documentElement.dataset.lite = ""
    applyTheme((document.documentElement.dataset.theme as ResolvedTheme | undefined) ?? "dark")
    resize()
    resizeObserver.observe(host)
    if (anchor.current) resizeObserver.observe(anchor.current)
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
      for (const { mesh, texture } of markMeshes) {
        mesh.material.dispose()
        texture.dispose()
      }
      for (const geometry of [
        ground.geometry,
        sky.geometry,
        starGeometry,
        dustGeometry,
        quad,
        beamGeometry,
        coin,
        tokenGeometry,
        sparkGeometry,
        markGeometry,
        wordGeometry,
      ]) {
        geometry.dispose()
      }
      for (const material of [
        groundMaterial,
        skyMaterial,
        starMaterial,
        dustMaterial,
        beamMaterial,
        tokenMaterial,
        sparkMaterial,
      ]) {
        material.dispose()
      }
      renderer.dispose()
      canvas.remove()
    }
  }, [anchor])

  // Re-seat and recolour in place — the scene itself is built once.
  useEffect(() => {
    apiRef.current?.setTheme(theme)
  }, [theme])

  useEffect(() => {
    apiRef.current?.setBeacons(beacons)
  }, [beacons])

  useEffect(() => {
    let cancelled = false
    const apply = (): void => {
      if (!cancelled) apiRef.current?.setMarks(marks, dayPhase, nowLabel)
    }
    // The numbers are drawn with the page's display face, once it has loaded.
    document.fonts.load('600 160px "Space Grotesk Variable"').then(apply, apply)
    return () => {
      cancelled = true
    }
  }, [marks, dayPhase, nowLabel])

  const hover = (index: number) => (): void => apiRef.current?.setHover(index)

  return (
    <div ref={hostRef} className="relative size-full">
      {/* Keeps the copy readable; it sits over the canvas but under the labels. */}
      <div aria-hidden className="hero-scrim pointer-events-none absolute inset-0" />
      {/* Hidden until the first frame has positioned the labels (and for good without WebGL). */}
      <div
        ref={overlayRef}
        role="group"
        aria-label={label}
        className="pointer-events-none absolute inset-0"
        style={{ visibility: "hidden" }}
      >
        {beacons.slice(0, MAX_BEACONS).map((beacon, index) => (
          <button
            key={beacon.id}
            type="button"
            onClick={() => onSelect(beacon.id)}
            onPointerEnter={hover(index)}
            onPointerLeave={hover(-1)}
            onFocus={hover(index)}
            onBlur={hover(-1)}
            className={cn(
              "group absolute top-0 left-0 flex origin-bottom items-center gap-1.5 rounded-full border border-line-strong bg-surface/90 py-1 pr-2.5 pl-2 font-mono text-[11px] font-semibold text-ink opacity-0 shadow-card transition-[border-color,background-color,box-shadow] duration-200 will-change-transform hover:z-10 hover:border-[var(--sat)] hover:bg-surface hover:shadow-[0_0_24px_-4px_var(--sat)] focus-visible:z-10 focus-visible:border-[var(--sat)] focus-visible:opacity-100!",
              beacon.lead && "border-[var(--sat)]/60",
            )}
            style={{ "--sat": TYPE_COLOR[beacon.type][theme] } as CSSProperties}
          >
            <span
              aria-hidden
              className={cn("size-1.5 shrink-0 rounded-full bg-[var(--sat)]", beacon.lead && "animate-pulse-dot")}
            />
            {beacon.tag}
            {beacon.note && <span className="font-medium text-ink-faint">{beacon.note}</span>}
            {/* The name a screen reader hears starts with what is on the label, then says what it is. */}
            <span className="sr-only">
              {beacon.title} — {beacon.detail}
            </span>
            {/* The whole beam is part of the button, not just the pill on top of it. */}
            <span aria-hidden className="absolute top-full left-1/2 h-[var(--beam-h,0px)] w-9 -translate-x-1/2" />
            <span
              aria-hidden
              className="pointer-events-none absolute top-full left-1/2 z-10 mt-2 w-max max-w-56 -translate-x-1/2 translate-y-1 rounded-xl border border-line bg-surface px-3 py-2 text-left font-sans text-xs font-normal text-ink-soft opacity-0 shadow-card transition-[opacity,translate] duration-200 group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100"
            >
              <span className="block font-display text-sm font-semibold text-ink">{beacon.title}</span>
              {beacon.detail}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
