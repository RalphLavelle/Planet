# Personalised Travel Guide MVP — Cursor Build Prompt

## 1. Your role and objective

Act as a senior full-stack developer and pragmatic software architect.

Build a working MVP of a web application that allows individual travellers to generate, customise and use a personalised, web-based travel guide for a city break or holiday.

The product creates a private, shareable travel website for each trip. It combines a personalised multi-day itinerary, place descriptions, photographs, maps, directions, estimated costs, weather information and other useful travel details.

The guide should be designed to evolve into a production application with a real database and live third-party data integrations. However, **the MVP must run locally without a database, paid API keys or external service credentials**.

Do not merely produce a design, static prototype or implementation plan. Build the functioning application, run the available checks, fix errors and document how to run it.

## 2. Start by inspecting the workspace

Before making changes:

1. Inspect the existing repository, files, package configuration and current application structure.
2. Identify any existing code or conventions that should be preserved.
3. If an application already exists, extend it rather than replacing it unnecessarily.
4. If the workspace is empty, initialise an appropriate project.
5. Briefly state the implementation approach and then proceed with the implementation. Do not stop to ask for approval of ordinary technical decisions.

Keep the solution appropriately simple for an MVP. Do not introduce microservices, a complex agent framework or unnecessary infrastructure.

## 3. Product experience

Build a polished, responsive website that works particularly well on mobile devices.

The core user journey is:

1. The traveller creates a new trip.
2. They enter their destination, dates, accommodation or starting location, native currency and personal preferences.
3. The application generates a complete draft itinerary.
4. The traveller reviews and edits the itinerary.
5. The application saves the trip and provides a unique URL.
6. The traveller can reopen the guide, share it with others and use it throughout the holiday.
7. The guide displays weather and other relevant information where available, with clear indications of whether the information is live, estimated or demonstration data.

Use Athens as the initial demonstration destination, but do not hard-code the application to Athens. Users must be able to enter other destinations.

## 4. Technology stack

Use the following defaults unless the existing project has a compelling reason to use something else:

- Next.js with React and TypeScript.
- A modern, mobile-first component and styling system.
- PostgreSQL-compatible domain models and repository interfaces.
- Browser-based persistence for the initial implementation.
- Zod or an equivalent schema-validation library.
- A modular architecture that can accommodate a real backend, authentication and third-party integrations later.

Use strict TypeScript where practical. Avoid `any` unless genuinely necessary and documented.

Keep dependencies manageable. Explain any significant deviation from these choices in the README.

## 5. Critical architectural requirement: repository pattern

There is no database available at this stage. The application must work without one.

Implement a repository abstraction that separates persistence from the application and presentation layers.

For example, create interfaces along these lines:

- `TripRepository`
- `PlaceRepository`, if needed
- `WeatherRepository` or an equivalent data-provider abstraction, where appropriate

Implement browser-backed repositories such as:

- `LocalStorageTripRepository`
- `SessionStorageTripRepository`, if useful for temporary drafts or explicitly ephemeral data.

Use local storage as the default persistence mechanism for saved trips. Use session storage only where its shorter lifetime is appropriate. Explain the distinction in the README.

The browser storage implementation must be safe in a Next.js environment: do not access `window`, `localStorage` or `sessionStorage` during server-side rendering.

### Repository design rules

1. Components must not access browser storage directly.
2. Components must not contain persistence logic.
3. Business logic must depend on repository interfaces, not browser storage implementations.
4. Repository implementations must be replaceable without rewriting the UI.
5. Keep repository interfaces independent of browser-specific APIs.
6. Use asynchronous repository methods where appropriate, even if the browser implementation can respond immediately. A future database implementation will involve asynchronous I/O.
7. Validate persisted data when reading it. Handle missing, malformed or outdated stored data gracefully.
8. Use a versioned storage format and provide a migration mechanism for future changes.
9. Provide a way to clear demonstration data and reset the application.
10. Avoid unnecessary duplication of trip data.

