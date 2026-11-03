/**
 * ROUT Card security shader (both faces). Bounded analytic GLSL:
 * - thin-film interference foil (gold -> emerald -> deep blue) on the mask's R channel
 * - procedural guilloche rosette + wave lines, anti-aliased with fwidth
 * - latent kinegram watermark (mask G) visible only near a 45 degree view
 * - emboss: mask B is a height map that bends the normal, so light catches the print
 * - temporal noise keyed to the live server seed and the real clock
 */
import * as THREE from "three";

export const LATENT_COS = 0.7071; // cos(45 deg)
export const LATENT_WIDTH = 0.035;

const vertex = /* glsl */ `
varying vec2 vUv;
varying vec3 vWorldPos;
varying vec3 vN;
varying vec3 vT;
varying vec3 vB;
void main() {
  vUv = uv;
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorldPos = wp.xyz;
  mat3 m = mat3(modelMatrix);
  vN = normalize(m * vec3(0.0, 0.0, 1.0));
  vT = normalize(m * vec3(1.0, 0.0, 0.0));
  vB = normalize(m * vec3(0.0, 1.0, 0.0));
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;

const fragment = /* glsl */ `
uniform sampler2D uMap;
uniform sampler2D uMask;
uniform float uTime;
uniform float uFinish;   // 0 metal, 1 glass, 2 holo
uniform vec4 uSeed;      // live server seed for this 30 s window
uniform vec3 uLightPos;
uniform vec2 uTexel;
uniform float uLatentCos;
uniform float uLatentWidth;
uniform float uRough;     // < 0 = finish default, else PBR roughness
uniform float uMetal;     // < 0 = finish default, else PBR metalness
uniform float uClearcoat; // 0..1 lacquer lobe (ceramic)
uniform float uAniso;     // 0..1 brushed highlight along the card's long axis
uniform float uMotion;    // 0 disables temporal effects for reduced motion
uniform float uBack;
uniform vec3 uInkGreen;
uniform vec3 uInkSteel;
uniform vec3 uInkPlatinum;
uniform vec3 uChipMetal;
varying vec2 vUv;
varying vec3 vWorldPos;
varying vec3 vN;
varying vec3 vT;
varying vec3 vB;

float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

// Thin-film interference: one oil-slick layer (n = 1.45) of thickness d nm.
vec3 thinFilm(float cosI, float d) {
  float n = 1.45;
  float sinT2 = (1.0 - cosI * cosI) / (n * n);
  float cosT = sqrt(max(1.0 - sinT2, 0.0));
  vec3 lambda = vec3(640.0, 540.0, 455.0);
  vec3 phase = 12.566371 * n * d * cosT / lambda;
  return 0.5 + 0.5 * cos(phase);
}

float aaLine(float v, float width) {
  float distanceToLine = abs(fract(v + 0.5) - 0.5);
  float footprint = max(fwidth(v), 0.0001);
  // Fade unresolved frequencies instead of generating moire at a distance.
  return (1.0 - smoothstep(width, width + footprint, distanceToLine))
    * (1.0 - smoothstep(0.35, 1.0, footprint));
}

float boxMask(vec2 uv, vec2 lo, vec2 hi) {
  vec2 aa = max(fwidth(uv), vec2(0.0001));
  vec2 inside = smoothstep(lo - aa, lo + aa, uv) * (1.0 - smoothstep(hi - aa, hi + aa, uv));
  return inside.x * inside.y;
}

float contour(float distanceToEdge, float width) {
  float aa = max(fwidth(distanceToEdge), 0.0001);
  return 1.0 - smoothstep(width, width + aa, abs(distanceToEdge));
}

