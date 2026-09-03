# 0003: CSS Modules + shared design tokens, no CSS framework

Date: 2026-09-03
Status: accepted

## Context

The project needs consistent styling without pulling in Tailwind or Bootstrap, and without hand-rolling a competing utility-class framework that would just reinvent the same problem.

## Decision

Use plain, scoped CSS Modules per component (`Component.module.css`), backed by a single shared design-token file (`styles/tokens.css`) defining CSS custom properties for colors, spacing, and type scale. No utility-class layer, no CSS-in-JS library.

## Consequences

- Every component owns its own scoped stylesheet — no global class name collisions, no build-time utility purging step.
- Design consistency depends on components actually using the tokens from `styles/tokens.css` rather than hardcoding values — this needs to be enforced by review, not tooling.
- Slower to write than utility classes for one-off spacing tweaks, but keeps styling logic colocated and readable without a framework dependency.
