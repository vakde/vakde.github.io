---
version: alpha
name: Quiet Ledger
description: Warm editorial wealth dashboard for a personal asset management app.
colors:
  ink: "#17181B"
  slate: "#6C7278"
  sage: "#31554A"
  sage-soft: "#DDE7E1"
  copper: "#B56A3B"
  copper-soft: "#F0E1D4"
  paper: "#F4EFE6"
  paper-deep: "#E9DDCA"
  panel: "#FFFBF5"
  line: "#DED4C6"
  danger: "#B34E3D"
  danger-soft: "#F5DEDA"
  white: "#FFFFFF"
typography:
  display:
    fontFamily: Noto Serif KR
    fontSize: 3.5rem
    fontWeight: 600
    lineHeight: 1.04
    letterSpacing: -0.04em
  heading:
    fontFamily: IBM Plex Sans KR
    fontSize: 1.5rem
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: -0.02em
  body-md:
    fontFamily: IBM Plex Sans KR
    fontSize: 1rem
    fontWeight: 400
    lineHeight: 1.65
  label-caps:
    fontFamily: IBM Plex Sans KR
    fontSize: 0.78rem
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: 0.18em
rounded:
  sm: 14px
  md: 22px
  lg: 32px
spacing:
  xs: 8px
  sm: 14px
  md: 20px
  lg: 32px
components:
  page:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
  panel:
    backgroundColor: "{colors.panel}"
    rounded: "{rounded.md}"
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.white}"
    rounded: 999px
    padding: 14px
  button-secondary:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: 999px
    padding: 14px
---

## Overview
Quiet Ledger is a personal wealth dashboard, not a crypto terminal. It should feel calm, methodical, and premium: closer to a private bank statement or editorial financial report than a neon analytics board.

## Colors
The palette is built around warm paper tones, graphite text, one stable green for assets, and one restrained copper-rust accent for liabilities and emphasis.

- **Ink (`#17181B`)** anchors all primary text and high-confidence actions.
- **Paper (`#F4EFE6`)** and **Panel (`#FFFBF5`)** keep the interface warm and non-clinical.
- **Sage (`#31554A`)** signals assets, reserves, and health.
- **Copper (`#B56A3B`)** highlights concentration, composition, and secondary emphasis.
- **Danger (`#B34E3D`)** is reserved for liabilities, destructive actions, and risk.

## Typography
Major headings should feel report-like and deliberate, so the display face is serif. Everything interactive should remain highly readable, so labels, forms, and metadata stay in a modern sans.

## Layout
The page is organized like a desk:

1. Hero narrative with the current balance signal.
2. A compact metric strip for the most important numbers.
3. A working area for adding entries and reviewing composition.
4. A board area for assets, liabilities, and recent activity.

Whitespace should be generous. Cards should be grouped clearly enough that assets and liabilities never visually blur together.

## Elevation & Depth
Surfaces should feel layered like stacked paper on a desk: soft shadows, faint borders, subtle gradients, and occasional radial highlights. Avoid hard glassmorphism or heavy dark overlays.

## Shapes
Use large rounded corners on major surfaces and pill buttons for controls. Progress bars and tags should look precise, not playful.

## Components
- Primary actions use ink backgrounds with white text.
- Secondary actions use paper surfaces with visible borders.
- Asset cards lean sage.
- Liability cards lean rust.
- Inputs should feel substantial and document-like.

## Do's and Don'ts
Do:
- Let the numbers dominate.
- Use warm neutrals and restrained accents.
- Make assets and liabilities clearly distinct.
- Keep mobile spacing comfortable and vertically readable.

Don't:
- Use neon gradients, terminal-dark chrome, or purple-heavy palettes.
- Make every card equally loud.
- Hide key totals behind decorative elements.
- Mix analysis, entry, and history into one undifferentiated block.
