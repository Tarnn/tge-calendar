/**
 * GLSL for the hero runway. Written in WebGL1 style; three.js translates it
 * for WebGL2. `MAX_BEACONS` must match the constant in HeroScene.tsx.
 */

const COMMON = /* glsl */ `
  #define MAX_BEACONS 12
  float hash11(float n) { return fract(sin(n * 127.1) * 43758.5453123); }
  float hash21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash21(i), hash21(i + vec2(1.0, 0.0)), u.x), mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), u.x), u.y);
  }
  float fbm(vec2 p) {
    float value = 0.0;
    float amplitude = 0.5;
    for (int i = 0; i < 4; i++) {
      value += amplitude * noise(p);
      p = p * 2.03 + vec2(17.0, 9.0);
      amplitude *= 0.5;
    }
    return value;
  }
`

/* ── Ground: the day grid, the "now" line, light pools under each beam ──── */

export const GROUND_VERTEX = /* glsl */ `
  varying vec3 vWorld;
  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorld = world.xyz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`

export const GROUND_FRAGMENT = /* glsl */ `
  precision highp float;
  ${COMMON}
  uniform float uTime;
  uniform float uCell;
  uniform float uPhase;
  uniform float uReveal;
  uniform float uOpacity;
  uniform float uLineAlpha;
  uniform float uGlow;
  uniform vec3 uCam;
  uniform vec3 uLine;
  uniform vec3 uAccent;
  uniform vec3 uMouse;
  uniform int uCount;
  uniform vec4 uBeacon[MAX_BEACONS];
  uniform vec3 uBeaconColor[MAX_BEACONS];
  varying vec3 vWorld;

  // 1 on a grid line, 0 between lines, one pixel of anti-aliasing.
  float gridLine(float coord, float width) {
    float d = abs(fract(coord - 0.5) - 0.5);
    return 1.0 - smoothstep(0.0, width, d);
  }

  void main() {
    vec2 p = vec2(vWorld.x, vWorld.z + uPhase) / uCell;
    vec2 fw = fwidth(p);
    float lineX = gridLine(p.x, fw.x * 1.35);
    float lineZ = gridLine(p.y, fw.y * 1.35);
    // Far away the lines are closer together than a pixel: fade them out
    // there rather than let them shimmer. The day lines bunch up long before
    // the lines running to the horizon do, so each set fades on its own.
    float crispX = 1.0 - smoothstep(0.3, 0.85, fw.x);
    float crispZ = 1.0 - smoothstep(0.3, 0.85, fw.y);
    float crisp = min(crispX, crispZ);
    lineX *= crispX;
    // Day lines are only drawn ahead of "now": yesterday's midnight is not on the runway.
    lineZ *= crispZ * step(vWorld.z, 0.0);
    float lines = max(lineX, lineZ);

    float dist = distance(vWorld.xz, uCam.xz);
    float fog = exp(-dist * 0.0155);
    float reveal = smoothstep(uReveal, uReveal - 16.0, dist);

    // Behind the "now" line lies the past: it is drawn, but only faintly.
    float ahead = 0.3 + 0.7 * smoothstep(0.6, -0.2, vWorld.z);
    vec3 color = uLine;
    float alpha = lines * uLineAlpha * (0.2 + 0.8 * fog) * ahead;

    // Light running along the lines that point into the future.
    float id = floor(p.x + 0.5);
    float speed = 0.05 + 0.09 * hash11(id);
    float travel = fract(p.y * 0.04 + uTime * speed + hash11(id + 3.1) * 10.0);
    float streak = smoothstep(0.88, 1.0, travel) * lineX * step(0.5, hash11(id + 9.7));
    color = mix(color, uAccent, clamp(streak * 1.4, 0.0, 1.0));
    alpha += streak * 0.55 * fog * uGlow;

    // A pulse that leaves "now" and rolls out to the horizon.
    float cycle = fract(uTime * 0.085);
    float front = -cycle * 150.0;
    float pulse = exp(-pow((vWorld.z - front) / 2.6, 2.0)) * (1.0 - cycle);
    color = mix(color, uAccent, clamp(pulse * 0.9, 0.0, 1.0));
    alpha += pulse * (lines * 0.6 + 0.035) * uGlow;

    // The "now" line.
    float nowWidth = fwidth(vWorld.z) * 1.6 + 0.02;
    float nowLine = 1.0 - smoothstep(0.0, nowWidth, abs(vWorld.z));
    float nowHaze = exp(-abs(vWorld.z) * 2.6) * 0.14;
    float nowBeat = 0.75 + 0.25 * sin(uTime * 2.2);
    color = mix(color, uAccent, clamp(nowLine + nowHaze * 2.0, 0.0, 1.0));
    alpha = max(alpha, nowLine * 0.9 * nowBeat) + nowHaze * uGlow;

    // Each beam lights the ground it stands on and sends out ripples.
    for (int i = 0; i < MAX_BEACONS; i++) {
      if (i >= uCount) break;
      vec4 beacon = uBeacon[i];
      float r = distance(vWorld.xz, beacon.xy);
      float radius = beacon.w;
      float pool = exp(-(r * r) / (radius * radius));
      float phase = fract(uTime * 0.32 + float(i) * 0.37);
      float ring = exp(-pow((r - phase * radius * 2.6) / 0.16, 2.0)) * (1.0 - phase);
      float foot = exp(-(r * r) / 0.09);
      float light = (pool * (0.2 + 0.55 * lines) + ring * 0.5 + foot * 0.9) * beacon.z;
      color = mix(color, uBeaconColor[i], clamp(light * 2.2, 0.0, 1.0));
      alpha += light * uGlow;
    }

    // The pointer drags a patch of light across the grid and shows a finer grid inside it.
    vec2 toMouse = vWorld.xz - uMouse.xy;
    float spot = exp(-dot(toMouse, toMouse) / 46.0) * uMouse.z;
    float fine = max(gridLine(p.x * 2.0, fw.x * 2.4), gridLine(p.y * 2.0, fw.y * 2.4)) * crisp;
    color = mix(color, uAccent, clamp(spot * 0.5, 0.0, 1.0));
    alpha += spot * (lines * 0.5 + fine * 0.16 + 0.03) * uGlow;

    gl_FragColor = vec4(color, clamp(alpha, 0.0, 1.0) * reveal * uOpacity);
  }
`

