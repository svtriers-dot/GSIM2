# React Joyride maintenance, 2026-11-15

Official react-joyride 3.2.0 supports React/ReactDOM 16.8 through 19. The app stays
on React/ReactDOM 18.3.1. Its upstream dependency replacement removes the old
react-floater, Popper, deepmerge, deep-diff and tree-changes chain. Full and
production npm audit both report zero findings. CI now rejects low and above.

The dashboard uses the v3 named Joyride export, options, localized progress and
onEvent API. Theme color, font inheritance and the four-step walkthrough remain.
The previous tour could never start because runTour was never set true. The new
manual Подсказки button starts/restarts it; it never opens automatically on login.

Completion or explicit skip records tour-complete once per run. Close, overlay
close and Escape cancel without recording completion. A new run starts at step
one. The session-list target exists for both empty and populated dashboards.
The copy uses the actual five-digit access code. Header wrapping, internal table
scrolling and wrapping tooltip controls keep the tour usable on narrow screens.

e2e/trainer-tour.spec.ts checks 12 scenarios: 320/390/1280px, empty/populated
sessions, all steps, back, localized progress, completion, skip, restart, close,
Escape, focus trapping/restoration, touch, button bounds, fonts and overflow.
These tests render the real UI with synthetic API responses and abort unexpected
trainer API requests; no existing trainers/sessions are read or changed. The
production-dependency API rehearsal separately verifies the real protected
tour-complete endpoint and its timestamp on the disposable CI database.

Run UI checks with:
E2E_BASE_URL=http://127.0.0.1:15010 npx --no-install playwright test e2e/trainer-tour.spec.ts

Primary sources:
- https://github.com/gilbarbara/react-joyride/releases/tag/v3.2.0
- https://react-joyride.com/docs/migration
- https://react-joyride.com/docs/accessibility
- https://registry.npmjs.org/react-joyride/3.2.0
