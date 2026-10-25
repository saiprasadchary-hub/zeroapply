---
name: zeroapply-code-style
description: Enforces high-performance, production-grade TypeScript code style for ZeroApply agent modules. Prioritizes performance, resilience, deep edge-case handling, and architectural clarity over arbitrary length restrictions.
---

# ZeroApply Code Style & Architecture Guidelines

## Core Principles

1. **Performance & Production Robustness First**: Code must be battle-tested, resilient, and optimized for speed and memory efficiency. Never compromise reliability or edge-case handling just to make code shorter. Length is not a limitation if the file maintains high quality and cohesive responsibility.
2. **Cohesive Responsibility**: Group logically coupled operations together. Do not artificially fracture files into micro-fragments that obscure control flow or hurt performance with excessive indirection.
3. **Deep Edge-Case & Error Handling**: Handle DOM quirks, dynamic hydration, race conditions, unexpected input formats, and network failures with thorough fallbacks and graceful degradation.
4. **Strict Type Safety**: Every function must have explicit parameter and return types. Forbid `any`; use strict unions, generics, or `unknown` with runtime type narrowing.
5. **No Dead Code**: Zero commented-out blocks, unreferenced variables, or obsolete imports.
6. **Predictable Control Flow & Early Exits**: Validate preconditions and edge cases at function headers to avoid deep nesting and reduce cognitive load.
7. **Immutability by Default**: Use `const` unless mutation is strictly necessary for performance-critical hot paths.
8. **Stateful Engines vs. Pure Utilities**: Encapsulate lifecycle, listeners, and concurrent tasks in robust class instances (e.g. state machines, orchestrators, LLM engines). Keep algorithmic transforms and parsers as high-performance pure functions.

---

## Performance Rules

- **DOM Query Caching & Batching**: Never query the same DOM selector repeatedly in tight loops. Cache element references, resolve bounding rects once per frame/pass, and avoid forced synchronous reflows.
- **Efficient Data Structures**:
  - Use `Map` instead of plain object literals for high-frequency dynamic key-value lookups.
  - Use `Set` for $O(1)$ membership checks instead of $O(n)$ `Array.includes()` / `indexOf()`.
- **Throttling & Debouncing**: Debounce high-frequency events (DOM mutations, scroll, resize, input events) with tuned thresholds.
- **Memory Management**: Always clean up mutation observers, event listeners, intervals, and timeouts when an agent stops or transitions state.
- **Micro-Tasks & Scheduling**: Use `requestAnimationFrame` for UI-aligned frame updates, and `requestIdleCallback` or chunked micro-tasks for heavy background analysis.

---

## DOM Injection & Script Standards

Injected scripts (e.g., via `executeJavaScript`) operate in target web contexts and must satisfy:
- **Zero-Dependency IIFE**: Wrapped in `(() => { ... })()` with no assumptions about ambient globals or libraries.
- **Robust Selectors**: Employ hierarchical, semantic, and resilient selector strategies (IDs, ARIA labels, test IDs, names, and heuristic text proximity).
- **Safe Evaluation**: Wrap operations in try/catch blocks; return structured result objects `{ success: boolean; data?: T; error?: string }` rather than letting uncaught exceptions crash the bridge.
- **Shadow DOM & iFrames**: Provide recursive traversal support for nested shadow roots and embedded form iframes.

---

## Naming & Code Organization

| Item | Convention | Example |
|---|---|---|
| Files & Directories | camelCase | `fieldScanner.ts`, `domObserver.ts`, `vision/` |
| Types & Interfaces | PascalCase | `ScannedField`, `FormState`, `AgentExecutionResult` |
| Functions & Methods | camelCase (descriptive verb) | `scanFormFields()`, `resolveBestMatch()` |
| Constants & Enums | UPPER_SNAKE_CASE | `DEFAULT_SELECTOR_TIMEOUT_MS`, `MAX_RECOVERY_ATTEMPTS` |

### Import Ordering
1. Node.js & runtime built-ins (`path`, `events`)
2. External packages (`electron`, `zod`, etc.)
3. Internal cross-domain modules
4. Local domain siblings
5. Type definitions (`import type { ... }`)

---

## Production Standards & Observability

- **Structured Logging**: Route all telemetry, warnings, and state transitions through the centralized tracker/logger module. Never leave raw `console.log` in production.
- **Explicit Result Types**: For critical operations, return explicit discriminated unions or result wrappers rather than throwing generic errors:
  ```typescript
  export type Result<T, E = string> = 
    | { success: true; data: T }
    | { success: false; error: E; context?: Record<string, unknown> };
  ```
- **Self-Documenting Complex Logic**: Elaborate on non-trivial heuristic scoring, regular expressions, and stealth mechanics with clear explanatory comments.
