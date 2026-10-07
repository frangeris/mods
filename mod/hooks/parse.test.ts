import { describe, expect, test } from 'claude-code/testing'

import { addToQueue, parse, tokenize } from './parse'

const FILE = `# Todo

## Queue

- [ ] export the report as csv
- [ ] dark mode ![mockup](dark-mode.png)
  ![detail](dark-mode-2.png)
- [x] not an item in the queue

## Done

- [x] retry failed syncs (a1b2c3d)
- [ ] not an item in done
`

describe('parse', () => {
  test('reads the open items of Queue and the checked items of Done', () => {
    expect(parse(FILE)).toEqual({
      queue: ['export the report as csv', 'dark mode [image]'],
      done: ['retry failed syncs (a1b2c3d)'],
    })
  })

  test('ignores everything outside the two sections', () => {
    const todo = parse('- [ ] before any heading\n\n## Notes\n\n- [ ] in another section\n')

    expect(todo).toEqual({ queue: [], done: [] })
  })

  test('matches the headings without regard to case and accepts CRLF', () => {
    const todo = parse('## queue\r\n- [ ] one\r\n## DONE\r\n- [X] two\r\n')

    expect(todo).toEqual({ queue: ['one'], done: ['two'] })
  })

  test('answers empty lists for an empty file', () => {
    expect(parse('')).toEqual({ queue: [], done: [] })
  })
})

describe('addToQueue', () => {
  test('inserts after the last item of Queue, keeping its indented lines together', () => {
    const source = '# Todo\n\n## Queue\n\n- [ ] one\n- [ ] two ![a](a.png)\n  ![b](b.png)\n\n## Done\n\n- [x] old (a1b2c3d)\n'
    const added = addToQueue(source, 'three')

    expect(added.isDuplicate).toBe(false)
    expect(added.source).toBe(
      '# Todo\n\n## Queue\n\n- [ ] one\n- [ ] two ![a](a.png)\n  ![b](b.png)\n- [ ] three\n\n## Done\n\n- [x] old (a1b2c3d)\n',
    )
  })

  test('creates the file with both sections when there is none', () => {
    expect(addToQueue(undefined, 'first').source).toBe('# Todo\n\n## Queue\n\n- [ ] first\n\n## Done\n')
    expect(addToQueue('  \n', 'first').source).toBe('# Todo\n\n## Queue\n\n- [ ] first\n\n## Done\n')
  })

  test('fills an empty Queue without losing the blank line before Done', () => {
    expect(addToQueue('## Queue\n\n## Done\n', 'first').source).toBe('## Queue\n\n- [ ] first\n\n## Done\n')
    expect(addToQueue('## Queue\n## Done\n', 'first').source).toBe('## Queue\n\n- [ ] first\n\n## Done\n')
  })

  test('creates a missing Queue heading before Done', () => {
    const added = addToQueue('# Todo\n\n## Done\n\n- [x] old\n', 'first')

    expect(added.source).toBe('# Todo\n\n## Queue\n\n- [ ] first\n\n## Done\n\n- [x] old\n')
  })

  test('reports an identical item instead of adding it', () => {
    const source = '## Queue\n\n- [ ] one\n\n## Done\n'

    expect(addToQueue(source, 'one')).toEqual({ source, isDuplicate: true })
  })

  test('keeps CRLF line endings and leaves text outside the sections alone', () => {
    const source = '## Notes\r\n\r\nkeep me\r\n\r\n## Queue\r\n\r\n- [ ] one\r\n\r\n## Done\r\n'

    expect(addToQueue(source, 'two').source).toBe(
      '## Notes\r\n\r\nkeep me\r\n\r\n## Queue\r\n\r\n- [ ] one\r\n- [ ] two\r\n\r\n## Done\r\n',
    )
  })
})

describe('tokenize', () => {
  test('marks the words that look like image paths and unescapes them', () => {
    expect(tokenize('dark mode /tmp/shot.png ~/My\\ Shots/a.JPG ./b.webp api/logo.png notes.png')).toEqual([
      { word: 'dark' },
      { word: 'mode' },
      { word: '/tmp/shot.png', path: '/tmp/shot.png' },
      { word: '~/My\\ Shots/a.JPG', path: '~/My Shots/a.JPG' },
      { word: './b.webp', path: './b.webp' },
      { word: 'api/logo.png' },
      { word: 'notes.png' },
    ])
  })
})
