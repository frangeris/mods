---
name: todo.skill
description: >-
  Add an item to the user's todo.txt backlog, or pick one from it and design it in plan mode. Use whenever the user asks to add or jot down something on their todo list (e.g. "add to my todo: retry failed syncs"), or to continue with, pick up, start, tackle or work on the next item or task from it, in any language and even if they never mention the file (e.g. "let's do the next one", "continue with the export thing", "what's next on my list, let's start it"). The items are deliberately vague one-liners, so picking one turns it into a designed feature through a short interview and a plan before any code is written, while adding one just appends the line. Do not use it to start a task the user already describes in full themselves.
---

# todo.skill

The user keeps a backlog in `todo.txt` at the project root, one item per line, plain text. Each item is a terse note written in a few seconds when an idea came up, so it is vague on purpose. When the user says to continue with something from that list, your job is to take that item and design the feature with them in plan mode, not to start coding. When they ask to add something to the list instead, see "Adding an item" at the end.

## 1. Find the item

- Read `todo.txt` at the project root. If the file is missing or has no non-blank lines, say so and stop. Don't invent a backlog.
- Ignore blank lines. Every other line is one item, taken verbatim.
- Work out which item the user means:
  - "next", "the next one", or no specifics: the first item.
  - A loose reference ("the one about exports"): the line that best matches it.
  - A position ("the third one"): count non-blank lines.
  - Two or more plausible matches: show them and ask which one.
- Quote the exact line you are taking before going further, so a wrong pick is caught at a glance.

## 2. Enter plan mode

Call `EnterPlanMode`. If its schema isn't loaded, fetch it first with `ToolSearch` (`select:EnterPlanMode`). Plan mode keeps the design phase free of edits and puts the user's approval between the design and the build.

## 3. Interview before designing

A one-line item hides most of the intent. If you go straight from the line to a design, you fill the gaps with guesses and the user rejects the plan, which costs a whole cycle. A few questions up front cost much less.

First skim just enough of the code and docs to ask informed questions and avoid asking what the code already answers. Then ask about what the item leaves open, skipping anything obvious:

- The problem: what is wrong or missing today, and what should be possible afterwards.
- Where it surfaces: UI, API or server, config, CLI, background job.
- What "done" looks like, as behavior the user could observe.
- Boundaries: what it should explicitly not do.
- Impact on existing things: new settings, stored data, migrations, behavior that must keep working.

Use `AskUserQuestion` for choices with real alternatives, up to four questions per round, with your recommendation first. For anything visual or about layout, ask instead of inventing: the user decides how it looks. Keep going while the answers open new questions, and stop once you could explain the feature back in a short paragraph.

## 4. Explore and write the plan

Now explore the codebase properly: where the feature plugs in and which existing patterns to reuse. Then write the plan:

- The feature as agreed, with the decisions from the interview.
- The files and areas to change, in order.
- How to verify it works.
- A last step: delete the exact line from `todo.txt` once the feature is implemented and verified.

The cleanup step goes in the plan because plan mode can't edit and this skill's instructions may be out of context by the time the work is done. Remove only that one line and leave the rest of the file alone. If the user drops or postpones the item, leave the line in place.

Finish with `ExitPlanMode` so the user can approve the plan.

## Adding an item

When the user asks to add something to the list, append it to `todo.txt` at the project root and stop there. No plan mode and no interview: items are vague on purpose, so don't expand, clarify or design them.

- Write each item as one line, close to the user's own words. Drop the request wrapper ("add to my list:") but don't reword it or add detail they didn't give.
- If they give several items, add one line each, in the order given.
- If `todo.txt` doesn't exist, create it. Otherwise append after the last line, making sure the previous line ends in a newline, and leave every existing line untouched, including order and blank lines.
- If an identical line is already in the file, say so instead of adding a duplicate.
- Quote the line or lines you added.
