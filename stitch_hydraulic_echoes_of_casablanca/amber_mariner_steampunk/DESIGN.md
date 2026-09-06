---
name: Amber Mariner Steampunk
colors:
  surface: '#1c110c'
  surface-dim: '#1c110c'
  surface-bright: '#453630'
  surface-container-lowest: '#160c07'
  surface-container-low: '#251913'
  surface-container: '#291d17'
  surface-container-high: '#342721'
  surface-container-highest: '#40322c'
  on-surface: '#f5ded5'
  on-surface-variant: '#dbc2b0'
  inverse-surface: '#f5ded5'
  inverse-on-surface: '#3b2d27'
  outline: '#a38c7c'
  outline-variant: '#554336'
  surface-tint: '#ffb77d'
  primary: '#ffb77d'
  on-primary: '#4d2600'
  primary-container: '#d97707'
  on-primary-container: '#432100'
  inverse-primary: '#904d00'
  secondary: '#f5ba92'
  on-secondary: '#4b270a'
  secondary-container: '#683f20'
  on-secondary-container: '#e5ac85'
  tertiary: '#e1c0ad'
  on-tertiary: '#402c1f'
  tertiary-container: '#a88b7a'
  on-tertiary-container: '#392519'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#ffdcc3'
  primary-fixed-dim: '#ffb77d'
  on-primary-fixed: '#2f1500'
  on-primary-fixed-variant: '#6e3900'
  secondary-fixed: '#ffdcc5'
  secondary-fixed-dim: '#f5ba92'
  on-secondary-fixed: '#301400'
  on-secondary-fixed-variant: '#653d1e'
  tertiary-fixed: '#fedcc8'
  tertiary-fixed-dim: '#e1c0ad'
  on-tertiary-fixed: '#29170c'
  on-tertiary-fixed-variant: '#594234'
  background: '#1c110c'
  on-background: '#f5ded5'
  surface-variant: '#40322c'
typography:
  headline-xl:
    fontFamily: Space Grotesk
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Space Grotesk
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
  headline-lg-mobile:
    fontFamily: Space Grotesk
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: IBM Plex Sans
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: IBM Plex Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-md:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: 0.05em
  label-sm:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.1em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 8px
  gutter: 24px
  margin-desktop: 64px
  margin-mobile: 20px
  container-max: 1280px
---

## Brand & Style

This design system embodies a sophisticated industrial steampunk aesthetic. It targets a niche audience that appreciates craftsmanship, historical narrative, and mechanical complexity. The UI should evoke a sense of "technological antiquity"—feeling both highly engineered and ancient.

The visual style is **Tactile / Skeuomorphic** with a heavy influence from **Cinematic Industrialism**. It utilizes deep textures, metallic sheens, and the warm glow of internal machinery to create an immersive, high-fidelity experience. The brand presence is anchored by the intricate, weathered bronze logo, which dictates a philosophy of detailed ornamentation balanced against rugged structural elements.

## Colors

The palette is derived from the "heated orange glows" and "deep wood browns" of a furnace-lit workshop.

*   **Primary (Heated Amber):** `#D97706`. Used for interactive highlights, active states, and critical information. It mimics the glow of molten metal or a lit filament.
*   **Secondary (Antique Bronze):** `#8C5E3C`. Used for iconography, decorative borders, and secondary buttons. It carries a metallic, weathered texture.
*   **Tertiary (Deep Walnut):** `#2D1B0F`. Used for container backgrounds and elevated surfaces to provide a rich, organic warmth.
*   **Neutral (Cast Iron):** `#1A0F0A`. The base background color, providing high contrast for the amber glows.

Color transitions should utilize "fire" gradients (moving from deep oxblood to bright amber) rather than simple opacity changes to maintain the industrial mood.

## Typography

The typography strategy balances technical precision with high-impact display.

*   **Headlines (Space Grotesk):** Chosen for its "technical, geometric, and futuristic" qualities that align with the engineering side of steampunk. It should be treated with subtle metallic gradients or inner shadows to feel etched into the UI.
*   **Body (IBM Plex Sans):** A systematic and reliable typeface that provides clarity amidst the heavy textures of the design. Its corporate/industrial heritage fits the "Mariner" theme perfectly.
*   **Labels (JetBrains Mono):** Used for technical readouts, metadata, and small captions. The monospaced nature evokes blueprints and punched-tape data.

All text should avoid pure white; use a slightly warmed "parchment" tint (`#E5D3B3`) for body copy to reduce eye strain against the dark backgrounds.

## Layout & Spacing

The layout follows a **Fixed Grid** model that feels like a structured mechanical assembly. Elements are placed within defined "compartments."

*   **Desktop:** A 12-column grid with generous 64px margins. Content is contained within heavy, 2px bronze borders.
*   **Mobile:** A 4-column grid. Margins compress to 20px, and structural borders are simplified to single-line dividers to maximize screen real estate.
*   **Rhythm:** An 8px base unit governs all padding and margins. Vertical rhythm is strict to maintain the "blueprinted" feel.

Layout containers should often feature "riveted" corners—small 4px circular accents at the intersections of border lines to reinforce the industrial construction.

## Elevation & Depth

Hierarchy is established through **Tonal Layers** and **Metallic Lighting**.

Instead of traditional drop shadows, this design system uses:
1.  **Inner Glows:** Interactive elements (buttons, inputs) feature a subtle internal amber glow (`#D97706` at 20% opacity) to suggest they are back-lit by a furnace or vacuum tube.
2.  **Etched Depth:** Containers use a "recessed" look with a 1px dark top border and a 1px lighter bottom highlight to appear carved into the wood/metal surface.
3.  **Backdrop Blurs:** Used sparingly for overlays, combined with a heavy grain/noise texture to mimic dirty glass or antique lenses.

## Shapes

The shape language is **Soft (0.25rem)**, moving away from modern "bubbly" curves toward a more machined, chamfered feel. 

*   Corner radii are kept tight to mimic the limits of traditional metalwork. 
*   **Large Containers:** Use `rounded-lg` (0.5rem) but are often capped with "metal plate" headers that have sharp top corners.
*   **Interactive Elements:** Buttons and tags use a consistent `0.25rem` radius. 
*   **Decorative:** Hexagonal or octagonal clippings can be used for avatars or featured icons to enhance the steampunk mechanical vibe.

## Components

*   **Buttons:** Must feel like physical switches. Use a "Bronze" gradient background with a high-contrast amber text. On hover, the "Heated Orange" glow should intensify.
*   **Input Fields:** Styled as "recessed" slots. Use `JetBrains Mono` for input text. The "cursor" should be a solid amber block.
*   **Cards:** Use the `Tertiary` color for the background with a fine `Secondary` bronze stroke. Add a subtle wood-grain texture overlay at 5% opacity.
*   **Chips/Tags:** Styled to look like small brass plaques. Use all-caps `label-sm` typography.
*   **Progress Bars:** Designed to look like glass tubes filling with liquid amber. Incorporate a slight "bubble" or "fizz" texture within the filled portion.
*   **Dividers:** Never simple lines. Use a "riveted line" style—a solid line with small dots (rivets) placed every 32px.