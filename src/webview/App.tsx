import { parse } from 'comment-parser'
import { getHighlighter } from 'shiki'
import { For, Index, Show, createEffect, createMemo, createResource, createSignal, onMount } from 'solid-js'
import { createStore, reconcile } from 'solid-js/store'
import type * as vscode from 'vscode'
import styles from './App.module.css'
import { Codicon } from './codicon/codicon'
import { ShikiTextarea } from './solid-shiki-textarea'
import { spliceString } from './utils/splice-string'

type Comment = { source: string; line: number; range: vscode.Range; target?: string }

const getFileNameFromPath = (file: string) => {
  const split = file.split('/')
  return split[split.length - 1]
}

function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') // $& means the whole matched string
}

export default function App() {
  const [comments, setComments] = createStore<Record<string, Comment[]>>({})
  const [theme, setTheme] = createSignal<string>() // Default theme

  onMount(() => {
    window.addEventListener('message', (event) => {
      const message = event.data
      console.log('received message', message)
      if (message.command === 'setComments') {
        window.vscode.setState({ comments: message.comments })
        setComments(reconcile(message.comments))
      } else if (message.command === 'setTheme') {
        setTheme(message.theme)
      }
    })
    window.vscode.postMessage({ command: 'initialize' })
  })

  const updateComment = (filePath: string, index: number, newComment: string) => {
    setComments(filePath, index, 'source', newComment)
    window.vscode.postMessage({
      command: 'updateComment',
      data: { filePath, index, comment: newComment },
    })
  }

  const openFileAtLine = (filePath: string, line: number) => {
    window.vscode.postMessage({
      command: 'openFileAtLine',
      data: { filePath, line },
    })
  }

  const [background] = createResource(theme, (theme) =>
    getHighlighter({ themes: [theme.toLowerCase()], langs: ['tsx'] })
      .then((highlighter) => highlighter.getTheme(theme?.toLowerCase()))
      .then((theme) => theme.bg),
  )

  return (
    <div class={styles.root} style={{ '--background-color': background() }}>
      <SearchAndReplace comments={comments} onUpdate={updateComment} />
      <div class={styles.comments}>
        <For each={Object.keys(comments)}>
          {(filePath) => (
            <div class={styles.file}>
              <h1>{getFileNameFromPath(filePath)}</h1>
              <Index each={comments[filePath]}>
                {(comment, index) => (
                  <Comment
                    id={`${getFileNameFromPath(filePath)}${index}`}
                    theme={theme()}
                    comment={comment()}
                    onUpdate={(value) => updateComment(filePath, index, value)}
                    onOpenLine={() => openFileAtLine(filePath, comment().line)}
                  />
                )}
              </Index>
            </div>
          )}
        </For>
      </div>
    </div>
  )
}

function Comment(props: {
  id: string
  comment: Comment
  theme?: string
  onUpdate: (value: string) => void
  onOpenLine: () => void
}) {
  const [source, setSource] = createSignal(props.comment.source)
  const [error, setError] = createSignal<string>()

  function validateComment(comment: string): boolean {
    try {
      const parsed = parse(comment)
      return parsed.length > 0
    } catch (e) {
      return false
    }
  }

  createEffect(() => setSource(props.comment.source))

  return (
    <div class={styles.comment}>
      <div class={styles.header}>
        <h2>
          <code class={styles.target}>{props.comment.target?.trim() || ''}</code>
        </h2>
        <button onClick={props.onOpenLine}>Go to Line {props.comment.line}</button>
      </div>
      <div class={styles.textareaContainer}>
        <ShikiTextarea
          id={props.id}
          theme={props.theme?.toLowerCase()}
          class={styles.textarea}
          style={{ padding: '10px' }}
          value={source()}
          onInput={setSource}
          onBlur={() => {
            console.log('BLUR!')
            const value = source()
            if (validateComment(value)) {
              props.onUpdate(value)
              setError(undefined)
            } else {
              setError('Invalid JSDoc comment')
            }
          }}>
          {(source) => <code class={styles.highlight}>{source()}</code>}
        </ShikiTextarea>
        <Show when={error()}>{(error) => <div class={styles.error}>{error()}</div>}</Show>
      </div>
    </div>
  )
}

