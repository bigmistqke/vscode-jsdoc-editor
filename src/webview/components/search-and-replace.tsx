import clsx from 'clsx'
import { Setter, Show, createEffect, createMemo, createSignal, onMount } from 'solid-js'
import { Comment } from '../App'
import { Codicon } from '../codicon/codicon'
import { spliceString } from '../utils/splice-string'

import styles from '../App.module.css'
import { getNameFromPath } from '../utils/get-name-from-path'

function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') // $& means the whole matched string
}

export function SearchAndReplace(props: {
  onMount: (api: {
    replaceInput: HTMLInputElement
    searchInput: HTMLInputElement
    setSearchQuery: Setter<string>
  }) => void
  open: boolean
  comments: Record<string, Comment[]>
  onUpdate: (filePath: string, index: number, source: string) => void
  onClose: () => void
}) {
  const [searchQuery, setSearchQuery] = createSignal<string>('')
  const [replaceQuery, setReplaceQuery] = createSignal<string>('')
  const [isRegex, setIsRegex] = createSignal(false)
  const [isCaseSensitive, setIsCaseSensitive] = createSignal(false)
  const [isWholeWord, setIsWholeWord] = createSignal(false)
  const [matchIndex, setMatchIndex] = createSignal(0)

  const resultsHighlight = new Highlight()
  let currentHighlight = new Highlight()
  let searchInput: HTMLInputElement
  let replaceInput: HTMLInputElement
  let searchIcons: HTMLDivElement

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
            id: `${getNameFromPath(filePath)}${index}`,
          })),
        )
        index++
      }
    }
    return result
  })

  function findAllOccurrences(query: string, inputString: string): Array<[number, number]> {
    let searchString = isRegex() ? query : escapeRegExp(query)

    if (isWholeWord()) {
      searchString = `\\b${searchString}\\b`
    }

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

  function select() {
    currentHighlight.clear()
    resultsHighlight.clear()
    const match = matches()[matchIndex()]
    if (!match) return
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

  function search(matchIndex: number) {
    const match = matches()[matchIndex]
    if (!match) return
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

  function searchNext() {
    search(
      setMatchIndex((matchIndex) => {
        matchIndex = matchIndex + 1
        if (matchIndex > matches().length - 1) {
          return 0
        }
        return matchIndex
      }),
    )
  }

  function searchPrevious() {
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

  createEffect(() => {
    if (props.open) {
      setMatchIndex(0)
      search(0)
    }
  })

  onMount(() => {
    props.onMount({ searchInput, replaceInput, setSearchQuery })
    CSS.highlights.set('search-inactive', resultsHighlight)
  })

  function onKeyDown(e: KeyboardEvent) {
    switch (e.key) {
      case 'Enter':
        if (e.target === searchInput) {
          const sub = e.shiftKey
          if (sub) searchPrevious()
          else searchNext()
        }
        break
      case 'Escape':
        if (e.target instanceof HTMLElement && searchIcons.contains(e.target)) {
          searchInput.focus()
          searchInput.select()
        } else {
          select()
          props.onClose()
        }
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
    <div
      aria-hidden={props.open}
      class={clsx(styles.searchAndReplace, props.open && styles.open)}
      onKeyDown={onKeyDown}>
      <div class={styles.searchContainer}>
        <input
          aria-label="Find Input"
          title="Find Input"
          placeholder="find"
          ref={searchInput!}
          value={searchQuery()}
          onInput={onSearchInput}
        />
        <div ref={searchIcons!} class={styles.searchIcons}>
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
          aria-label="Search Previous Occurence"
          title="Search Previous Occurence"
          as="button"
          class={styles.typoButton}
          type="arrow-up"
          onClick={searchPrevious}
        />
        <Codicon
          aria-label="Search Next Occurence"
          title="Search Next Occurence"
          as="button"
          class={styles.typoButton}
          type="arrow-down"
          onClick={searchNext}
        />
        <Codicon
          aria-label="Close Search Panel"
          as="button"
          class={styles.typoButton}
          type="close"
          onClick={() => props.onClose()}
        />
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
