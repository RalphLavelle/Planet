# Cursor Prompt Addendum: Destination-Inspired Visual Identity and Iconography

Use this prompt as a design-focused follow-up to the Personalised Travel Guide MVP build prompt. Apply it to the existing application rather than rebuilding the project from scratch.

## Objective

Make the travel guide feel like a beautifully designed travel publication, not a generic itinerary dashboard.

Every trip guide should have a distinctive visual identity inspired by its destination. Use location-specific decorative motifs, illustrations, icons, patterns, colours and small visual details throughout the web frontend.

These elements should make the guide feel personal, memorable, playful and connected to the place being visited.

**Do not simply scatter generic travel emojis throughout the interface.** Build a coherent destination-inspired visual design system that combines functional icons with culturally relevant decorative elements.

## 1. Destination-aware design system

Create a reusable destination-theme system that can select or generate a visual theme based on the trip's destination.

A theme should be able to define:

- Primary and secondary colours.
- Background and accent colours.
- Decorative motifs and patterns.
- Destination-specific illustrations or silhouettes.
- Relevant functional icon choices.
- Optional borders, dividers, badges and ornamental details.
- Hero-section styling.
- Card and section decoration.
- Typography recommendations where appropriate.

The underlying layout and interactions must remain consistent across destinations. The destination theme should change the visual presentation, not require a separate application or page implementation for every city.

Keep the theme configuration separate from the main UI components so additional destinations can be introduced easily.

## 2. Athens and Greece: initial reference theme

Use Athens as the first fully developed destination theme.

The visual identity should draw inspiration from Greek architecture, mythology, traditional decorative arts and Mediterranean life.

Potential design elements include:

- **Evil-eye motifs (mati):** Small blue-and-white circular motifs used as tasteful decorative accents, section markers or ornaments.
- **Greek key patterns:** Meander-inspired borders, separators or subtle repeating patterns.
- **Acropolis and Parthenon silhouettes:** Simplified architectural illustrations used in hero sections, page headers or decorative backgrounds.
- **Olive branches and olive leaves:** Small botanical ornaments and dividers.
- **Mediterranean colours:** Deep Aegean blue, white, warm limestone, terracotta and muted olive green.
- **Greek-inspired visual details:** Classical columns, ancient pottery silhouettes, sun motifs and understated geometric patterns.
- **Destination-specific decorative icons:** Small illustrations for ancient ruins, archaeological sites, Greek food, beaches, rooftop views and neighbourhood walks.

Use these elements with restraint and good design judgement. The result should feel contemporary, colourful, welcoming and distinctly Greek, rather than a souvenir-shop caricature.

Avoid making every element blue and white or covering the interface in Greek patterns. Preserve whitespace, readable typography and clear visual hierarchy.

## 3. Other destinations must look genuinely different

Build the architecture so other destinations can have their own visual identities.

Examples of possible themes:

- **Tokyo:** Japanese-inspired geometric patterns, restrained cherry-blossom motifs, lanterns and a suitable Japanese-inspired colour palette.
- **Rome:** Warm travertine tones, terracotta, classical architectural silhouettes and Roman geometric ornamentation.
- **Istanbul:** Bosphorus blues, tulip motifs, geometric tile-inspired patterns and architectural silhouettes inspired by the city's historic skyline.
- **Paris:** Elegant typography, architectural line drawings, understated floral details and a refined Parisian palette.

These are examples, not a requirement to build complete themes for every city immediately.

Implement a robust theme-selection mechanism. For destinations without a dedicated theme, fall back to a tasteful, destination-neutral travel theme rather than displaying incorrect cultural imagery.

Do not assume a destination's identity from its name alone when the name is ambiguous. Where necessary, use the destination's country or geographic coordinates.

## 4. Functional icons versus decorative iconography

Distinguish between two kinds of visual elements.

### Functional icons

These communicate actions or information, such as:

