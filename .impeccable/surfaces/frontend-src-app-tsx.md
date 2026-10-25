---
version: 1
slug: "frontend-src-app-tsx"
primary_target: "frontend/src/App.tsx"
related_targets: []
---

# Surface brief: Password Auditor app (all tool pages)

Scope: the whole app shell and its seven tool pages (Analyzer, Attack Simulator, Hashing Lab, Rainbow Table, Bulk Audit, Generator, ML Lab). Mode: Operate.
Audience: public visitors checking a password and learning how attacks and storage work.
Task: type a password, read its verdict and the evidence behind it, watch it attacked, see how it should be stored.
Constraints: analysis is client-side; server demos are explicit and labelled; all sample data synthetic and labelled.
Memorable moment: the drum row in the Attack Simulator spinning and locking character by character.

## Direction contract

THESIS: A password checker that shows the machine at work, set in the Bletchley bombe room: the attack is a row of drums, evidence is weighed in bits. Refuses the category default of a neon-green hacker terminal and the coloured-bar SaaS meter.

OWN-WORLD: Black-lacquer shell (#121212 family, warm) with steel-grey rails; reading surfaces are pale steel paper (cool off-white, never cream). Each tool owns one drum-ring hue at full strength used for its rail tab, active states and charts: Analyzer signal red, Attack oxide orange, Hashing brass yellow, Rainbow violet, Bulk teal, Generator green, ML ultramarine. UI in Figtree, all data, drums, hashes and passwords in JetBrains Mono. Hairline steel rules, 4px radii, no glass, no gradients.

STORY: Visitor types a password, sees bits of evidence and named patterns with a fix beside each, runs the attack and watches drums lock, then learns why Argon2id storage defeats it.

FIRST VIEWPORT: Left steel rail with seven tool tabs (hue chip each, current tab filled in its hue). Main area: large mono password field across the top; beneath it a horizontal tick scale in bits (0-128) with the needle and verdict word; right column: crack-time table by hash type; below: pattern findings list. Primary action: "Attack this password" button in the Attack hue.

FORM: Bombe Room, candidate 7 of 7 on the grounded list (seed: 3d8d9da56e07a6cf). Signature interaction: drum row, one mono drum per character, cycling glyphs and locking with a short overshoot; also used in miniature as the Analyzer loading state. Motion grammar: mechanical, 120-220ms, ease-out-quart, a single 4% overshoot on lock; prefers-reduced-motion shows final state.
Raises: from acetate manual tab board: each tool owns one full-strength hue, total commitment, no shared accent. From monochrome product marketing: every number is paired with its proof (crack time states hardware, hash, guesses/sec). From Ikeda datamatics: hash digests drawn as deterministic bar fields from their bytes, so the avalanche effect is visible. From Crouwel grid specimen: the password is set in fixed character cells, the same cells the drums occupy.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
