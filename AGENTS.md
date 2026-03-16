# AGENTS

## Project Overview
- Next.js app using the App Router (`src/app`).
- Styling uses global CSS + CSS modules.
- Supports both light and dark modes.
- Mobile experience is critical; treat desktop as progressive enhancement, not the other way around.

## Coding Standards
- Prefer TypeScript types that are explicit and narrow.
- Keep components small and focused; extract helpers or hooks when logic grows.
- **DRY**: Avoid duplicating logic or UI; extract shared code into reusable utilities/components.
- Keep code human-readable: clear naming, small functions, and straightforward control flow.
- Use comments sparingly but meaningfully to explain non-obvious intent, trade-offs, or constraints.

## Testing
- Follow **Test Driven Development (TDD)** principles:
  - Write or update tests before implementing major new behavior.
  - Keep tests focused on behavior, not implementation details.
- Prefer lightweight unit tests for shared logic and critical components.
- Add regression tests when fixing bugs.

## UI/UX Expectations
- All new UI must work correctly in **both light and dark modes**; verify in both themes.
- **Mobile functionality is critical**:
  - Design and test for small screens first.
  - Avoid layouts or interactions that break on narrow widths.
- Maintain consistent spacing, typography, and interaction patterns with existing UI.
- Reuse existing layout patterns, components, and utility classes where possible.

## File/Folder Conventions
- App routes live in `src/app/**/page.tsx`.
- Components live close to their usage; prefer colocated CSS modules.
- Shared utilities and types should live in clearly named shared locations (e.g. `src/lib`, `src/components/common`), not copied into multiple routes.

## Notes for Agents
- Before large refactors, prefer incremental changes and preserve existing behavior.
- If unsure about behavior, favor minimal change and consistency with nearby code.
- When introducing new patterns (testing, UI, data flow), align with existing conventions or clearly improve on them.