Create a central composition or dependency-injection point where the active repositories are selected. Do not instantiate browser storage repositories throughout the application.

Document exactly how a future developer could add a `SupabaseTripRepository` or `PostgresTripRepository` and switch implementations through configuration without changing the presentation layer.

Do not implement a fake database or pretend that browser storage is a secure, multi-device database.

### Browser storage limitations

Acknowledge and handle the following:

- Local storage belongs to a particular browser and device.
- Clearing browser data can delete saved trips.
- Session storage is generally lost when the tab or browsing session ends.
- Browser storage is not suitable for confidential information.
- A unique URL alone does not make a trip accessible on another device.
- Browser-only persistence cannot support reliable cross-device synchronisation.

The MVP must communicate these limitations clearly.

## 6. Data model

Define explicit, validated TypeScript models for the core domain.

### Trip

Include:

- Stable trip ID.
- Destination name and, where available, geographic coordinates.
- Arrival and departure dates.
- Destination time zone when known.
- Native currency code.
- Accommodation or starting location.
- Traveller preferences.
- Creation and last-updated timestamps.
- Itinerary data.
- Sharing settings and any supported local access token.
- Data/schema version where appropriate.

### Traveller preferences

Include:

- Interests, such as history, food, art, architecture, nightlife, nature and shopping.
- Budget level.
- Preferred daily pace.
- Walking tolerance.
- Travelling party, including solo, couple, family or group.
- Optional dietary or accessibility requirements.
- Additional notes.

Do not require every field. Provide sensible defaults and allow optional answers.

### Itinerary day

Include:

- Stable ID.
- Calendar date.
- Optional title and notes.
- Ordered activities.

### Activity

Include:

- Stable ID.
- Associated place, where applicable.
- Title and short description.
- Activity category.
- Planned start time.
- Estimated duration.
- Estimated cost and currency.
- Optional latitude and longitude.
- Optional image and map references.
- Source and freshness metadata for information that can change.
- User-edited or manually added status.

Use explicit types for monetary amounts and currency codes. Avoid treating an unverified price as an exact amount.

### Place

Represent a place independently from a scheduled activity. Include its provider ID when available, name, coordinates, categories, description, contact or website references where supported, opening-hours information and source metadata.

Do not assume that a place's details and a traveller's scheduled visit are the same entity.

Keep the domain model ready for a future relational database, without building an unnecessarily elaborate schema.

## 7. Trip creation wizard

Implement a friendly multi-step or well-organised trip creation form.

Required information:

- Destination.
- Arrival date.
- Departure date.
- Native currency.

Optional information:

- Accommodation or starting address.
- Interests.
- Budget.
- Preferred pace.
- Walking tolerance.
- Travelling party.
- Dietary and accessibility preferences.
- Additional notes.

Validate dates and sensible trip lengths. Provide clear error messages.

Do not require a precise home or accommodation address. Let users enter a general area or manually select a starting location.

Include a preview or confirmation step before saving the generated itinerary.

## 8. Itinerary generation

Implement an `ItineraryGenerator` interface that can support different implementations.

Provide:

- A deterministic, local demonstration implementation that works without API keys.
- An extension point for a future LLM-based implementation.

The local implementation must generate a coherent, multi-day example itinerary based on the user's destination, dates and selected interests. It should produce varied activities, reasonable durations and a plausible schedule rather than duplicating identical activities across every day.

Use clearly labelled demonstration content and avoid inventing precise live prices, opening hours or ticket availability.

The generator should return validated structured data matching the domain models.

If a real AI integration is added, keep API keys on the server and validate all generated output before saving it.

Do not make a live LLM call necessary for the application to work.

## 9. Main application pages

Implement the following pages and flows.

### A. Home page

Include:

- A compelling product introduction.
- A clear call to action to create a trip.
- An attractive visual treatment inspired by independent travel magazines and modern travel guides.
- A list of locally saved trips, if any exist.

