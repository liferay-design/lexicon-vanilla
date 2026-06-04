# Lexicon Vanilla as a Claude Code plugin (design note)

Status: proposal. Nothing in the kit changes until this is validated. This note sketches a plugin that distributes the **authoring workflow** while keeping the **design system** as the single source of truth, with proper version control and a strict token budget.

## Goals and hard constraints

1. **Centralize the source of truth.** One canonical kit, distributed and updated centrally, no drift across clones.
2. **Runtime performance must stay identical.** Prototypes keep opening over `file://` against local sibling assets (`../tokens.css`, etc.). The network never touches the runtime.
3. **Version control.** When a new kit version is published, the plugin must detect it and let the user update.
4. **Token-light.** Vanilla's whole point is to be tiny. The plugin must not inflate context usage. Deploying files is done via shell (free token-wise); the model only ever reads the few files it needs to compose.
5. **`prototypes/` and `showcases/` are valid references** and must be present locally so the skill can consult them before building.
6. **Download happens once per directory at init**, not per command.

## Layering: the plugin owns the "how", the kit owns the "what"

- **Kit (canonical):** stays in its repo, published as versioned releases. This is the design system: `tokens*.css`, `components.css`, `icons.svg`, `icons.js`, `shells/`, `showcases/`, `prototypes/`, `starter.html`.
- **Plugin (thin):** the `create-screen` skill, the `/create-screen` command, the hard rules, an optional validator, and a small `/lexicon-refresh` command. It does **not** embed the design system; it materializes a pinned copy on demand.
- **Bridge:** at init in a directory, the skill downloads the pinned kit release and lays down the working tree locally. Required anyway by `file://`, so this copy is not overhead, it is the point.

## Kit additions required (small, one-time)

Add two tiny files to the kit repo so the plugin can reason about versions cheaply:

- `VERSION` (one line, e.g. `1.4.0`): the ultra-cheap version probe.
- `kit-manifest.json`: used only during init and refresh.

```json
{
  "version": "1.4.0",
  "runtime": ["tokens.css", "tokens-high-contrast.css", "tokens-dark.css", "components.css", "icons.svg", "icons.js", "starter.html"],
  "reference": ["shells/", "showcases/"],
  "canonicalPrototypes": ["login.html", "loginFull.html", "user-administration.html", "ai-hub-landing.html", "ai-assistant-chatbot.html"]
}
```