/* ── Beams: one camera-facing quad per launch ───────────────────────────── */

export const BEAM_VERTEX = /* glsl */ `
  #define MAX_BEACONS 12
  attribute vec3 aBase;
  attribute vec2 aSize;
  attribute vec3 aColor;
  attribute float aStyle;
  attribute float aIndex;
  uniform vec3 uCam;
  uniform float uIntro;
  uniform float uGain[MAX_BEACONS];
  varying vec2 vUv;
  varying vec3 vColor;
  varying float vGain;
  varying float vStyle;
  varying float vFog;
  varying float vSeed;

  float easeOutBack(float t) {
    float c = 1.70158;
    float u = t - 1.0;
    return 1.0 + (c + 1.0) * u * u * u + c * u * u;
  }

  void main() {
    vUv = uv;
    vColor = aColor;
    vStyle = aStyle;
    vSeed = aIndex * 0.618;
    vGain = uGain[int(aIndex)];
    // Turn about the vertical axis to face the camera.
    vec2 toCamera = normalize(uCam.xz - aBase.xz);
    vec3 right = vec3(toCamera.y, 0.0, -toCamera.x);
    // Near beams rise first, each one overshooting slightly.
    float t = clamp(uIntro * 2.4 - aIndex * 0.11, 0.0, 1.0);
    float rise = t <= 0.0 ? 0.0 : easeOutBack(t);
    vec3 world = aBase + right * (position.x * aSize.x) + vec3(0.0, (position.y + 0.5) * aSize.y * rise, 0.0);
    vFog = exp(-distance(uCam.xz, aBase.xz) * 0.0105);
    gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.0);
  }
`

export const BEAM_FRAGMENT = /* glsl */ `
  precision highp float;
  uniform float uTime;
  uniform float uOpacity;
  uniform float uWhite;
  uniform float uHalo;
  varying vec2 vUv;
  varying vec3 vColor;
  varying float vGain;
  varying float vStyle;
  varying float vFog;
  varying float vSeed;

  void main() {
    float x = abs(vUv.x - 0.5) * 2.0;
    float y = vUv.y;
    float core = exp(-x * x * 190.0);
    float inner = exp(-x * x * 30.0) * 0.5;
    float halo = exp(-x * x * 5.5) * 0.17;
    // Brightest at the foot, thinning out towards the top.
    float column = 0.3 + 0.7 * pow(1.0 - y, 1.5);
    // Energy climbing the beam.
    float climb = 0.78 + 0.22 * sin(y * 30.0 - uTime * 2.8 + vSeed * 6.2831);
    // Expected dates breathe; tentative ones are drawn dashed.
    float steady = vStyle < 0.5 ? 1.0 : 0.72 + 0.16 * sin(uTime * 1.6 + vSeed * 9.0);
    float dashed = vStyle > 1.5 ? 0.12 + 0.88 * smoothstep(0.42, 0.5, abs(fract(y * 20.0 - uTime * 0.3) - 0.5) * 2.0) : 1.0;
    float cap = smoothstep(1.0, 0.9, y);
    float soft = (vStyle > 1.5 ? 0.45 : 1.0) * uHalo;
    float alpha = (core * dashed + (inner + halo) * soft) * column * climb * steady * cap * vGain * vFog;
    vec3 color = mix(vColor, vec3(1.0), clamp(core * 0.6 * uWhite, 0.0, 1.0));
    gl_FragColor = vec4(color, alpha * uOpacity);
  }
`

