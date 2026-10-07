---
name: todo-skill
description: >-
  Manage the user's task backlog in .todo/tasks.md. Use when they ask to add or jot down a task or idea on their todo list ("add to my todo: retry failed syncs", with or without a mockup), or to continue with the next one ("let's do the next one", "pick up the export task", "what's next on my list"), in any language and even if the file isn't mentioned. Adding appends one line; continuing implements simple tasks directly and, for big features, suggests designing them in plan mode before any code. Skip tasks the user already describes in full.
---

# todo-skill

The user keeps a backlog in `.todo/tasks.md`, inside a `.todo/` folder at the project root that also holds the images the items reference. Each item is a terse note written in a few seconds when an idea came up, so it is vague on purpose. When the user says to continue with something from that list, your job is to take that item and size it up: a simple one you just implement, while for a big feature you suggest designing it with them in plan mode before any code. When they ask to add something to the list instead, see "Adding an item" at the end.

## The file

The list, `.todo/tasks.md`, has two sections, in this order:

```md
# Todo

## Queue

- [ ] export the report as csv
- [ ] dark mode ![mockup](dark-mode.png)

## Done

- [x] retry failed syncs (a1b2c3d)
```

- An item is a `- [ ]` line in Queue. Its images are the ones written inline on that line or on indented lines directly under it. Image paths are relative to `tasks.md`, so a file next to it is just `dark-mode.png`.
- Anything else in the file, including text outside the two sections, is not an item: leave it untouched.
- If a heading is missing when you need it, create it.

## Migrating an old todo.txt

Both flows start here. If there is a `todo.txt` at the project root and no `.todo/tasks.md`, it is the old format, so convert it before anything else. This comes before plan mode because plan mode can't edit.

- Create `.todo/tasks.md`, and the folder if needed, with the layout above: each non-blank line of `todo.txt`, verbatim and in order, as a `- [ ]` item under Queue, and Done empty.
- Check that the number of items equals the number of non-blank lines, then delete `todo.txt` so there aren't two sources of truth, and tell the user what you did.
- If both exist, use `.todo/tasks.md`, ignore `todo.txt` and mention it once.

## 1. Find the item

- Read `.todo/tasks.md`. Only items in Queue count. If the file is missing or Queue has no items, say so and stop. Don't invent a backlog.
- Every `- [ ]` line in Queue is one item, taken verbatim together with its indented lines.
- Work out which item the user means:
  - "next", "the next one", or no specifics: the first item in Queue.
  - A loose reference ("the one about exports"): the item that best matches it.
  - A position ("the third one"): count items in Queue only.
  - Two or more plausible matches: show them and ask which one.
- Quote the exact item before going further, so a wrong pick is caught at a glance.
- Open every image the item references with `Read`, resolving paths relative to `.todo/tasks.md`. A mockup or screenshot says what the one-liner doesn't. If a file is missing, or the reference is a remote URL, which you can't read, say so and carry on with the text.

## 2. Decide how to proceed

Plan mode is a suggestion for big work, not a step every item goes through. Size the item from its line, its images and a quick look at the code:

- **Simple:** a small, well-bounded change where the line and the code answer what's left, like a copy tweak, a rename, a small fix or a flag. Skip plan mode and the interview and implement it. Ask only about something that would otherwise block you. Once it is implemented and verified, close the item (see "Closing the item").
- **Big:** a feature that spans several areas, adds stored data or settings, leaves open how something looks or behaves, or needs a mockup interpreted. Don't enter plan mode on your own: say in one line why it looks big and offer the choice with `AskUserQuestion`, "Plan it first" (recommended) or "Just implement it". Go on to step 3 only if they pick the plan. If they decline, implement it directly, asking only about what would block you, and close the item as above.
- If the user already said how they want it ("plan it", "just do it"), follow that without asking.
- If you can't tell which it is, treat it as big and offer the choice.

## 3. Enter plan mode

Only once the user has accepted the suggestion or asked for a plan, call `EnterPlanMode`. If its schema isn't loaded, fetch it first with `ToolSearch` (`select:EnterPlanMode`). Plan mode keeps the design phase free of edits and puts the user's approval between the design and the build.

## 4. Interview before designing

A one-line item hides most of the intent. If you go straight from the line to a design, you fill the gaps with guesses and the user rejects the plan, which costs a whole cycle. A few questions up front cost much less.

First skim just enough of the code and docs to ask informed questions and avoid asking what the code already answers. Then ask about what the item leaves open, skipping anything obvious:

- The problem: what is wrong or missing today, and what should be possible afterwards.
- Where it surfaces: UI, API or server, config, CLI, background job.
- What "done" looks like, as behavior the user could observe.
- Boundaries: what it should explicitly not do.
- Impact on existing things: new settings, stored data, migrations, behavior that must keep working.

Use `AskUserQuestion` for choices with real alternatives, up to four questions per round, with your recommendation first. For anything visual or about layout, ask instead of inventing: the user decides how it looks. An image on the item is a starting point, not a spec, so still ask about what it doesn't settle. Keep going while the answers open new questions, and stop once you could explain the feature back in a short paragraph.

## 5. Explore and write the plan

Now explore the codebase properly: where the feature plugs in and which existing patterns to reuse. Then write the plan:

- The feature as agreed, with the decisions from the interview.
- The files and areas to change, in order.
- How to verify it works.
- A last step: move the exact item from Queue to the top of Done in `.todo/tasks.md` once the feature is implemented and verified, written out in full as described in "Closing the item".

The step goes in the plan because plan mode can't edit and this skill's instructions may be out of context by the time the work is done.

Finish with `ExitPlanMode` so the user can approve the plan.

## Closing the item

Once the item is implemented and verified, whether directly or through a plan, move the exact item from Queue to the top of Done in `.todo/tasks.md`. This turns it into `- [x]` and appends the short hash of the commit that implemented it to the end of its first line, e.g. `- [x] dark mode (a1b2c3d)`. The hash only exists once the work is committed, so this comes after that commit; read it with `git rev-parse --short HEAD`. If there is no commit (not a git repo, or the user isn't committing yet), move the item without a hash. Don't create or amend a commit just for this edit.

Move only that one item, keep its text and image references as they are, leave the image files alone, and leave the rest of the file untouched. If the user drops or postpones the item, leave it in Queue.

## Adding an item

When the user asks to add something to the list, add it to Queue in `.todo/tasks.md` and stop there. No plan mode and no interview: items are vague on purpose, so don't expand, clarify or design them. If only the old `todo.txt` exists, migrate it first.

- Write each item as one `- [ ]` line, close to the user's own words. Drop the request wrapper ("add to my list:") but don't reword it or add detail they didn't give.
- If they give several items, add one line each, in the order given.
- If `.todo/tasks.md` doesn't exist, create it, and the folder if needed, with the layout above. Otherwise insert the item after the last item in Queue, including its indented lines and before `## Done`, and leave everything else untouched, including order, blank lines and Done.
- If an identical item is already in Queue, say so instead of adding a duplicate.
- If the user gives an image as a file path, typed or dragged in, copy it into `.todo/` next to the list, creating the folder if needed. Keep its filename, add a numeric suffix if the name is taken, and leave the original where it is. If it is already inside `.todo/`, just reference it. Write the reference inline on the item's line as `![alt](name.png)`, relative to the list, with a few words from the item as the alt text.
- An image pasted into the chat has no file to copy. Add the text item anyway so the idea isn't lost, say that the image couldn't be saved, and ask for a path or a dragged file to attach it.
- Quote the line or lines you added.