function SearchAndReplace(props: {
  comments: Record<string, Comment[]>
  onUpdate: (filePath: string, index: number, source: string) => void
}) {
  const [searchQuery, setSearchQuery] = createSignal<string>('')
  const [replaceQuery, setReplaceQuery] = createSignal<string>('')

  const [isRegex, setIsRegex] = createSignal(false)
  const [isCaseSensitive, setIsCaseSensitive] = createSignal(false)
  const [isWholeWord, setIsWholeWord] = createSignal(false)

  const matches = createMemo(() => {
    const _query = searchQuery()
    if (!_query) return []
    const entries = Object.entries(props.comments)
    const result: { start: number; end: number; filePath: string; index: number; id: string }[] = []
    for (const [filePath, fileComments] of entries) {
      let index = 0
      for (const fileComment of fileComments) {
        result.push(
          ...findAllOccurrences(_query, fileComment.source).map(([start, end]) => ({
            start,
            end,
            filePath,
            index,
            id: `${getFileNameFromPath(filePath)}${index}`,
          })),
        )
        index++
      }
    }
    return result
  })

  const resultsHighlight = new Highlight()
  let currentHighlight = new Highlight()
  let searchInput: HTMLInputElement
  let replaceInput: HTMLInputElement
  const [matchIndex, setMatchIndex] = createSignal(0)

  CSS.highlights.set('search-inactive', resultsHighlight)

  // function escapeRegExp(string: string): string {
  //   return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  // }

  function findAllOccurrences(query: string, inputString: string): Array<[number, number]> {
    let searchString = isRegex() ? query : escapeRegExp(query)

    if (isWholeWord()) {
      searchString = `\\b${searchString}\\b`
    }

    console.log(searchString)
    const regex = new RegExp(searchString, `g${isCaseSensitive() ? '' : 'i'}`)
    const matches = inputString.matchAll(regex)
    const ranges: Array<[number, number]> = []

    for (const match of matches) {
      if (match.index !== undefined) {
        ranges.push([match.index, match.index + match[0].length])
      }
    }

    return ranges
  }

  function search(matchIndex: number) {
    const match = matches()[matchIndex]
    if (!match) {
      console.error('match is undefined', matches(), matchIndex)
    }
    const container = document.getElementById(match.id)
    const code = container?.querySelector(`code.${styles.highlight}`)
    const textNode = code?.firstChild
    if (container && textNode) {
      const range = new Range()
      range.setStart(textNode, match.start)
      range.setEnd(textNode, match.end)

      const { left } = range.getBoundingClientRect()

      if (left + container.scrollLeft > container.offsetWidth + container.scrollLeft) {
        container.scrollLeft = left - container.offsetWidth / 2
      }

      if (left + container.scrollLeft < container.scrollLeft) {
        container.scrollLeft = left - container.offsetWidth / 2
      }

      currentHighlight = new Highlight(range)
      CSS.highlights.set('search', currentHighlight)
      code.scrollIntoView({ block: 'center' })
    }
  }

  function select() {
    currentHighlight.clear()
    resultsHighlight.clear()
    const match = matches()[matchIndex()]
    const textarea = document.getElementById(match.id)?.querySelector('textarea')
    const highlight = document.getElementById(match.id)?.querySelector(`.${styles.highlight}`)?.firstChild
    if (textarea && highlight) {
      textarea.focus()
      textarea.setSelectionRange(match.start, match.end)
      // textarea.scrollIntoView({ block: 'center' })
      const range = new Range()
      range.setStart(highlight, match.start)
      range.setStart(highlight, match.end)

      // Scroll to the range
      const scrollElement = range.startContainer.parentElement
      if (scrollElement) {
        scrollElement.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' })
      }

      setSearchQuery('')
    }
  }

  function replace() {
    const match = matches()[matchIndex()]
    const source = spliceString(
      props.comments[match.filePath][match.index].source,
      match.start,
      match.end - match.start,
      replaceQuery(),
    )
    props.onUpdate(match.filePath, matchIndex(), source)
  }

  function replaceAll() {
    matches().forEach((match, index) => {
      const source = spliceString(
        props.comments[match.filePath][match.index].source,
        match.start,
        match.end - match.start,
        replaceQuery(),
      )
      props.onUpdate(match.filePath, index, source)
    })
  }

  // Highlight search matches
  createEffect(() => {
    resultsHighlight.clear()
    currentHighlight.clear()
    for (const match of matches()) {
      const code = document.getElementById(match.id)?.querySelector(`code.${styles.highlight}`)
      const textNode = code?.firstChild
      if (textNode) {
        const range = new Range()
        range.setStart(textNode, match.start)
        range.setEnd(textNode, match.end)
        resultsHighlight.add(range)
      }
    }
  })

  onMount(() => {
    window.addEventListener('keydown', (e) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'f') {
          searchInput.focus()
          searchInput.select()
        }
        if (e.key === 'r') {
          replaceInput.focus()
          replaceInput.select()
        }
      }
    })
  })

  function onKeyDown(e: KeyboardEvent) {
    switch (e.key) {
      case 'Enter':
        const sub = e.shiftKey
        setMatchIndex((matchIndex) => {
          matchIndex = sub ? --matchIndex : ++matchIndex
          const length = matches().length
          if (matchIndex < 0) {
            matchIndex = length - 1
          } else if (matchIndex > length - 1) {
            matchIndex = 0
          }
          return matchIndex
        })
        search(matchIndex())
        break
      case 'Escape':
        select()
        break
    }
  }

  function onSearchInput(e: InputEvent & { currentTarget: HTMLInputElement }) {
    setMatchIndex(0)
    setSearchQuery(e.currentTarget.value)
    search(matchIndex())
  }

  function onReplaceInput(e: InputEvent & { currentTarget: HTMLInputElement }) {
    setReplaceQuery(e.currentTarget.value)
  }

  return (
    <div class={styles.searchAndReplace}>
      <div class={styles.searchContainer}>
        <input
          aria-label="Find Input"
          title="Find Input"
          placeholder="find"
          ref={searchInput!}
          value={searchQuery()}
          onInput={onSearchInput}
          onKeyDown={onKeyDown}
        />
        <div class={styles.searchIcons}>
          <Codicon
            aria-label="Match Case"
            title="Match Case"
            as="button"
            type="case-sensitive"
            class={isCaseSensitive() && styles.active}
            onClick={() => setIsCaseSensitive((isCaseSensitive) => !isCaseSensitive)}
          />
          <Codicon
            aria-label="Match Whole Word"
            title="Match Whole Word"
            as="button"
            type="whole-word"
            class={isWholeWord() && styles.active}
            onClick={() => setIsWholeWord((isWholeWord) => !isWholeWord)}
          />
          <Codicon
            aria-label="Use Regular Expression"
            title="Use Regular Expression"
            as="button"
            class={isRegex() && styles.active}
            type="regex"
            onClick={() => setIsRegex((isRegex) => !isRegex)}
          />
        </div>
      </div>

      <div class={styles.row}>
        <div class={styles.count}>
          <Show when={matches().length > 0} fallback="No results.">
            {matchIndex()} of {matches().length}
          </Show>
        </div>
        <Codicon
          aria-label="Find Previous"
          title="Find Previous"
          as="button"
          class={styles.button}
          type="arrow-up"
          onClick={() =>
            search(
              setMatchIndex((matchIndex) => {
                matchIndex = matchIndex - 1
                if (matchIndex < 0) {
                  return matches().length - 1
                }
                return matchIndex
              }),
            )
          }
        />
        <Codicon
          aria-label="Find Next"
          title="Find Next"
          as="button"
          class={styles.button}
          type="arrow-down"
          onClick={() =>
            search(
              setMatchIndex((matchIndex) => {
                matchIndex = matchIndex + 1
                if (matchIndex > matches().length) {
                  return 0
                }
                return matchIndex
              }),
            )
          }
        />
        <Codicon aria-label="Close Search Panel" as="button" class={styles.button} type="close" />
      </div>
      <input
        ref={replaceInput!}
        aria-label="Replace Input"
        placeholder="replace"
        onInput={onReplaceInput}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            replace()
          }
        }}
      />
      <div class={styles.row}>
        <Codicon aria-label="Replace Next Occurence" as="button" type="replace" onClick={replace} />
        <Codicon aria-label="Replace All Occurences" as="button" type="replace-all" onClick={replaceAll} />
      </div>
    </div>
  )
}