- Weather and temperature.
- Restaurants and food.
- Walking and transport.
- Museums and attractions.
- Shopping.
- Opening hours.
- Money and estimated costs.
- Maps and directions.
- Adding, editing and removing itinerary items.

Use a consistent, accessible icon library such as Lucide for these functional elements. Functional icons should be immediately recognisable and behave consistently throughout the application.

### Decorative destination iconography

This establishes the personality of the guide. It includes evil eyes, Greek keys, architectural silhouettes, regional botanical motifs and destination-specific illustrations.

Create decorative motifs using lightweight SVG illustrations, CSS patterns, locally stored assets or a suitable illustration library. Use actual artwork or custom SVGs for culturally specific symbols when generic icon libraries do not contain appropriate designs.

Decorative elements should not be presented as interactive controls unless they genuinely perform an action.

## 5. Where destination motifs should appear

Incorporate destination-specific visual elements into several parts of the guide:

- The trip hero or cover section.
- Page headings and section dividers.
- Day-of-the-week or itinerary-day headers.
- Small badges for activity categories.
- Activity cards and image frames.
- Empty states and loading states where appropriate.
- Subtle background patterns and decorative corners.
- Map-section headers and travel-tip sections.
- Small accents throughout the trip navigation.

Do not force a decorative motif into every component. Some cards and information panels should remain clean and minimal.

The most prominent destination artwork should appear in the hero section, with smaller recurring motifs reinforcing the theme throughout the guide.

## 6. Visual design quality

The interface should balance a playful, destination-specific personality with the quality of a premium travel magazine.

Requirements:

- Use a coherent design-token system for colours, spacing, typography, borders and radii.
- Prefer original or reusable SVG motifs to emoji-based approximations for the main decorative elements.
- Use CSS or SVG for simple geometric patterns rather than unnecessarily large image assets.
- Keep illustrations lightweight and avoid introducing excessive dependencies.
- Ensure that motifs scale correctly on mobile and desktop.
- Respect reduced-motion preferences if animations are added.
- Maintain readable contrast and accessible text.
- Never let decorative elements obscure itinerary details, maps or interactive controls.
- Avoid excessive animation, clutter and ornamental borders around every card.

Use small decorative animations only when they enhance the experience, and never make core functionality depend on them.

## 7. Technical implementation

Implement a destination-theme configuration and reusable components, for example:

- `DestinationTheme`
- `DestinationThemeProvider`
- `DestinationHero`
- `DestinationMotif`
- `ThemedSectionDivider`
- `ActivityCategoryIcon`

The exact component names may vary, but keep the architecture modular.

A destination theme should be selected using the trip's destination metadata, with sensible defaults and a fallback theme.

Do not hard-code Athens-specific motifs into generic itinerary components. Athens-specific visual details should come from the theme configuration or dedicated destination-theme components.

Ensure the destination theme survives page reloads because it should be derived from the saved trip destination, not temporary component state.

Use a small set of locally available decorative assets for the MVP. Do not require an external illustration API or paid image service just to display destination motifs.

## 8. Acceptance criteria

The implementation is complete when:

1. An Athens trip displays a coherent Greek-inspired visual identity, including recognisable decorative motifs such as evil eyes, Greek key patterns or an Acropolis-inspired silhouette.
2. Functional icons remain consistent and understandable regardless of destination.
3. A destination without a dedicated theme receives an attractive neutral fallback.
4. The destination theme is reusable and can be extended without rewriting the itinerary UI.
5. Decorative assets render correctly on mobile and desktop.
6. The design remains readable, accessible and visually balanced.
7. Destination-specific artwork is implemented in the actual running application, not merely described in documentation or shown in a static mockup.
8. The application continues to work without external image or illustration API credentials.

Prioritise a beautifully executed Athens theme for the MVP, while making the architecture ready for other destinations.

## Final instruction

Inspect the existing application, implement this visual system in the running codebase, and verify it on the main trip guide and itinerary views. Preserve existing functionality, repository abstractions, data models and tests. Run the available checks and report the files changed and any remaining limitations.
