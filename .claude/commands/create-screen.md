---
description: Create a Lexicon Vanilla prototype screen under prototypes/ using only kit components, tokens, and icons.
argument-hint: [optional: short description of the screen]
---

Read the file `.claude/skills/create-screen/SKILL.md` and follow it strictly to create a prototype screen for the user.

The skill is the single source of truth for:
- The 6-step workflow (clarify only what's structurally ambiguous → invent realistic data → copy `starter.html` → compose with existing classes → verify by `file://`).
- The hard rules (tokens only, Lexicon icons only via `<use>`, no `.is-focused`, no `--color-secondary-l0..l3` for text, no build/server, no per-prototype CSS file).
- The component vocabulary and the showcase files that document each one's API.
- The icon discovery process (`grep '<symbol id=' icons.svg`).
- The mandatory `<head>` block from `starter.html`.

If `$ARGUMENTS` is non-empty, treat it as the user's initial screen description and proceed from step 1 of the skill workflow. If empty, ask the user what screen they'd like and then proceed.

User-supplied description: $ARGUMENTS
