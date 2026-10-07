import type { On } from 'claude-code'
import type { Engine } from 'claude-code/testing'
import { expect, mock, test } from 'claude-code/testing'

const SOURCE =
  '## Queue\n\n- [ ] export the report as csv\n- [ ] dark mode\n\n## Done\n\n- [x] retry failed syncs (a1b2c3d)\n'

const BAND = { hasSurvey: false, isWorking: false, maxRows: 10, bodyColumns: 80 } as never
const PANE = { bodyColumns: 80 } as never

// Starts a session in /project whose .todo/tasks.md holds `file.source`, or is
// missing, and answers every status line the mod set. The test edits the file by
// changing `file` and moving the clock; `existing` lists the other paths that
// exist, `commands` records the processes the mod ran and `sent` the prompts
// that reached the model.
const start = async ($: Engine, on: On, source: string | undefined, existing: string[] = []) => {
  const clock = mock.clock(on)
  const file = { source, mtimeMs: 1 }
  const statuses: (string | undefined)[] = []
  const commands: (readonly string[])[] = []
  const sent: string[] = []

  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  on('command.register', (_$, e) => ({ value: { command: e.name } }))
  on('session.root', () => ({ value: '/project' }))
  on('fs.stat', () =>
    file.source === undefined
      ? { deny: 'ENOENT' }
      : { value: { kind: 'file', size: file.source.length, mtimeMs: file.mtimeMs, isLink: false } },
  )
  on('fs.read', () => ({ value: file.source ?? '' }))
  on('fs.exists', (_$, e) => ({ value: existing.includes(e.path) }))
  on('fs.write', (_$, e) => {
    file.source = e.text
    file.mtimeMs += 1

    return { value: undefined }
  })
  on('process.run', (_$, e) => {
    commands.push(e.argv)

    return { value: { exitCode: 0, stdout: '', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }
  })
  on('prompt.submit', (_$, e) => {
    sent.push(e.text)

    return { text: e.text }
  })
  on('ui.toast', () => ({ value: undefined }))
  on('ui.status', (_$, e) => {
    statuses.push(e.text)

    return { value: undefined }
  })

  await $.session.start({ cwd: '/project', surface: 'terminal', isInteractive: true })

  return { clock, commands, file, sent, statuses }
}

const todo = async ($: Engine, args: string) =>
  (
    await $.command.run({
      command: 'todo',
      args,
      origin: { kind: 'composer' },
      presentation: { isFullscreen: false, columns: 80 },
    })
  ).text

test('the status line counts the queue', async ($, on) => {
  const { statuses } = await start($, on, SOURCE)

  expect(statuses).toEqual(['todo: 2'])
})

test('a change to the file is picked up on the next poll', async ($, on) => {
  const { clock, file, statuses } = await start($, on, SOURCE)

  await clock.advance(2000)
  expect(statuses).toEqual(['todo: 2'])

  file.source = SOURCE.replace('## Done', '- [ ] one more\n\n## Done')
  file.mtimeMs = 2
  await clock.advance(2000)

  expect(statuses).toEqual(['todo: 2', 'todo: 3'])
})

test('the band names the next item and how many follow it', async ($, on) => {
  await start($, on, SOURCE)

  const ui = await $.ui.mount({ plugin: 'todo', surface: 'terminal', component: 'AbovePrompt', props: BAND })

  expect(await ui.find({ type: 'Text', text: /next: export the report as csv \(\+1\)/ })).toBeDefined()
  expect(await ui.find({ key: 'open' })).toBeDefined()
})

test('the pane lists the queue and the latest done items', async ($, on) => {
  await start($, on, SOURCE)

  const ui = await $.ui.mount({
    plugin: 'todo',
    surface: 'terminal',
    component: 'Pane',
    requestId: 'todo',
    props: PANE,
  })

  expect(await ui.find({ type: 'Text', text: /1\. export the report as csv/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /2\. dark mode/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /Done \(1\)/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /retry failed syncs/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /Nothing on tasks queue/ })).toBeUndefined()
})

test('the pane says the queue is empty when the project has no list', async ($, on) => {
  await start($, on, undefined)

  const ui = await $.ui.mount({
    plugin: 'todo',
    surface: 'terminal',
    component: 'Pane',
    requestId: 'todo',
    props: PANE,
  })

  expect(await ui.find({ type: 'Text', text: /Nothing on tasks queue\.\.\./ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /Done/ })).toBeUndefined()
  expect(await ui.find({ key: 'add-0' })).toBeDefined()
})

test('the pane keeps the empty message and shows Done when only done items exist', async ($, on) => {
  await start($, on, '## Queue\n\n## Done\n\n- [x] retry failed syncs (a1b2c3d)\n')

  const ui = await $.ui.mount({
    plugin: 'todo',
    surface: 'terminal',
    component: 'Pane',
    requestId: 'todo',
    props: PANE,
  })

  expect(await ui.find({ type: 'Text', text: /Nothing on tasks queue\.\.\./ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /retry failed syncs/ })).toBeDefined()
})

test('/todo add appends the item to the queue', async ($, on) => {
  const { file, statuses } = await start($, on, SOURCE)

  expect(await todo($, 'add retry failed syncs')).toBe('todo: added "retry failed syncs" (3 in queue)')
  expect(file.source).toContain('- [ ] dark mode\n- [ ] retry failed syncs\n\n## Done')
  expect(statuses).toEqual(['todo: 2', 'todo: 3'])
})

test('/todo add creates the list when the project has none', async ($, on) => {
  const { file } = await start($, on, undefined)

  expect(await todo($, 'add first idea')).toBe('todo: added "first idea" (1 in queue)')
  expect(file.source).toBe('# Todo\n\n## Queue\n\n- [ ] first idea\n\n## Done\n')
})

test('/todo add does not repeat an item already in the queue', async ($, on) => {
  const { file } = await start($, on, SOURCE)

  expect(await todo($, 'add dark mode')).toBe('todo: already in the queue: "dark mode"')
  expect(file.source).toBe(SOURCE)
})

test('/todo add copies an image path into .todo and references it', async ($, on) => {
  const { commands, file } = await start($, on, SOURCE, ['/tmp/shot.png'])

  expect(await todo($, 'add login screen /tmp/shot.png')).toBe('todo: added "login screen" (3 in queue)')
  expect(commands).toEqual([
    ['mkdir', '-p', '/project/.todo'],
    ['cp', '/tmp/shot.png', '/project/.todo/shot.png'],
  ])
  expect(file.source).toContain('- [ ] login screen ![login screen](shot.png)\n')
})

test('/todo add numbers the copy when the name is taken', async ($, on) => {
  const { commands, file } = await start($, on, SOURCE, ['/tmp/shot.png', '/project/.todo/shot.png'])

  await todo($, 'add login screen /tmp/shot.png')

  expect(commands[1]).toEqual(['cp', '/tmp/shot.png', '/project/.todo/shot-2.png'])
  expect(file.source).toContain('![login screen](shot-2.png)')
})

test('/todo add keeps a path that is not a file as plain text', async ($, on) => {
  const { commands, file } = await start($, on, SOURCE)

  await todo($, 'add show /tmp/missing.png')

  expect(commands).toEqual([])
  expect(file.source).toContain('- [ ] show /tmp/missing.png\n')
})

test('/todo with something else says how it is used', async ($, on) => {
  const { file } = await start($, on, SOURCE)

  expect(await todo($, 'add')).toBe('Usage: /todo [add <text> [image path ...]]')
  expect(await todo($, 'remove 1')).toBe('Usage: /todo [add <text> [image path ...]]')
  expect(file.source).toBe(SOURCE)
})

test('the field in the pane adds the item and comes back empty', async ($, on) => {
  const { file } = await start($, on, SOURCE)
  const ui = await $.ui.mount({
    plugin: 'todo',
    surface: 'terminal',
    component: 'Pane',
    requestId: 'todo',
    props: PANE,
  })

  await ui.input({ key: 'add-0', text: 'from the pane' })

  expect(file.source).toContain('- [ ] from the pane\n')
  expect(await ui.find({ key: 'add-1' })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /3\. from the pane/ })).toBeDefined()
})

