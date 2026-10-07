import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, Timer } from 'claude-code'

import type { Todo } from '../types'
import { addToQueue, parse, tokenize } from './parse'

const PANE = 'todo'
const POLL_MS = 2000
const DONE_SHOWN = 5
const USAGE = 'Usage: /todo [add <text> [image path ...]]'

// `# text` typed alone on one line: a markdown heading with more lines under it
// is a prompt, not an item.
const SHORTCUT = /^#[ \t]+(\S[^\n]*)$/

const list = atom({ plugin: 'todo', key: 'list' } as const, null)
const sent = atom({ plugin: 'todo', key: 'sent' } as const, 0)

let seen = ''

// Re-reads .todo/tasks.md when its mtime or size changed since the last read,
// so a hand edit and an edit by Claude both land.
async function refresh($: EngineInterface) {
  const path = `${await $.session.root()}/.todo/tasks.md`
  const stat = await $.fs.stat(path).catch(() => undefined)
  const stamp = stat === undefined ? 'missing' : `${stat.mtimeMs}:${stat.size}`

  if (stamp === seen) {
    return
  }

  seen = stamp
  const source = stat === undefined ? undefined : await $.fs.read(path).catch(() => undefined)
  const todo: Todo | null = source === undefined ? null : parse(source)
  await update($, list, () => todo)

  const count = todo?.queue.length ?? 0
  $.ui.status(count > 0 ? `todo: ${count}` : undefined)
}

async function resolvePath($: EngineInterface, path: string) {
  if (path.startsWith('~/')) {
    const home = await $.env.get('HOME')

    return home === undefined ? undefined : `${home}${path.slice(1)}`
  }

  return path.startsWith('/') ? path : `${await $.session.cwd()}/${path}`
}

// Puts an image next to the list and answers its name relative to it. An image
// already inside .todo/ is referenced where it is; otherwise it is copied under
// its own name, with a numeric suffix when the name is taken.
async function place($: EngineInterface, dir: string, source: string) {
  if (source.startsWith(`${dir}/`)) {
    return source.slice(dir.length + 1)
  }

  const file = (source.split('/').pop() ?? 'image').replace(/\s+/g, '-')
  const dot = file.lastIndexOf('.')
  const stem = dot > 0 ? file.slice(0, dot) : file
  const ext = dot > 0 ? file.slice(dot) : ''
  let name = file

  for (let count = 2; await $.fs.exists(`${dir}/${name}`); count += 1) {
    name = `${stem}-${count}${ext}`
  }

  const made = await $.process.run(['mkdir', '-p', dir])
  const copied = made.exitCode === 0 ? await $.process.run(['cp', source, `${dir}/${name}`]) : made

  return copied.exitCode === 0 ? name : undefined
}

// Adds one item to Queue, as the skill does: the text as given, any image path
// that leads to a file copied into .todo/ and referenced inline.
async function add($: EngineInterface, args: string) {
  const dir = `${await $.session.root()}/.todo`
  const words: string[] = []
  const images: string[] = []

  for (const token of tokenize(args)) {
    const path = token.path === undefined ? undefined : await resolvePath($, token.path)

    if (path !== undefined && (await $.fs.exists(path))) {
      images.push(path)
    } else {
      words.push(token.word)
    }
  }

  const text = words.join(' ')

  if (text === '') {
    return USAGE
  }

  const alt = words.slice(0, 4).join(' ').replace(/[[\]]/g, '')
  let item = text

  for (const image of images) {
    const name = await place($, dir, image)

    if (name === undefined) {
      return `todo: could not copy ${image}, nothing was added`
    }

    item += ` ![${alt}](${name})`
  }

  const file = `${dir}/tasks.md`
  const source = await $.fs.read(file).catch(() => undefined)
  const added = addToQueue(source, item)

  if (added.isDuplicate) {
    return `todo: already in the queue: "${item}"`
  }

  await $.fs.write(file, added.source)
  await refresh($)

  return `todo: added "${text}" (${parse(added.source).queue.length} in queue)`
}

