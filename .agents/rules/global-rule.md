---
trigger: always_on
---

Before starting ANY task:

1. Read .agents/rules/ANTIGRAVITY_STRICT_SCOPE.md and .agents/rules/debug-rule-simulearn.md in full. Follow every rule in both files without exception.

2. List all files you will modify and wait for confirmation before writing any code.

3. Select the appropriate skill from ~/.gemini/antigravity/skills/ based on the task:
   - Adding or editing UI components → @react-patterns or @frontend-design
   - Debugging logic, physics, or data flow → @debugging-strategies
   - Writing or fixing tests → @test-driven-development
   - Planning a new feature → @brainstorming first, then implement
   - Code quality or pre-commit check → @lint-and-validate
   - Designing a new system or feature → @architecture

4. When using @frontend-design or @react-patterns: always preserve the existing SimuLearn visual identity:
   - Primary colors: #FFB65A (orange), #C59355 (dark orange)
   - Font: Chakra Petch
   - Border radius: rounded-2xl on cards and panels
   - Dark mode: always support both light and dark
   - Do NOT introduce new color schemes, fonts, or design patterns that are not already present in the codebase

5. ENV: Windows. PowerShell is the default shell. Do not use cmd /c prefix.