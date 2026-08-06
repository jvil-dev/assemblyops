<!-- AGENTS.md — development guidance for the web/app volunteer SPA. -->

## Browser mechanics

Safari and Chrome are the two that must be right. On iOS every browser is WebKit,
so Safari's engine covers the whole assembly-day phone population. The rules that
follow from that:

- Use `100dvh`, never `100vh`. Mobile Safari's viewport includes the URL bar, so `100vh` layouts clip.
- Respect `env(safe-area-inset-*)`. Without it, bottom-anchored actions sit under the home indicator and can't be tapped.
- Check date and time inputs in Safari specifically — it renders them very differently from Chrome.
- Pin the target list in `browserslist` so Vite and autoprefixer build against it rather than their defaults.

The affordance, input-mode, and accessibility rules these serve live in the root
`AGENTS.md` under `## Web UI (web/app)` and stay loaded in every session.
