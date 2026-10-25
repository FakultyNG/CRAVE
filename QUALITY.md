# Phase 7 quality report

## Automated gates

`pnpm quality` runs ESLint, TypeScript, all Vitest suites, and a production standalone build. Tests cover authentication/session rules, price calculation, payments, order transitions, growth credits, accounting reports, month-end finance rules, profit rounding, and deployment quality controls.

## Security review

- Server-only provider keys and financial encryption material stay in environment variables.
- Production rejects mock OTP, payment, and payout modes.
- PIN attempts and OTP attempts are bounded; PINs, OTPs, session tokens, and bank account numbers are stored as hashes or encrypted values as appropriate.
- Session cookies are HTTP-only, Secure in production, SameSite=Lax, and renewed within the 120-hour sliding window.
- Pricing, balances, permissions, accounting, ownership, and payouts are recalculated or authorized on the server.
- Payment and payout callbacks cannot mark money movement successful without provider verification and idempotent persisted events.
- Browser responses include CSP, anti-framing, MIME-sniffing, referrer, permissions, opener, and HSTS controls.
- Uploaded media types and sizes are allowlisted.
- `pnpm audit --prod` is a release gate; the Phase 7 review resolved the discovered transitive Zod advisory through a workspace override.

Residual operational risks are secret rotation, provider credential scope, alerting, backups, and production webhook testing. These are deployment-owner responsibilities and are listed in `DEPLOYMENT.md`.

## Accessibility and responsive review

- Root language is `en-NG`; headings and form labels use semantic HTML.
- A keyboard-visible skip link targets the page content.
- Global `:focus-visible`, reduced-motion, and forced-colour rules are present.
- Icon-only controls use accessible names; decorative images have empty alt text and content images have descriptive alt text.
- Customer pages use mobile-first breakpoints; admin tables retain horizontal scrolling rather than compressing columns; primary controls meet a minimum touch height.
- The automated quality test prevents removal of the global keyboard and motion accommodations.

Before each production promotion, manually test widths 320, 375, 768, 1024, and 1440 pixels, keyboard-only navigation, 200% zoom, screen-reader landmark order, and the kitchen audio opt-in flow in current Chrome, Safari, and Firefox.

## Performance review

Next Image supplies responsive image variants and lazy-loading, local variable fonts avoid third-party font requests, immutable framework assets use hashed caching, and Railway runs the traced standalone output. Catalogue media should continue to be uploaded in WebP/AVIF where practical; video should include posters and should not autoplay with sound.

Railway builds use Node.js 22 LTS, stable rendering semantics, a single Next.js worker, serialized static generation, Turbopack garbage collection, and disabled production source maps. This trades some build speed for predictable memory consumption on constrained builders without changing request-time behavior.