/* ── Tokens: a coin hovering in each beam ───────────────────────────────── */

export const TOKEN_VERTEX = /* glsl */ `
  #define MAX_BEACONS 12
  attribute vec3 aBase;
  attribute float aScale;
  attribute vec3 aColor;
  attribute float aIndex;
  uniform float uTime;
  uniform float uIntro;
  uniform float uGain[MAX_BEACONS];
  varying vec3 vNormal;
  varying vec3 vWorld;
  varying vec3 vColor;
  varying vec3 vLocal;
  varying vec3 vLocalNormal;
  varying float vGain;

  void main() {
    float seed = aIndex * 1.7;
    float angle = uTime * (0.7 + 0.25 * fract(seed)) + seed;
    float c = cos(angle);
    float s = sin(angle);
    mat3 spin = mat3(c, 0.0, -s, 0.0, 1.0, 0.0, s, 0.0, c);
    float t = clamp(uIntro * 2.4 - aIndex * 0.11 - 0.25, 0.0, 1.0);
    float pop = t * t * (3.0 - 2.0 * t);
    float bob = sin(uTime * 1.1 + seed * 2.0) * 0.14;
    vec3 world = aBase + vec3(0.0, bob, 0.0) + spin * (position * aScale * pop);
    vLocal = position;
    vLocalNormal = normal;
    vNormal = spin * normal;
    vWorld = world;
    vColor = aColor;
    vGain = uGain[int(aIndex)];
    gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.0);
  }
`

export const TOKEN_FRAGMENT = /* glsl */ `
  precision highp float;
  uniform vec3 uCam;
  uniform float uOpacity;
  uniform float uShade;
  varying vec3 vNormal;
  varying vec3 vWorld;
  varying vec3 vColor;
  varying vec3 vLocal;
  varying vec3 vLocalNormal;
  varying float vGain;

  void main() {
    vec3 n = normalize(vNormal);
    vec3 v = normalize(uCam - vWorld);
    float facing = abs(dot(n, v));
    float rim = pow(1.0 - facing, 2.2);
    // The coin's axis is z before it spins, so its two faces are the z caps.
    float r = length(vLocal.xy) * 2.0;
    float face = step(0.5, abs(vLocalNormal.z));
    float ring = smoothstep(0.07, 0.0, abs(r - 0.76));
    float pip = smoothstep(0.26, 0.2, r);
    float engraving = (ring + pip) * face;
    // A face catches the light as it turns towards the viewer; the milled edge always does.
    float sheen = pow(facing, 5.0);
    vec3 faceColor = vColor * (uShade + (0.8 - uShade) * sheen) + vColor * engraving * 0.5 + vec3(1.0) * pow(facing, 60.0) * 0.14;
    vec3 edgeColor = vColor * 1.1 + vec3(1.0) * 0.08;
    vec3 color = mix(edgeColor, faceColor, face) + vColor * rim * 0.6;
    gl_FragColor = vec4(color * (0.75 + 0.25 * vGain), uOpacity * clamp(vGain, 0.4, 1.0));
  }
`

/* ── Sparks rising inside the beams ─────────────────────────────────────── */

export const SPARK_VERTEX = /* glsl */ `
  #define MAX_BEACONS 12
  attribute vec3 aBase;
  attribute vec3 aColor;
  attribute vec4 aSeed;
  attribute float aIndex;
  uniform float uTime;
  uniform float uPixelRatio;
  uniform float uIntro;
  uniform float uGain[MAX_BEACONS];
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    float t = fract(uTime * (0.07 + 0.09 * aSeed.x) + aSeed.y);
    float sway = sin(uTime * 0.9 + aSeed.y * 30.0) * 0.12;
    vec3 world = aBase + vec3((aSeed.z - 0.5) * 0.7 + sway, t * aSeed.w, (aSeed.x - 0.5) * 0.7);
    vec4 view = viewMatrix * vec4(world, 1.0);
    gl_Position = projectionMatrix * view;
    float shown = clamp(uIntro * 2.0 - 0.9, 0.0, 1.0);
    vAlpha = sin(t * 3.14159) * shown * uGain[int(aIndex)];
    vColor = aColor;
    gl_PointSize = (1.5 + 2.5 * aSeed.z) * uPixelRatio * (26.0 / -view.z);
  }
`

/* ── Stars and drifting dust ────────────────────────────────────────────── */