`canonicalPrototypes` is what makes refresh safe: only these files are ever overwritten in `prototypes/`; anything else (the user's own screens) is never touched.

## Plugin layout

```
lexicon-vanilla-plugin/
  .claude-plugin/plugin.json
  commands/
    create-screen.md      (entry point, points at the skill)
    lexicon-refresh.md    (force re-sync to latest/pinned kit version)
  skills/
    create-screen/SKILL.md
```

`plugin.json` sketch (verify exact schema against current Claude Code plugin docs before building):

```json
{
  "name": "lexicon-vanilla",
  "version": "1.0.0",
  "description": "Build Lexicon Vanilla prototype screens from natural language, using only kit components, tokens, and icons.",
  "author": { "name": "Marcos Castro" }
}
```

Note: the **plugin version** (the tool) and the **kit version** (the design system) are decoupled on purpose. The plugin bumps when the workflow changes; the kit bumps when components/tokens change. The version the user asked us to check is the **kit** version.

## Init flow (once per directory)

Trigger: the skill runs in a directory that has no `.lexicon` marker.

```bash
# 1. Resolve the target version (latest published, or a value pinned by the plugin)
VER=$(curl -fsSL https://raw.githubusercontent.com/<org>/lexicon-vanilla/main/VERSION)

# 2. Download the tree at that tag, no git history, extract only kit paths
curl -fsSL https://github.com/<org>/lexicon-vanilla/archive/refs/tags/v$VER.tar.gz \
  | tar xz --strip-components=1 \
      "lexicon-vanilla-$VER/tokens.css" \
      "lexicon-vanilla-$VER/tokens-high-contrast.css" \
      "lexicon-vanilla-$VER/tokens-dark.css" \
      "lexicon-vanilla-$VER/components.css" \
      "lexicon-vanilla-$VER/icons.svg" \
      "lexicon-vanilla-$VER/icons.js" \
      "lexicon-vanilla-$VER/starter.html" \
      "lexicon-vanilla-$VER/shells" \
      "lexicon-vanilla-$VER/showcases" \
      "lexicon-vanilla-$VER/prototypes"

# 3. Record the installed version + a check timestamp
printf '{"version":"%s","lastCheck":"%s"}\n' "$VER" "$(date +%F)" > .lexicon
```

Result: a self-contained kit in the directory, identical to a manual clone, but bootstrapped by the plugin. Offline at first init is the only failure mode; once initialized, everything works offline.

## Steady-state authoring flow (fully local, token-light)

Every `/create-screen` after init:

1. Read `.lexicon` (version + lastCheck).
2. **Throttled version check** (see below).
3. Compose: copy `starter.html` or a `shells/*` base, read only the targeted `showcases/<component>.html` for components actually used, `grep` `icons.svg` for icon ids, skim `prototypes/` by `ls` + at most one targeted read.
4. Write `prototypes/<slug>.html`.

No network, no bulk file reads. Same latency as today.

## Version checking (cheap and correct)

The requirement: if a new kit version is published, it must be detected. Done without slowing authoring or burning tokens:

- The probe is a single tiny GET of `VERSION` (a few bytes), **throttled** to at most once per day per directory via `lastCheck` in `.lexicon`.
- Comparison is semver-aware in shell, so no model reasoning needed:

```bash
LOCAL=$(node -e "process.stdout.write(require('./.lexicon').version)" 2>/dev/null || sed -n 's/.*"version":"\([^"]*\)".*/\1/p' .lexicon)
REMOTE=$(curl -fsSL https://raw.githubusercontent.com/<org>/lexicon-vanilla/main/VERSION)
NEWEST=$(printf '%s\n%s\n' "$LOCAL" "$REMOTE" | sort -V | tail -1)
[ "$LOCAL" != "$REMOTE" ] && [ "$NEWEST" = "$REMOTE" ] && echo "update:$REMOTE" || echo "ok"
```

- The command outputs a single token-sized word (`ok` or `update:1.5.0`). If an update exists, the skill prints one line: "Kit 1.5.0 available, run /lexicon-refresh." It does **not** auto-download (keeps authoring instant and predictable).

## /lexicon-refresh (no-clobber)

```bash
# Re-download the latest (or a specified) version into a temp dir
# Overwrite runtime + shells/ + showcases/ + starter.html wholesale
# For prototypes/: overwrite ONLY files listed in kit-manifest.json -> canonicalPrototypes
# Never delete anything. The user's own prototypes are preserved.
# Bump .lexicon version + lastCheck.
```

This is the only place that updates files, and it is explicit, so the user is always in control of when the kit changes under their prototypes.

## Token budget discipline (non-negotiable)

What keeps it as light as vanilla itself:

- **Install via shell, never via the model.** `tar`/`cp`/`curl` move files without loading their contents into context. Vendoring the whole kit (icons.svg with 513 symbols, the big `components.css`) costs zero tokens.
- **Read only what you compose against.** Targeted `showcases/<component>.html`, never the whole `components.css`.
- **Never `cat icons.svg`.** Always `grep '<symbol id=' icons.svg | grep -i <keyword>`.
- **Skim, do not slurp, `prototypes/`.** `ls` first, read at most the one closest example.
- **Version check returns one word.** No JSON dumped into context.
- **Keep SKILL.md lean.** Reference files on disk; do not inline catalogs of components or icons into the prompt.

## Performance summary

| Phase | Cost |
|---|---|
| Runtime (open prototype) | Local `file://`, identical to today, no network ever |
| First init in a directory | One small tarball download + extract, seconds, one time |
| Authoring after init | Fully local, identical to today |
| Version check | One tiny GET, throttled to once/day, single-word output |
| Refresh | Explicit only, on demand |
| Token usage | Unchanged: only targeted reads enter context, install is shell-only |

## Open questions for validation

1. Distribution: GitHub release tarball (as sketched) vs a dedicated release asset zip. Tarball-by-tag needs nothing extra in the repo.
2. Marketplace: publish via a `marketplace.json` in this repo or a separate marketplace repo.
3. Pinning: should the plugin always target latest kit, or pin a kit version per plugin release? Recommendation: target latest, with `/lexicon-refresh 1.4.0` to pin on demand.
4. Validator: add a `/lexicon-check` subagent (tokens-only, sprite-only, no hex, no `.is-focused`) as a safety net for non-technical users? Optional, additive.

## Recommendation

Build the thin plugin with init-per-directory vendoring, throttled `VERSION` checks, and no-clobber refresh. It delivers the centralization and onboarding wins, keeps runtime and token cost identical to the current repo-clone flow, and keeps the design system where it belongs: in its own versioned repo.
