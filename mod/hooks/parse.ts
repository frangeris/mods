import type { Todo } from '../types'

const HEADING = /^##\s+(.+?)\s*$/
const ITEM = /^- \[( |x|X)\]\s+(.*)$/
const IMAGE = /!\[[^\]]*\]\([^)]*\)/g

// Reads the two sections of .todo/tasks.md the way SKILL.md defines them: only
// `- [ ]` lines under Queue and `- [x]` lines under Done are items.
export const parse = (source: string): Todo => {
  const todo: Todo = { queue: [], done: [] }
  let section: keyof Todo | null = null

  for (const line of source.split(/\r?\n/)) {
    const heading = HEADING.exec(line)

    if (heading) {
      const name = heading[1]?.toLowerCase()
      section = name === 'queue' ? 'queue' : name === 'done' ? 'done' : null
      continue
    }

    const item = ITEM.exec(line)
    const mark = item?.[1]
    const text = item?.[2]?.replace(IMAGE, '[image]').replace(/\s+/g, ' ').trim()

    if (section === null || mark === undefined || !text) {
      continue
    }

    const isOpen = mark === ' '

    if ((section === 'queue' && isOpen) || (section === 'done' && !isOpen)) {
      todo[section].push(text)
    }
  }

  return todo
}

const QUEUE_HEADING = /^##\s+queue\s*$/i
const DONE_HEADING = /^##\s+done\s*$/i
const ANY_HEADING = /^##\s/
const OPEN_ITEM = /^- \[ \]\s+(.*)$/
const IMAGE_FILE = /\.(png|jpe?g|gif|webp|svg)$/i
const PATH_START = /^(?:~|\.{1,2})?\//
const WORD = /(?:\\.|\S)+/g

export type Token = { word: string; path?: string }

// Splits the arguments of `/todo add` into words. A word that looks like the path
// of an image (absolute, `~/`, `./` or `../`, with a backslash-escaped space
// allowed, as a terminal writes a dropped file) also carries it unescaped.
export const tokenize = (args: string): Token[] =>
  [...args.matchAll(WORD)].map(([word]) => {
    const path = word.replace(/\\(.)/g, '$1')

    return IMAGE_FILE.test(path) && PATH_START.test(path) ? { word, path } : { word }
  })

export type Added = { source: string; isDuplicate: boolean }

// Adds `- [ ] text` after the last item of Queue, the way SKILL.md describes it:
// the file and its headings are created when missing, and everything else in the
// file stays as it was.
export const addToQueue = (source: string | undefined, text: string): Added => {
  const line = `- [ ] ${text}`

  if (source === undefined || source.trim() === '') {
    return { source: `# Todo\n\n## Queue\n\n${line}\n\n## Done\n`, isDuplicate: false }
  }

  const eol = source.includes('\r\n') ? '\r\n' : '\n'
  const lines = source.split(/\r?\n/)
  const start = lines.findIndex(one => QUEUE_HEADING.test(one))

  if (start === -1) {
    const done = lines.findIndex(one => DONE_HEADING.test(one))

    if (done === -1) {
      while (lines.length > 0 && lines[lines.length - 1]?.trim() === '') {
        lines.pop()
      }

      lines.push('', '## Queue', '', line, '')
    } else {
      lines.splice(done, 0, '## Queue', '', line, '')
    }

    return { source: lines.join(eol), isDuplicate: false }
  }

  const next = lines.findIndex((one, index) => index > start && ANY_HEADING.test(one))
  const end = next === -1 ? lines.length : next
  let last = -1
  let isInItem = false

  for (let index = start + 1; index < end; index += 1) {
    const one = lines[index] ?? ''
    const item = OPEN_ITEM.exec(one)

    if (item) {
      if (item[1]?.trim() === text) {
        return { source, isDuplicate: true }
      }

      last = index
      isInItem = true
    } else if (isInItem && /^\s+\S/.test(one)) {
      last = index
    } else {
      isInItem = false
    }
  }

  if (last !== -1) {
    lines.splice(last + 1, 0, line)
  } else {
    lines.splice(start + 1, 0, '', line)
    const after = lines[start + 3]

    if (after !== undefined && after.trim() !== '') {
      lines.splice(start + 3, 0, '')
    }
  }

  return { source: lines.join(eol), isDuplicate: false }
}
