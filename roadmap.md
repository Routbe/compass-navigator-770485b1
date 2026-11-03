# Repository import
- [x] Import ROUT source, assets and dependencies without secrets or repository metadata.
- [x] Check the running public pages, navigation and route metadata.
- [x] Run relevant imported tests and check preview errors.
- [x] Report service and authenticated-flow checks blocked by missing connections.
- [ ] Verify signed-in account, payments, mail and uploads — blocked by missing original service connections and credentials.
- [ ] Verify standalone media processing — blocked by separate worker deployment.

# ROUT/PASS card directives
- [x] Add forensic guilloche on both faces, four-sided SDF microtext, tilt-driven ROUT foil and chip/antenna contours; optical fixture renders front/back/zoom without console errors, and 36 focused tests pass. No account or hardware acceptance is inferred.
- [ ] Verify forensic layers on an actual signed-in card and measure 60 fps / phone gyroscope / maximum-zoom legibility — blocked by a configured ROUT session and real target-device GPU/sensors; open the existing card, use Loep and phone tilt to check.
- [x] Implement fail-closed card status, atomic QR replay protection, source migration 0201, WebGL lifetime/motion fixes, dedicated signing secrets and independent jose RS256 verification.
- [x] Run complete tests: 338 files, 1883 tests passed; offline PostgreSQL verifies replay, expiry, audit permissions and hardware status. Live acceptance is not inferred from tests.
- [x] Add latest Google configuration aliases, issuer-scoped class validation and owner-only claim; both legacy Google profile paths also enforce ownership. 22 focused tests pass.
- [x] Retain edge-compatible jose RS256 signing, as accepted in the latest directive; independently verify the signed Wallet claim.
- [ ] Verify Google Save acceptance live — blocked by issuer credentials and a configured ROUT session.
- [x] Complete manual audit of security, integration and uploaded WebGL requirements; record evidence and release blockers in audit.md.
- [x] Remediate selected deep-scan profile finding with a field allowlist; add bounded descriptor validation and session-owner raw-profile reads.
- [x] Implement uploaded four-language pairing, NFC recovery states and localized Google Wallet payloads; validate strict 3×30 MRZ before rendering.
- [x] Review Google-supported NFC, sharing and callback controls; keep public profile passes free of private NFC secrets, first-saver ownership restrictions and false certification claims.
- [ ] Activate Google REST updates and signed save/delete callbacks — blocked by Google issuer credentials, reviewed persisted-object provisioning and a vetted ECv2SigningOnly callback verifier with durable replay storage.
- [ ] Activate Google Smart Tap and owner-bound passes — blocked by Google partner enablement, owner-only issuance and compatible terminal/verifier infrastructure.
- [x] Read uploaded requirements and verify the existing Neon connection.
- [x] Review existing card, Studio, account and Neon structures before integration.
- [x] Confirm existing privacy validation, CMF material rules and cryptographic primitives; run 35 focused tests.
- [x] Apply revised three-by-thirty MRZ generator and shared back-face rendering; retain actual TD1 field positions without claiming certification.
- [x] Replace client key registration with factory-ID pairing and a separate activation proof; prepare source-only migration 0200.
- [ ] Apply reviewed card storage migrations — blocked by required owner review of 0198/0199/0200/0201 under source-import boundaries; Neon has the account prerequisites but no card tables. Existing user_sessions must not be recreated.
- [ ] Verify physical pairing end to end — blocked by factory inventory, separate activation proof, compatible card/device and a configured ROUT sign-in session.
- [ ] Verify secure QR replay/freeze storage and terminal challenge-response end to end — blocked by reviewed card storage and terminal integration; source primitives are not a deployed hardware system.