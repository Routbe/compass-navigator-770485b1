# ROUT/PASS audit — 2026-11-03

## Scope and verdict
Read-only application review of authentication, card authorization, QR replay/freeze, factory pairing, Google Wallet, multilingual payloads, MRZ, WebGL rendering and source migrations. No application fixes, live migrations or account changes were applied during this audit. The product is not ready to be described as a secure deployed identity/hardware system.

## Evidence collected
- Full existing test suite: 331 files, 328 passed and 3 failed; 1,847 tests, 1,841 passed and 6 failed. One suite failed during setup. The shell reached its 180-second deadline; the captured test report completed at 186.45 seconds and contains the final counts.
- Focused wallet/physics suite: 13 files and 77 tests passed.
- Latest preview build log: build OK at 20:58:28 UTC.
- Browser verification with the 3d-game harness at 1280×1800 and 390×844: dashboard access redirects to sign-in; no page errors or failed requests. Screenshots show sign-in, not a rendered card. This does not verify authenticated flows or 3D output.
- My Neon gateway query returned HTTP 200. Targeted information_schema lookup confirms none of card_freezes, card_designs, card_token_uses, physical_keys, hardware_challenges or factory_card_inventory exists in public.
- Dependency scan reports a critical Better Auth 1.6.23 OAuth-state advisory, fixed in 1.7.7, plus high/moderate dependency advisories. Applicability to each enabled flow needs review; a scanner finding is not an exploit demonstration.
- Basic managed-backend scan does not apply to this Neon-backed project and is not a clean bill of health. Automated deep code scan started; its results are still pending.

## Release blockers, prioritized
1. **High: secure verification degrades open.** card-freeze.server.ts:19–36 treats missing freeze/status storage as active; useTokenNonce returns null on missing storage at 89–96. card-verify.server.ts:23–26 rejects only false, so null returns valid without replay protection. A genuine token can be replayed within its lifetime in that state. Reject unavailable security state and require atomic successful nonce consumption.
2. **High: inconsistent revocation enforcement.** wallet.functions.ts:56–71 and 120–122 use cardFrozen rather than the linked-hardware status policy. A physical-key freeze/revoke does not stop these live-code paths. Current SQL maps revoked hardware to frozen; the TypeScript cardStatus parser nevertheless permits unknown/null/revoked strings by treating everything except frozen as active. Authorize only a positively established active state across every path.
3. **Critical dependency advisory / high configuration risk.** Upgrade and regression-test Better Auth and its compatible passkey package. Independently, better-auth.server.ts:58–64 derives the auth secret from DATABASE_URL or NEON_API_KEY when a dedicated secret is absent. Separate these trust domains; credential rotation must not silently change login signing material. Preserve the existing cookie architecture while reviewing the fix.
4. **Medium: identifier stability.** wallet-payload.server.ts:24–40 falls back to public-handle-derived card serials without an adequate WALLET_ID_SECRET. Renaming a handle can orphan security bindings; changing the secret can also change serials. Require stable configured identity material before enabling security, with an explicit rotation/migration policy.
5. **Medium: unknown age is not consistently denied.** Liveness defaults age lookup exceptions to adult; minor-safety.server.ts:116–118 converts absent/null age results to false. Design saving's catch-to-minor cannot cover a successful unknown result. Adult-only materials require positively established adult status.
6. **Operational: physical authentication is not integrated.** Factory pairing checks a separate activation proof but does not itself prove chip private-key possession. Challenge helpers/access-token primitives have no complete production terminal handshake. Live card schema, factory inventory and actual device/session tests are required.

## WebGL directive findings
- Implemented in source: custom GLSL, approximate thin-film/Fresnel effects, procedural guilloche, angle-dependent latent image, selected SDF text and damped spring motion.
- Definite shader portability bug: card-shader.ts:98 uses reversed smoothstep edges. Replace smoothstep(0.62, 0.15, r) with 1.0 - smoothstep(0.15, 0.62, r).
- Resource lifetime issue: RoutCard3D.tsx:155–162 disposes stable geometry whenever changing textures/materials triggers cleanup. Separate cleanup lifetimes.
- Readiness is merely two frame callbacks, not verified glyph/shader readiness; it does not reset reliably on scene changes/fallback.
- WebGL ignores reduced-motion preference; idle spin, floating, noise and strobe continue. Runtime context-loss fallback has no explicit recovery path.
- Gyro limits nominal central tilt to about 34°, below the intended centered 45° reveal. Orientation calibration and actual-device measurements are absent.
- Foil/latent masks and some text remain 640×1016 canvas artwork, not entirely resolution-independent SDF.
- Public seed/client-clock noise authenticates nothing and cannot make screenshots/recordings mathematically unforgeable. No independent visual/sensor verifier exists. 60/120 FPS cannot be guaranteed from source or this software-rendered environment.
- Authenticated 3D rendering, real GPU frame rate, gyroscope, haptics and NFC were not verified. To inspect them, sign in, open the ROUT Card in Studio and exercise flip, zoom, phone tilt and pairing on compatible hardware after service setup.

## Google Wallet and format boundaries
RS256 save signing and exhaustive four-language dictionary construction are tested. Existing passes remain public profile shares with a static profile QR, not owner credentials. REST updates, vetted ECv2SigningOnly callbacks with durable nonce storage, Smart Tap approvals, terminal redemption and owner-only provisioning remain absent/pending. No unsupported hasLinkedDevice control or private OTP secret should be inserted into public Save JWTs.

MRZ generation has 3×30 restricted-character and 7/3/1 checksum integrity. Hash-filled birth fields and ROUT issuer RTB are a privacy extension, not official ICAO certification. Calendar semantics, expired-document policy and universal scanner acceptance are not established.

## Failed tests
- ProfileHubPicker.test.tsx: incomplete TanStack mock lacks createMiddleware; suite fails before test execution.
- migration-replay.test.ts: checked-in schema snapshot differs from ordered source migrations by 17 catalog entries, including prepared card objects and oidc_subjects. This is a source snapshot mismatch, not evidence migrations were applied live.
- OmniIngestPanel.test.tsx: five cases cannot locate translated controls; output contains untranslated omni.* keys. Investigate isolated i18n initialization/mocking before treating these as production flow defects.

## Follow-up order
First close fail-open verification and auth/dependency risks; then establish stable IDs and age-denial rules; reconcile source tests/snapshots; review/apply approved schema and configure services; finally verify signed-in card, hardware and Wallet flows and profile real-device rendering. Await automated deep-scan findings before closing the security audit.