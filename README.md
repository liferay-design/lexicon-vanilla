# Lexicon Vanilla

Lexicon Vanilla is a plain HTML/CSS rebuild of the Lexicon design system. It is meant for designers and collaborators who want to create quick screen mockups using the imported components, tokens, and icons.

There is no build step and no local server. Open files directly from Finder or with `file://`.

## Using the Repo

- Start from `starter.html` when creating a new prototype.
- Put new screens in `prototypes/`.
- Reuse components from `components.css` and examples from `showcases/`.
- Use tokens from `tokens.css`; do not hard-code colors, spacing, font sizes, or radii.
- Use icons from `icons.svg` through `icons.js`; do not add custom icon SVGs.

## Create Screen Skill

This repo includes a Claude Code skill for creating prototype screens:

- Skill: `.claude/skills/create-screen/SKILL.md`
- Slash command: `.claude/commands/create-screen.md`

Important: `.claude/` is a hidden directory on many systems. If you do not see it in Finder, enable hidden files with `Cmd + Shift + .`, or list it in the terminal with:

```bash
ls -la .claude
```

Use the command like this:

```text
/create-screen Create a user administration screen with a control menu, CMS sidebar, management toolbar, and user table.
```

The skill copies `starter.html`, creates a file under `prototypes/`, invents realistic sample data when needed, and composes the screen using only existing Lexicon Vanilla components.

## Collaboration

Keep changes small and component-driven. If a screen needs a primitive that does not exist yet, add it to `components.css` instead of creating one-off prototype CSS.

Do not start a server for review. Share or open the generated HTML file directly. If something looks off, update the prototype or the shared component styles and review again via `file://`.
