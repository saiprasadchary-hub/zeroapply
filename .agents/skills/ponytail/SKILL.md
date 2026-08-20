---
name: ponytail
description: >-
  Enforces a "lazy senior developer" mindset (YAGNI, minimal code, zero bloat, anti-overengineering).
  Use this skill whenever planning, writing, or refactoring code to ensure maximum simplicity,
  leveraging native platform capabilities, reusing existing codebase utilities, avoiding unnecessary
  dependencies, and keeping changes minimal and concise.
---

# Ponytail Skill (Anti-Overengineering & Radical Simplicity)

The **Ponytail** mindset is inspired by the veteran, no-nonsense senior engineer who knows that **every line of code is a liability**. The goal is to write the least amount of code necessary while delivering robust, secure, maintainable, and clean solutions.

---

## The Decision Ladder

Before writing any new function, class, file, or dependency, walk down this ladder in order:

```
[1. Question the Need]
        │
        ▼
[2. Reuse Existing Code]
        │
        ▼
[3. Use Native Platform / Stdlib]
        │
        ▼
[4. Use Existing Dependencies]
        │
        ▼
[5. Single-line / Concise Solution]
        │
        ▼
[6. Minimal Custom Code]
```

### 1. Question the Need
- Does this feature, abstraction, or helper actually need to exist?
- Can we satisfy the user request or solve the bug with zero code changes or by modifying an existing parameter?
- Adhere strictly to **YAGNI** (You Aren't Gonna Need It). Do not build for hypothetical future requirements.

### 2. Reuse Existing Code
- Search the workspace before writing anything new.
- Does a helper, utility function, hook, or component already do 80–100% of what is needed?
- Prefer slightly extending an existing utility over creating a new one.

### 3. Use Native Platform & Standard Libraries
- **Browser / Web APIs**: Use native `fetch`, `structuredClone`, `crypto.randomUUID`, `URL`, `FormData`, `Intl`, `ResizeObserver`, etc.
- **CSS / HTML**: Use native CSS Grid, Flexbox, CSS variables, `<dialog>`, `<details>`, or standard semantic elements before writing JavaScript for layout/disclosure.
- **Node / Runtime**: Use built-in `fs/promises`, `path`, `node:crypto`, `node:events`, etc.

### 4. Leverage Existing Dependencies (No New Packages)
- Do **not** install a new package (`npm install ...`) if:
  - An existing dependency in `package.json` already provides the functionality.
  - The feature can be implemented in a few lines of native code.
- Avoid micro-packages (e.g., `is-odd`, `left-pad`, `clsx` when a simple template string or filter works).

### 5. Favor Concise Solutions
- Can this be written in 1–3 clean, readable lines?
- Prefer declarative standard methods (`map`, `filter`, `reduce`, `some`, `every`, `find`) over verbose loops with temporary accumulator variables when readable.

### 6. Minimal Custom Code
- If code must be written, write the **minimal surface area**:
  - No speculative wrappers or proxy layers.
  - No deep inheritance hierarchies or abstract factory classes.
  - Keep related logic co-located instead of scattering it across multiple tiny files unnecessarily.

---

## Code Review Checklist (The "Ponytail" Test)

When reviewing or writing code, ask:
1. **Can I delete lines instead of adding them?**
2. **Did I introduce an abstraction that is only used in one place?** (If so, inline it).
3. **Is the diff as small and targeted as possible?**
4. **Is the code readable to a junior developer without reading 5 levels of indirection?**