async function submit($: EngineInterface, text: string) {
  if (text.trim() === '') {
    return
  }

  $.ui.toast(await add($, text))
  await update($, sent, count => (count ?? 0) + 1)
}

export const register: Register = on => {
  let poll: Timer | undefined

  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'todo',
      description: 'Show the .todo/tasks.md backlog in a pane, or add an item to it',
      argumentHint: 'add <text> [image path]',
    })
    await refresh($).catch(() => undefined)
    poll?.cancel()
    poll = $.clock.every(POLL_MS, () => void refresh($).catch(() => undefined))

    return next(e)
  })

  on('command.run', { command: 'todo' }, async ($, e) => {
    const args = e.args.trim()
    const adding = /^add(?:\s+([\s\S]*))?$/.exec(args)

    if (adding !== null) {
      return { text: await add($, adding[1] ?? '') }
    }

    if (args !== '') {
      return { text: USAGE }
    }

    await refresh($).catch(() => undefined)
    await $.ui.open({ id: PANE, title: 'Todo', focus: true })

    return { text: 'Todo pane opened.' }
  })

  on('prompt.submit', async ($, e, next) => {
    const shortcut = e.origin.kind === 'composer' ? SHORTCUT.exec(e.text.trim()) : null

    if (shortcut === null) {
      return next(e)
    }

    const note = e.attachments?.length ? ' The pasted image was not saved: give its file path instead.' : ''

    return { drop: `${await add($, shortcut[1] ?? '')}${note}` }
  }).catch(($, e, next) =>
    next.called ? next(e) : { drop: 'todo: could not add the item, nothing was sent' },
  )

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const todo = await read($, list)
    const first = todo?.queue[0]

    if (e.props.hasSurvey || first === undefined) {
      return next(e)
    }

    const { Box, Button, Text } = $.ui.resolve(e)
    const more = todo === null ? 0 : todo.queue.length - 1

    return (
      <Box width={e.props.bodyColumns}>
        <Text dimColor wrap="truncate-end">
          next: {first}
          {more > 0 ? ` (+${more})` : ''}{' '}
        </Text>
        <Button key="open" label="Open" onPress={() => $.ui.open({ id: PANE, title: 'Todo' })} />
      </Box>
    )
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text } = $.ui.resolve(e)
    const todo = await read($, list)
    const count = await read($, sent)
    const room = Math.max(1, (e.viewport?.rows ?? 24) - DONE_SHOWN - 10)
    const queue = todo?.queue.slice(0, room) ?? []
    const done = todo?.done ?? []
    const hidden = (todo?.queue.length ?? 0) - queue.length
    let field: JSX.Element | null = null

    // The mobile surface has no text field.
    if (e.surface !== 'mobile') {
      const { Input } = $.ui.resolve(e)

      field = (
        <Box>
          <Text>{'# '}</Text>
          <Input
            key={`add-${count}`}
            placeholder="Add a new item"
            submitLabel="add"
            autoFocus
            onSubmit={text => submit($, text)}
          />
        </Box>
      )
    }

    return (
      <Box flexDirection="column" width={e.props.bodyColumns}>
        {field}
        <Text> </Text>
        {queue.length === 0 && <Text dimColor>Nothing on tasks queue...</Text>}
        {queue.map((item, index) => (
          <Text key={`queue-${index}`} wrap="truncate-end">
            {index + 1}. {item}
          </Text>
        ))}
        {hidden > 0 && <Text dimColor>… {hidden} more</Text>}
        {done.length > 0 && <Text> </Text>}
        {done.length > 0 && (
          <Text bold dimColor>
            Done ({done.length})
          </Text>
        )}
        {done.slice(0, DONE_SHOWN).map((item, index) => (
          <Text key={`done-${index}`} dimColor wrap="truncate-end">
            ✓ {item}
          </Text>
        ))}
      </Box>
    )
  })
}