const typed = ($: Engine, text: string) =>
  $.prompt.submit({ text, wait: false, origin: { kind: 'composer' } })

test('# text typed alone adds the item and sends nothing to the model', async ($, on) => {
  const { file, sent } = await start($, on, SOURCE)

  const answer = await typed($, '# retry failed syncs')

  expect(answer).toEqual({ drop: 'todo: added "retry failed syncs" (3 in queue)' })
  expect(file.source).toContain('- [ ] dark mode\n- [ ] retry failed syncs\n\n## Done')
  expect(sent).toEqual([])
})

test('# text takes an image path like /todo add does', async ($, on) => {
  const { commands, file } = await start($, on, SOURCE, ['/tmp/shot.png'])

  await typed($, '#   login screen /tmp/shot.png')

  expect(commands[1]).toEqual(['cp', '/tmp/shot.png', '/project/.todo/shot.png'])
  expect(file.source).toContain('- [ ] login screen ![login screen](shot.png)\n')
})

test('a prompt that only starts with # goes through untouched', async ($, on) => {
  const { file, sent } = await start($, on, SOURCE)

  for (const text of ['#tag', '## second level', '#', '# title\nwith a body', 'fix the # in the url']) {
    await typed($, text)
  }

  expect(sent).toEqual(['#tag', '## second level', '#', '# title\nwith a body', 'fix the # in the url'])
  expect(file.source).toBe(SOURCE)
})

test('a # prompt that does not come from the composer goes through untouched', async ($, on) => {
  const { file } = await start($, on, SOURCE)

  const answer = await $.prompt.submit({ text: '# from a task', wait: false, origin: { kind: 'task-notification' } })

  expect(answer).toEqual({ text: '# from a task' })
  expect(file.source).toBe(SOURCE)
})