### B. Create-trip page

Implement the trip creation wizard, validation, preference selection and itinerary generation.

### C. Trip guide page

Create a polished, multi-section guide containing:

- Destination introduction.
- Trip dates and summary.
- Daily itinerary navigation.
- Activity cards with descriptions and thumbnails.
- Planned times and estimated durations.
- Estimated costs where available.
- Weather summary where available.
- Map and directions section.
- Relevant travel tips.
- Last-updated information for dynamic data.
- Edit, add, remove and reorder controls.
- A clear action to regenerate or revise the itinerary.

The guide should be designed like a real travel publication, not an administrative dashboard.

Use a consistent visual system, attractive typography, good spacing, restrained colours and appropriate travel imagery.

Use images from a suitable, configurable image source or local placeholders. If images cannot be retrieved, show graceful fallbacks. Do not build the application around fragile, hard-coded external image URLs.

### D. Edit-itinerary interactions

Allow the traveller to:

- Add a custom activity.
- Remove an activity.
- Edit its title, notes, planned time and duration.
- Reorder activities within a day.
- Move an activity to another day.
- Restore or undo recent changes where reasonably practical.
- Save changes automatically or through a clear save interaction.

Use accessible controls and provide clear feedback.

After any edit, persist the updated trip through the repository interface.

Do not allow background refreshes or itinerary generation to overwrite user changes silently.

### E. Places and directions

Provide map and directions functionality with a clean provider abstraction.

The application should support a demonstration map or useful map fallback without requiring credentials.

When coordinates are available, allow the traveller to open directions in an external mapping application. Use a provider-compatible map URL or mapping integration.

Do not fabricate precise walking times, route distances or coordinates. Mark illustrative route data as demonstration content.

Keep embedded maps optional so a paid mapping service can be added later.

### F. Sharing

Provide a shareable trip URL and a copy-link action.

Because the initial application uses browser storage, explain that the link alone does not transfer the trip data to another browser or device.

For the MVP, support sharing through an explicitly generated, portable, read-only trip snapshot or a clearly labelled demonstration-sharing mechanism. Validate imported snapshots and exclude sensitive accommodation details by default.

Do not expose browser storage contents through an insecure public endpoint or imply that a private, server-backed trip-sharing service exists when it does not.

Design the sharing interface so that it can later use a server-backed trip ID and access token.

## 10. Weather and live information

Create provider interfaces rather than embedding API calls directly in UI components.

For example:

- `WeatherProvider`
- `PlacesProvider`
- `DirectionsProvider`
- `CurrencyRateProvider`

Implement a demonstration provider or gracefully unavailable state for each integration that is not configured.

The application must work without API keys.

If an optional real weather provider can be integrated without excessive complexity, implement it behind a provider interface with documented environment variables. Otherwise, implement the interface and a clear demonstration provider.

Never present static example weather as live weather.

Display source, timestamp and data status where relevant. Support loading, failure and stale-data states.

Do not pretend that ticket availability, business hours or pricing are verified unless they have actually been retrieved from a suitable source.

## 11. Currency handling

Store trip expenses in an explicit currency.

Show the traveller's native currency and the destination's currency where appropriate. Where an exchange-rate provider is unavailable, clearly label conversions as unavailable or illustrative.

Do not hard-code an exchange rate and present it as current.

Use sensible numeric precision and format currencies according to their currency codes.

## 12. Updating the guide over time

Design a refresh service that can later run on a schedule.

The MVP should support refreshing relevant data when the guide is opened or when the traveller explicitly requests an update.

Include:

- A central refresh service.
- Per-provider freshness metadata.
- Graceful failure handling.
- A distinction between cached, demonstration and live data.
- A mechanism for identifying which activities may be affected by a change.
- A clear separation between refreshing factual information and modifying the itinerary.

For example, if the weather changes, the application can suggest swapping an outdoor activity with an indoor activity. It must not silently rearrange the traveller's plans.

