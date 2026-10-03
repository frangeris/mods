# todo.skill

A skill for Claude Code that turns the vague one-liners in your `todo.txt` backlog into designed features.

You jot ideas into `todo.txt` as they come. When you tell Claude to continue with one, it picks the item, enters plan mode, interviews you about what the line leaves open, and writes a plan you approve before any code is written.

## Install

```sh
npx skills add frangeris/todo.txt
```

To install it by hand instead, copy `SKILL.md` to `~/.claude/skills/todo.skill/SKILL.md`.

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
