---
name: todo-skill
description: >-
  Manage the user's task backlog in .todo/queue.md. Use when they ask to add or jot down a task or idea on their todo list ("add to my todo: retry failed syncs", with or without a mockup), or to continue with the next one ("let's do the next one", "pick up the export task", "what's next on my list"), in any language and even if the file isn't mentioned. Adding appends one line; continuing designs the task in plan mode before any code. Skip tasks the user already describes in full.
---

# todo-skill

The user keeps a backlog in `.todo/queue.md`, inside a `.todo/` folder at the project root that also holds the images the items reference. Each item is a terse note written in a few seconds when an idea came up, so it is vague on purpose. When the user says to continue with something from that list, your job is to take that item and design the feature with them in plan mode, not to start coding. When they ask to add something to the list instead, see "Adding an item" at the end.

## The file

The list, `.todo/queue.md`, has two sections, in this order:

```md
# Todo

## Tasks

- [ ] export the report as csv
- [ ] dark mode ![mockup](dark-mode.png)

## Done

- [x] retry failed syncs (a1b2c3d)
```

- An item is a `- [ ]` line in Tasks. Its images are the ones written inline on that line or on indented lines directly under it. Image paths are relative to `queue.md`, so a file next to it is just `dark-mode.png`.
- Anything else in the file, including text outside the two sections, is not an item: leave it untouched.
- If a heading is missing when you need it, create it.

## Migrating an old todo.txt

Both flows start here. If there is a `todo.txt` at the project root and no `.todo/queue.md`, it is the old format, so convert it before anything else. This comes before plan mode because plan mode can't edit.

- Create `.todo/queue.md`, and the folder if needed, with the layout above: each non-blank line of `todo.txt`, verbatim and in order, as a `- [ ]` item under Tasks, and Done empty.
- Check that the number of items equals the number of non-blank lines, then delete `todo.txt` so there aren't two sources of truth, and tell the user what you did.
- If both exist, use `.todo/queue.md`, ignore `todo.txt` and mention it once.

## 1. Find the item

- Read `.todo/queue.md`. Only items in Tasks count. If the file is missing or Tasks has no items, say so and stop. Don't invent a backlog.
- Every `- [ ]` line in Tasks is one item, taken verbatim together with its indented lines.
- Work out which item the user means:
  - "next", "the next one", or no specifics: the first item in Tasks.
  - A loose reference ("the one about exports"): the item that best matches it.
  - A position ("the third one"): count items in Tasks only.
  - Two or more plausible matches: show them and ask which one.
- Quote the exact item before going further, so a wrong pick is caught at a glance.
- Open every image the item references with `Read`, resolving paths relative to `.todo/queue.md`. A mockup or screenshot says what the one-liner doesn't. If a file is missing, or the reference is a remote URL, which you can't read, say so and carry on with the text.

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

Use `AskUserQuestion` for choices with real alternatives, up to four questions per round, with your recommendation first. For anything visual or about layout, ask instead of inventing: the user decides how it looks. An image on the item is a starting point, not a spec, so still ask about what it doesn't settle. Keep going while the answers open new questions, and stop once you could explain the feature back in a short paragraph.

## 4. Explore and write the plan

Now explore the codebase properly: where the feature plugs in and which existing patterns to reuse. Then write the plan:

- The feature as agreed, with the decisions from the interview.
- The files and areas to change, in order.
- How to verify it works.
- A last step: move the exact item from Tasks to the top of Done in `.todo/queue.md` once the feature is implemented and verified.

That last step turns the item into `- [x]` and appends the short hash of the commit that implemented it to the end of its first line, e.g. `- [x] dark mode (a1b2c3d)`. The hash only exists once the work is committed, so the step comes after that commit; read it with `git rev-parse --short HEAD`. If there is no commit (not a git repo, or the user isn't committing yet), move the item without a hash. Don't create or amend a commit just for this edit.

The step goes in the plan because plan mode can't edit and this skill's instructions may be out of context by the time the work is done. Move only that one item, keep its text and image references as they are, leave the image files alone, and leave the rest of the file untouched. If the user drops or postpones the item, leave it in Tasks.

Finish with `ExitPlanMode` so the user can approve the plan.

## Adding an item

When the user asks to add something to the list, add it to Tasks in `.todo/queue.md` and stop there. No plan mode and no interview: items are vague on purpose, so don't expand, clarify or design them. If only the old `todo.txt` exists, migrate it first.

- Write each item as one `- [ ]` line, close to the user's own words. Drop the request wrapper ("add to my list:") but don't reword it or add detail they didn't give.
- If they give several items, add one line each, in the order given.
- If `.todo/queue.md` doesn't exist, create it, and the folder if needed, with the layout above. Otherwise insert the item after the last item in Tasks, including its indented lines and before `## Done`, and leave everything else untouched, including order, blank lines and Done.
- If an identical item is already in Tasks, say so instead of adding a duplicate.
- If the user gives an image as a file path, typed or dragged in, copy it into `.todo/` next to the list, creating the folder if needed. Keep its filename, add a numeric suffix if the name is taken, and leave the original where it is. If it is already inside `.todo/`, just reference it. Write the reference inline on the item's line as `![alt](name.png)`, relative to the list, with a few words from the item as the alt text.
- An image pasted into the chat has no file to copy. Add the text item anyway so the idea isn't lost, say that the image couldn't be saved, and ask for a path or a dragged file to attach it.
- Quote the line or lines you added.
