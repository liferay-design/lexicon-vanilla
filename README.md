# Lexicon Vanilla

Lexicon Vanilla is a plain HTML/CSS rebuild of the Lexicon design system. It is meant for designers and collaborators who want to create quick screen mockups using the imported components, tokens, and icons.

There is no build step and no local server. Open files directly from Finder or with `file://`.

## Install as a Claude Code plugin

The easiest way to use Lexicon Vanilla on any project, without cloning this repo. Run these once in the Claude Code terminal:

```text
/plugin marketplace add https://github.com/marcoscv-work/lexicon-vanilla.git
/plugin install lexicon-vanilla@lexicon
```

When it asks, choose "Install for me" to install it globally (available in any folder).

Then, in the folder where you want your prototypes, describe the screen in natural language:

```text
create a login screen with a CMS sidebar
```

or use the command `/lexicon-vanilla:create-screen ...`. The first time in each folder it downloads the kit and asks whether to open prototypes in the browser. After that it works locally.

Updating:

- `/lexicon-vanilla:lexicon-refresh` updates the kit in your project (it never deletes your own prototypes).
- `/plugin marketplace update lexicon` updates the plugin itself.

Notes: use the HTTPS URL shown above, not the `owner/repo` shortcut (that defaults to SSH and fails without keys). The terminal CLI is the reliable path; plugin support in the desktop app is currently limited.

## Create Screen Skill

The fastest way to build a screen. This repo ships a Claude Code skill that automates the whole prototyping workflow: it picks a starting point, creates the file under `prototypes/`, invents realistic sample data when needed, and composes the screen using only existing Lexicon Vanilla components, tokens, and icons.

- Skill: `.claude/skills/create-screen/SKILL.md`
- Slash command: `.claude/commands/create-screen.md`

Use the command like this:

```text
/create-screen Create a user administration screen with a control menu, CMS sidebar, management toolbar, and user table.
```

> `.claude/` is a hidden directory on many systems. If you do not see it in Finder, enable hidden files with `Cmd + Shift + .`, or list it in the terminal with `ls -la .claude`.

Because the skill follows the repo's hard rules automatically, you normally don't need to copy files or wire up the scaffold by hand. Just describe the screen.

## Starting points and references

Before prototyping, look at what already exists. There may already be a screen close to what you need.

- **`shells/`**: base reference screens with the app chrome already wired. Start from one of these for full-page layouts.
  - `shells/cms.html`: Control Menu (top bar) + 280px CMS sidebar + content area.
  - `shells/dxp.html`: Control Panel (320px, full height) + Control Menu.
- **`prototypes/`**: existing example screens (login, user administration, AI hub, AI assistant, and more). **Examine these before starting**, since a similar layout or pattern may already exist to copy or reference instead of building from scratch.
- **`starter.html`**: a blank scaffold (skin script + stylesheets only) for screens that do not need the app chrome.
- **`showcases/`**: one live page per component, with every variant as ready-to-copy HTML.

## Authoring rules

These constraints apply to every screen (the Create Screen Skill enforces them for you):

- Use tokens from `tokens.css`; do not hard-code colors, spacing, font sizes, or radii.
- Reuse components from `components.css`; reference variants from `showcases/`.
- Use icons from `icons.svg` through `icons.js`; do not add custom icon SVGs.
- No build step and no server: every file must work over `file://`.

## Collaboration

Keep changes small and component-driven. If a screen needs a primitive that does not exist yet, add it to `components.css` instead of creating one-off prototype CSS.

Do not start a server for review. Share or open the generated HTML file directly. If something looks off, update the prototype or the shared component styles and review again via `file://`.
