# todo.skill

A skill for Claude Code that turns the vague one-liners in your `todo.txt` backlog into designed features.

You jot ideas into `todo.txt` as they come, by hand or by asking Claude to add them. When you tell Claude to continue with one, it picks the item, enters plan mode, interviews you about what the line leaves open, and writes a plan you approve before any code is written.

## Install

```sh
npx skills add frangeris/todo.txt
```

To install it by hand instead, copy `SKILL.md` to `~/.claude/skills/todo-skill/SKILL.md`.

## Usage

1. Create a `todo.txt` at the root of your project, one item per line:

   ```
   export the report as csv
   dark mode
   retry failed syncs
   ```

2. Ask Claude to continue with an item, in your own words: "let's do the next one", "continue with the csv thing".
3. Claude quotes the line it picked, enters plan mode and asks questions until the feature is clear.
4. Approve the plan. Its last step deletes the item from `todo.txt` once the work is implemented and verified.

Blank lines are ignored. If you drop or postpone an item, its line stays in the file.

### Adding items

Ask Claude to add an idea in your own words: "add to my todo: retry failed syncs". It appends one line per item to `todo.txt` (creating the file if needed) and stops there, with no plan mode and no questions. Editing the file by hand works just as well.
