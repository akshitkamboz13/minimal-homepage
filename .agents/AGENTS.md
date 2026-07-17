# Workspace Rules & AI Coding Guidelines

This document outlines the development standards and architectural patterns that all AI assistants and coding agents must adhere to when working in this workspace.

---

## 1. Modular Code Architecture

This project is built using a strict modular architecture. Avoid monolithic, bundled, or ad-hoc code structures.

### JavaScript Modules (ES Modules)
- **Directory Layout:** Place feature logic inside dedicated modules under the [src/js/](file:///home/siakshit/Startups/Homepages/minimal-startpage/src/js/) directory (e.g., separate directories for `clock`, `bookmarks`, `search`, `ui`).
- **Module Orchestration:** 
  - Define an initialization function in each module (e.g., `initBookmarks()`).
  - Import and invoke these modules in the central hub [src/js/app.js](file:///home/siakshit/Startups/Homepages/minimal-startpage/src/js/app.js).
- **Naming Conventions:** Use lowercase kebab-case for JavaScript filenames (e.g., `right-panel.js`, `google-apps.js`).
- **Encapsulation:** Always use ES Modules (`export`/`import`). Do **NOT** pollute the global `window` object or create global variables.

### CSS Modularity
- **Directory Layout:** Keep stylesheet structures aligned with JS components under the [src/css/](file:///home/siakshit/Startups/Homepages/minimal-startpage/src/css/) directory.
- **Imports:** Import modular stylesheets into the central style entry point [src/css/main.css](file:///home/siakshit/Startups/Homepages/minimal-startpage/src/css/main.css).
- **Design Tokens:** Put all global variables, theme colors, and layout/spacing constants in [src/css/theme/theme.css](file:///home/siakshit/Startups/Homepages/minimal-startpage/src/css/theme/theme.css). Do not redefine colors/variables locally.

---

## 2. Premium Design & Styling Rules

- **Vanilla CSS Only:** Use modern vanilla CSS features (CSS Grid, Flexbox, transitions, custom properties) for styling. Do **NOT** use Tailwind CSS or utility-first frameworks.
- **Avoid Overrides:** Do **NOT** use `!important` unless it is absolutely necessary (e.g., overriding rigid external chrome styles).
- **High-Aesthetic UI:** 
  - Implement cohesive, modern glassmorphic designs (using `backdrop-filter: blur()`, subtle border offsets, and soft drop-shadows).
  - Use smooth animations and interactive hover micro-animations for actionable elements.
- **Themes:** Always ensure complete support for both Light and Dark mode options.

---

## 3. HTML & DOM Best Practices

- **Semantic Layout:** Prefer semantic HTML5 elements (`<header>`, `<main>`, `<section>`, `<nav>`, `<aside>`, `<article>`) instead of nesting generic `<div>` tags.
- **Unique Identifiers:** All new interactive elements or structural sections must have descriptive, unique `id` attributes.
- **No Inline Styles:** Write styles in external, modular stylesheets rather than adding inline styles to HTML elements.

---

## 4. State & Extension Management

- **Storage:** Persist user configuration settings or local application state using `window.localStorage` or Chrome Extension storage APIs (`chrome.storage.local`).
- **Permissions:** Make sure any new Chrome APIs utilized are declared properly in [manifest.json](file:///home/siakshit/Startups/Homepages/minimal-startpage/manifest.json).

---

## 5. Development Quality Constraints

- **No Placeholders:** Implementing dummy values, empty comments (`// TODO`), or placeholder text is strictly prohibited. Create complete, working implementations.
- **Preserve Existing Comments:** Do not delete or rewrite existing unrelated code comments during modifications.
- **Single Responsibility:** Keep functions small and focused on a single responsibility.