void main() {
  vec4 base = texture2D(uMap, vUv);
  vec3 mask = texture2D(uMask, vUv).rgb * (1.0 - uBack);
  // Never print optical layers over QR quiet zones, portraits or MRZ.
  float frontReserved = max(boxMask(vUv, vec2(0.047, 0.033), vec2(0.242, 0.158)),
    1.0 - smoothstep(0.235, 0.25, length((vUv - vec2(0.5, 0.58)) * vec2(1.0, 1.588))));
  float backReserved = max(boxMask(vUv, vec2(0.108, 0.392), vec2(0.892, 0.889)),
    1.0 - smoothstep(0.148, 0.16, vUv.y));
  float printable = 1.0 - mix(frontReserved, backReserved, uBack);

  // Emboss: height gradient from the mask's blue channel bends the normal.
  float hL = texture2D(uMask, vUv - vec2(uTexel.x, 0.0)).b;
  float hR = texture2D(uMask, vUv + vec2(uTexel.x, 0.0)).b;
  float hD = texture2D(uMask, vUv - vec2(0.0, uTexel.y)).b;
  float hU = texture2D(uMask, vUv + vec2(0.0, uTexel.y)).b;
  vec3 N = normalize(vN - vT * (hR - hL) * 1.4 - vB * (hU - hD) * 1.4);
  N *= float(gl_FrontFacing) * 2.0 - 1.0;

  vec3 V = normalize(cameraPosition - vWorldPos);
  vec3 L = normalize(uLightPos - vWorldPos);
  vec3 H = normalize(L + V);
  float cosV = clamp(dot(N, V), 0.0, 1.0);

  // Guilloche: a rosette and a wave field, both resolution independent.
  vec2 p = (vUv - 0.5) * vec2(1.0, 1.588);
  float r = length(p);
  float a = atan(p.y, p.x);
  float rose = aaLine(r * 96.0 + 0.85 * sin(a * 12.0) + 0.35 * sin(a * 7.0 + r * 38.0), 0.022);
  float rose2 = aaLine(r * 91.0 - 0.85 * sin(a * 12.0 + 1.3), 0.022);
  float waves = aaLine(p.y * 112.0 + 1.6 * sin(p.x * 26.0 + p.y * 8.0), 0.02);
  float crossWaves = aaLine(p.x * 103.0 + 1.1 * sin(p.y * 19.0 - p.x * 5.0), 0.02);
  float guilloche = max(max(rose, rose2) * (1.0 - smoothstep(0.15, 0.72, r)), max(waves, crossWaves) * 0.65) * printable;

  // Finish weights without branches.
  float isGlass = step(0.5, uFinish) * step(uFinish, 1.5);
  float isHolo = step(1.5, uFinish);
  float isMetal = 1.0 - isGlass - isHolo;
  float rough = mix(mix(0.38, 0.06, isGlass), 0.2, isHolo);
  rough = mix(rough, clamp(uRough, 0.03, 1.0), step(0.0, uRough));
  float shininess = 2.0 / (rough * rough * rough * rough + 1e-3);

  // Foil: thin film whose thickness flows over the card, so colours sweep with tilt.
  float foil = max(mask.r, isHolo * 0.45 + guilloche * 0.25 * isHolo);
  float thickness = 360.0 + 260.0 * sin(p.x * 3.1 + p.y * 2.3 + uSeed.w * 6.2831) + 120.0 * guilloche;
  vec3 film = thinFilm(cosV, thickness);
  // Bias toward ROUT gold / emerald / deep blue.
  film = mix(film, film * vec3(1.05, 0.98, 1.1) + vec3(0.04, 0.02, 0.0), 0.5);

  float diff = clamp(dot(N, L), 0.0, 1.0);
  float NdotH = clamp(dot(N, H), 0.0, 1.0);
  float spec = pow(NdotH, shininess) * (shininess + 8.0) / 25.0;
  // Brushed metal: stretch the highlight along the tangent (Ward-like, no branches).
  float hT = dot(H, vT);
  float hB = dot(H, vB);
  float aniso = exp(-(hT * hT * 900.0 + hB * hB * 18.0) / max(NdotH, 0.05)) * (shininess + 8.0) / 40.0;
  spec = mix(spec, aniso, clamp(uAniso, 0.0, 1.0));
  float F0 = mix(mix(0.6, 0.04, isGlass), 0.3, isHolo);
  F0 = mix(F0, mix(0.04, 0.9, clamp(uMetal, 0.0, 1.0)), step(0.0, uMetal));
  float fres = F0 + (1.0 - F0) * pow(1.0 - cosV, 5.0);

  // Cheap studio environment for reflections.
  vec3 R = reflect(-V, N);
  vec3 env = mix(vec3(0.05, 0.05, 0.07), vec3(1.0), smoothstep(-0.1, 0.9, R.y));
  env += vec3(0.55, 0.65, 1.0) * smoothstep(0.55, 1.0, -R.x) + vec3(1.0, 0.8, 0.9) * smoothstep(0.6, 1.0, R.x) * 0.6;

  vec3 col = base.rgb * (0.38 + 0.72 * diff);
  col *= 1.0 - guilloche * 0.08 * (isMetal + isHolo);
  vec3 metalTint = mix(vec3(1.0), base.rgb + 0.08, 0.8 * isMetal);
  col += min(spec, 1.6) * metalTint * (1.0 - rough) * 0.28;
  // Clearcoat lacquer: a tight white lobe on top, weighted by Fresnel.
  col += pow(NdotH, 900.0) * 6.0 * uClearcoat * (0.04 + 0.96 * pow(1.0 - cosV, 5.0)) + pow(NdotH, 900.0) * 1.2 * uClearcoat;
  col += env * fres * mix(0.09, 0.2, isGlass);
  col = mix(col, film * (0.55 + env * 0.5 + spec * 0.8), foil * (0.55 + 0.4 * (1.0 - cosV)));
  float inkAngle = clamp((1.0 - cosV) * 2.0 + dot(L, vT) * 0.35 + 0.25, 0.0, 1.0);
  vec3 securityInk = mix(uInkGreen, uInkSteel, smoothstep(0.0, 0.65, inkAngle));
  securityInk = mix(securityInk, uInkPlatinum, smoothstep(0.6, 1.0, inkAngle));
  col = mix(col, securityInk * (0.7 + 0.3 * diff), guilloche * 0.48);

  // Printed dual-interface module: rounded perimeter, segmented contacts, NFC arc.
  vec2 chip = (vUv - vec2(0.78, 0.19)) * vec2(1.0, 1.588);
  vec2 q = abs(chip) - vec2(0.063, 0.047);
  float chipSdf = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - 0.012;
  float chipInside = 1.0 - smoothstep(-0.001, 0.001, chipSdf);
  float contacts = max(contour(chip.x, 0.0015), max(contour(abs(chip.y) - 0.022, 0.0015), contour(abs(chip.x) - 0.032, 0.0015))) * chipInside;
  float chipLines = max(contour(chipSdf, 0.0015), contacts);
  vec2 antenna = (vUv - vec2(0.5, 0.49)) * vec2(1.0, 1.588);
  float arc = max(contour(length(antenna) - 0.42, 0.001), contour(length(antenna) - 0.435, 0.001));
  arc *= smoothstep(-0.02, 0.02, antenna.x) * printable;
  float hardware = max(chipLines, arc * 0.6) * mix(0.16, 0.8, uBack);
  col = mix(col, uChipMetal * (0.65 + diff * 0.35) + film * fres * 0.15, hardware);

  // Latent image: Gaussian window around 45 deg, effectively zero at 0 deg.
  float latent = exp(-pow((cosV - uLatentCos) / uLatentWidth, 2.0)) * mask.g;
  col += latent * vec3(0.85, 1.0, 0.92) * 0.85;

  // Temporal security noise: changes 60x/s and per 30 s server window.
  float tick = floor(uTime * 60.0);
  float n = hash12(gl_FragCoord.xy + uSeed.xy * 4096.0 + tick * vec2(1.618, 2.718));
  float strobe = step(0.5, fract((vUv.x + vUv.y) * 180.0 + uTime * (3.0 + uSeed.z * 4.0)));
  // Visual texture, not protection against screenshots or recording.
  col += ((n - 0.5) * 0.012 + (strobe - 0.5) * 0.003) * uMotion * printable;
  // Preserve exact printed QR, portrait, identity and MRZ pixels on both sides.
  col = mix(base.rgb, col, printable);

  gl_FragColor = vec4(max(col, 0.0), 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

export function createSecurityMaterial(map: THREE.Texture, mask: THREE.Texture, texel: [number, number], back = false): THREE.ShaderMaterial {
  const tokens = getComputedStyle(document.documentElement);
  const ink = (name: string) => new THREE.Color(tokens.getPropertyValue(name).trim());
  return new THREE.ShaderMaterial({
    vertexShader: vertex,
    fragmentShader: fragment,
    toneMapped: true,
    uniforms: {
      uMap: { value: map },
      uMask: { value: mask },
      uTime: { value: 0 },
      uFinish: { value: 0 },
      uSeed: { value: new THREE.Vector4(0.5, 0.5, 0.5, 0.5) },
      uLightPos: { value: new THREE.Vector3(0, 1, 2.4) },
      uTexel: { value: new THREE.Vector2(texel[0], texel[1]) },
      uLatentCos: { value: LATENT_COS },
      uLatentWidth: { value: LATENT_WIDTH },
      uRough: { value: -1 },
      uMetal: { value: -1 },
      uClearcoat: { value: 0 },
      uAniso: { value: 0 },
      uMotion: { value: 1 },
      uBack: { value: back ? 1 : 0 },
      uInkGreen: { value: ink("--card-security-ink-green") },
      uInkSteel: { value: ink("--card-security-ink-steel") },
      uInkPlatinum: { value: ink("--card-security-ink-platinum") },
      uChipMetal: { value: ink("--card-security-chip-metal") },
    },
  });
}