export const STAR_VERTEX = /* glsl */ `
  attribute vec3 aSeed;
  uniform float uTime;
  uniform float uPixelRatio;
  uniform float uIntro;
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    vec4 view = viewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * view;
    float twinkle = 0.55 + 0.45 * sin(uTime * (0.6 + aSeed.x * 1.8) + aSeed.y * 40.0);
    // Dimmer towards the horizon, where the haze is.
    float lift = smoothstep(0.0, 0.32, normalize(position).y);
    vAlpha = twinkle * lift * (0.45 + 0.55 * aSeed.z) * clamp(uIntro * 1.5, 0.0, 1.0);
    vColor = mix(vec3(0.72, 0.8, 1.0), vec3(1.0, 0.86, 0.66), aSeed.x);
    gl_PointSize = (1.3 + 2.1 * aSeed.z * aSeed.z) * uPixelRatio;
  }
`

export const DUST_VERTEX = /* glsl */ `
  attribute vec3 aSeed;
  uniform float uTime;
  uniform float uPixelRatio;
  uniform float uIntro;
  uniform vec3 uTint;
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    // Motes drift towards the viewer and wrap round to the far end.
    vec3 p = position;
    float span = 120.0;
    p.z = 14.0 - mod(14.0 - p.z - uTime * (0.5 + aSeed.x * 1.3), span);
    p.x += sin(uTime * 0.25 + aSeed.y * 20.0) * 0.6;
    p.y += sin(uTime * 0.31 + aSeed.z * 20.0) * 0.3;
    vec4 view = viewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * view;
    float closeFade = smoothstep(0.5, 6.0, -view.z);
    float farFade = 1.0 - smoothstep(60.0, 110.0, -view.z);
    vAlpha = closeFade * farFade * (0.18 + 0.5 * aSeed.z) * clamp(uIntro * 1.5 - 0.3, 0.0, 1.0);
    vColor = uTint;
    gl_PointSize = (1.2 + 2.6 * aSeed.x) * uPixelRatio * (16.0 / -view.z);
  }
`

/** Soft round point, shared by sparks, stars and dust. */
export const POINT_FRAGMENT = /* glsl */ `
  precision mediump float;
  uniform float uOpacity;
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    float d = length(gl_PointCoord - 0.5);
    float alpha = smoothstep(0.5, 0.0, d);
    gl_FragColor = vec4(vColor, alpha * alpha * vAlpha * uOpacity);
  }
`

/* ── Sky: the glow on the horizon and a slow aurora above it ────────────── */

export const SKY_VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0);
  }
`

export const SKY_FRAGMENT = /* glsl */ `
  precision highp float;
  ${COMMON}
  uniform float uTime;
  uniform float uOpacity;
  uniform float uIntro;
  uniform float uAurora;
  uniform float uHorizon;
  uniform vec3 uSun;
  uniform vec3 uVeilA;
  uniform vec3 uVeilB;
  varying vec2 vUv;

  void main() {
    // x: -1..1 across the quad. y: 0 on the horizon, 1 at the top, negative below it.
    float px = (vUv.x - 0.5) * 2.0;
    float py = (vUv.y - uHorizon) / (1.0 - uHorizon);
    // Below the horizon the glow is only a reflection: it dies away much faster.
    float fy = py < 0.0 ? py * 3.2 : py;

    float core = exp(-(px * px) / 0.006 - (fy * fy) / 0.0016);
    float bloom = exp(-(px * px) / 0.07 - (fy * fy) / 0.016) * 0.42;
    float rim = exp(-abs(fy) / 0.012) * exp(-(px * px) / 0.11) * 0.5;
    float glow = core + bloom + rim;

    // Curtains of light above the horizon: stretched noise, drifting sideways.
    vec2 q = vec2(px * 2.6 + uTime * 0.01, py * 1.5);
    float fold = fbm(vec2(q.x * 1.5 + fbm(q * 2.0 + uTime * 0.018) * 1.5, q.y * 0.55));
    float curtain = smoothstep(0.34, 0.8, fold) * smoothstep(0.03, 0.26, py) * (1.0 - smoothstep(0.4, 0.92, py));
    curtain *= 1.0 - smoothstep(0.12, 0.5, abs(px - 0.3));
    vec3 veil = mix(uVeilA, uVeilB, clamp(py * 2.2 + (fold - 0.55) * 1.4, 0.0, 1.0));

    float shown = clamp(uIntro * 1.4, 0.0, 1.0);
    float veilAlpha = curtain * uAurora;
    float alpha = clamp(glow + veilAlpha, 0.0, 1.0);
    vec3 color = (uSun * glow + veil * veilAlpha) / max(glow + veilAlpha, 0.0001);
    gl_FragColor = vec4(color, alpha * uOpacity * shown);
  }
`