Scheduled background jobs can be added after the first version is working. Do not simulate a continuously running background service in the browser.

## 13. User experience and accessibility

Requirements:

- Mobile-first responsive layout.
- Works on desktop and mobile browsers.
- Semantic HTML and accessible labels.
- Keyboard-accessible interactions.
- Clear focus states.
- Suitable contrast and readable text.
- Loading, empty, error and success states.
- Helpful onboarding and sample content.
- No unnecessary modal dialogs.
- No fake controls or non-functional buttons.

Prioritise a small number of complete, reliable workflows over a large collection of superficial features.

## 14. Security and privacy

Even though this is a local-first MVP:

- Validate all user inputs.
- Validate imported trip snapshots.
- Avoid injecting untrusted HTML.
- Do not put API secrets in client-side code.
- Do not claim browser storage is encrypted or secure against other users of the same device.
- Avoid exposing accommodation addresses in shared snapshots.
- Do not store unnecessary personal data.
- Make sharing behaviour explicit.
- Provide a way to delete locally stored trips.
- Keep the design ready for future server-side authentication and database access controls.

## 15. Testing

Add meaningful tests for the important behaviour.

At minimum, test:

1. Trip creation and validation.
2. Itinerary generation for different destinations and preferences.
3. Repository create, read, update and delete operations.
4. Storage corruption and invalid persisted data.
5. Reordering, moving, adding and removing activities.
6. Persistence across reloads where the test environment supports it.
7. Portable trip export and import.
8. Currency formatting and handling unavailable exchange rates.
9. Refresh failures and stale-data states.
10. Preservation of user edits when updating other trip information.

Mock browser storage and external providers where appropriate.

Run the available linting, type checks and tests. Fix failures caused by your changes.

If browser automation is available, exercise the primary flow from trip creation to itinerary editing and reopening the saved guide.

## 16. Implementation approach

Work in the following order:

1. Inspect the repository and establish the existing conventions.
2. Define the domain types and validation schemas.
3. Implement repository interfaces and browser-backed persistence.
4. Implement the demonstration itinerary generator and data providers.
5. Build the trip creation flow.
6. Build the trip guide and editing interactions.
7. Implement sharing, portable export/import and map fallbacks.
8. Add freshness indicators and refresh behaviour.
9. Add tests and resolve issues.
10. Write complete setup and architecture documentation.

Keep the application runnable throughout development.

Do not stop after creating the architecture or scaffolding. Continue until the MVP workflows are implemented and verified to the extent the environment permits.

## 17. Definition of done

The MVP is complete when a user can:

- Open the application locally without configuring a database.
- Create a trip to a chosen destination.
- Specify dates, currency and preferences.
- Generate a multi-day itinerary without an AI API key.
- View a visually appealing guide.
- Add, edit, remove, reorder and move activities.
- Close and reopen the application without losing saved trips, subject to browser storage limitations.
- Export a trip snapshot and import it again safely.
- Copy a link and understand whether it is a local guide link or a portable sharing link.
- View maps or a usable fallback.
- See clear indications of demonstration, unavailable, cached and live information.
- Refresh information without losing itinerary edits.

The codebase must contain no direct browser-storage dependencies in presentation components, and a future database-backed repository must be implementable without rewriting the UI.

## 18. Documentation and final report

Create or update the README with:

- Prerequisites.
- Installation and startup instructions.
- Environment variables.
- How browser persistence works.
- Data model overview.
- Repository architecture.
- How to add a database-backed repository later.
- How to configure future AI and external data providers.
- Known limitations, particularly local-only storage and sharing.
- Commands for linting, type checking and testing.

At completion, report:

1. What you built.
2. The principal files and architectural decisions.
3. How to run the application.
4. Which integrations are real and which use demonstration data.
5. Which checks and tests passed.
6. Any known defects or incomplete functionality.

Do not claim that a feature works unless it has been implemented and verified.

**Begin by inspecting the repository, then build the MVP.**
