# todo-skill

A skill for Claude Code that turns the vague one-liners in your `.todo/queue.md` backlog into designed features.

You jot ideas into `.todo/queue.md` as they come, by hand or by asking Claude to add them, optionally with a mockup or screenshot. When you tell Claude to continue with one, it picks the item, enters plan mode, interviews you about what the line leaves open, and writes a plan you approve before any code is written. Finished items move from Tasks to Done, tagged with the commit that implemented them.

## Install

```sh
npx skills add frangeris/todo-skill
```

To install it by hand instead, copy `SKILL.md` to `~/.claude/skills/todo-skill/SKILL.md`.

## Usage

1. Create a `.todo/` folder at the root of your project with a `queue.md` inside it, holding a Tasks and a Done section:

   ```md
   # Todo

   ## Tasks

   - [ ] export the report as csv
   - [ ] dark mode ![mockup](dark-mode.png)
   - [ ] retry failed syncs

   ## Done
   ```

2. Ask Claude to continue with an item, in your own words: "let's do the next one", "continue with the csv thing".
3. Claude quotes the item it picked, enters plan mode and asks questions until the feature is clear.
4. Approve the plan. Its last step moves the item to the top of Done once the work is implemented and verified, checked off and tagged with the short hash of the commit that implemented it: `- [x] retry failed syncs (a1b2c3d)`. Without a commit, it moves without a hash.

If you drop or postpone an item, it stays in Tasks.

### Images

Reference an image with regular markdown, inline on the item or on an indented line right below it. Keep the files in the `.todo/` folder, next to `queue.md`, and write their paths relative to it. When Claude picks the item it opens the images and uses them as context for the interview. Remote URLs are not read.

### Adding items

Ask Claude to add an idea in your own words: "add to my todo: retry failed syncs". It inserts one `- [ ]` line per item at the end of Tasks (creating the file if needed) and stops there, with no plan mode and no questions. Editing the file by hand works just as well.

To attach an image, give Claude a file path or drag the file in. It copies the file into `.todo/` and references it from the item. An image pasted into the chat has no file to copy, so Claude adds the text and asks for a path.

### Migrating from todo.txt

If a project has a `todo.txt` and no `.todo/queue.md`, the skill converts it the first time it runs: every line becomes a task and `todo.txt` is deleted.
