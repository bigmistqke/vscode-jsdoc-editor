import clsx from 'clsx'
import { Setter, Show, createEffect, createMemo, createSignal, on, onMount } from 'solid-js'
import { Codicon } from '~/solid-codicon'
import { createIdFromPath } from '~/utils/create-id-from-path'
import { decrementSignal, incrementSignal } from '~/utils/increment-signal'
import { onToggle } from '~/utils/on-toggle'
import { spliceString } from '~/utils/splice-string'
import type { Files, UpdateAllConfig } from '~extension/types'
import { composeRegex } from '~extension/utils/compose-regex'
import { getHighlightElement } from './comment'
import styles from './search-and-replace.module.css'

export function SearchAndReplace(props: {
  onMount: (api: {
    replaceInput: HTMLInputElement
    searchInput: HTMLInputElement
    setSearchQuery: Setter<string>
  }) => void
  open: boolean
  files: Files
  onUpdate: (filePath: string, index: number, source: string) => void
  onUpdateAll: (config: UpdateAllConfig) => void
  onClose: () => void
}) {
  const [searchQuery, setSearchQuery] = createSignal<string>('')
  const [replaceQuery, setReplaceQuery] = createSignal<string>('')
  const [isRegex, setIsRegex] = createSignal(false)
  const [isCaseSensitive, setIsCaseSensitive] = createSignal(false)
  const [isWholeWord, setIsWholeWord] = createSignal(false)
  const [currentMatchIndex, setMatchIndex] = createSignal(0)

  const highlights = {
    allMatches: new Highlight(),
    currentMatch: new Highlight(),
  }

  CSS.highlights.set('all-matches', highlights.allMatches)

  let searchInput: HTMLInputElement
  let replaceInput: HTMLInputElement
  let searchIcons: HTMLDivElement

  const matches = createMemo(() => {
    const _query = searchQuery()
    if (!_query) return []
    const result: { start: number; end: number; path: string; index: number; id: string }[] = []
    for (const { path, comments } of props.files) {
      let index = 0
      for (const comment of comments) {
        result.push(
          ...findAllOccurrences(comment.source).map(([start, end]) => ({
            start,
            end,
            path,
            index,
            id: `${createIdFromPath(path)}${index}`,
          })),
        )
        index++
      }
    }
    return result
  })

  const incrementMatchIndex = () => incrementSignal(setMatchIndex, matches().length - 1)
  const decrementMatchIndex = () => decrementSignal(setMatchIndex, matches().length - 1)

  function findAllOccurrences(inputString: string): Array<[number, number]> {
    const regex = composeRegex({
      query: searchQuery(),
      isCaseSensitive: isCaseSensitive(),
      isWholeWord: isWholeWord(),
      isRegex: isRegex(),
    })
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
    highlights.currentMatch.clear()
    highlights.allMatches.clear()

    const match = matches()[currentMatchIndex()]
    if (!match) return

    const textarea = document.getElementById(match.id)?.querySelector('textarea')
    const highlight = getHighlightElement(match.id)?.firstChild

    if (textarea && highlight) {
      textarea.focus()
      textarea.setSelectionRange(match.start, match.end)

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
    const match = matches()[currentMatchIndex()]

    const originalSource = props.files.find((comment) => comment.path === match.path)?.comments[match.index]?.source

    if (!originalSource) {
      console.error('Can not find source', props.files, match.path)
      return
    }

    const source = spliceString(originalSource, match.start, match.end - match.start, replaceQuery())
    props.onUpdate(match.path, match.index, source)

    if (findAllOccurrences(replaceQuery())) {
      incrementMatchIndex()
    }
  }

  function replaceAll() {
    props.onUpdateAll({
      search: {
        query: searchQuery(),
        isRegex: isRegex(),
        isWholeWord: isWholeWord(),
        isCaseSensitive: isCaseSensitive(),
      },
      replace: replaceQuery(),
    })
  }

  // Highlight current match
  createEffect(
    on(
      () => [matches(), currentMatchIndex()] as const,
      ([matches, currentMatchIndex]) => {
        const match = matches[currentMatchIndex]

        if (!match) {
          highlights.currentMatch.clear()
          return
        }

        queueMicrotask(() => {
          const container = document.getElementById(match.id)
          const code = getHighlightElement(match.id)
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

            highlights.currentMatch = new Highlight(range)
            CSS.highlights.set('current-match', highlights.currentMatch)
            code.scrollIntoView({ block: 'center' })
          }
        })
      },
    ),
  )

  // Highlight all matches
  createEffect(
    on(matches, (matches) => {
      highlights.allMatches.clear()
      queueMicrotask(() => {
        for (const match of matches) {
          const code = getHighlightElement(match.id)
          const textNode = code?.firstChild
          if (textNode) {
            const range = new Range()
            range.setStart(textNode, match.start)
            range.setEnd(textNode, match.end)
            highlights.allMatches.add(range)
          }
        }
      })
    }),
  )

  // Reset match index when opening
  createEffect(() => props.open && setMatchIndex(0))

  onMount(() => props.onMount({ searchInput, replaceInput, setSearchQuery }))

  function onKeyDown(e: KeyboardEvent) {
    switch (e.key) {
      case 'Enter':
        if (e.target === searchInput) {
          const sub = e.shiftKey
          if (sub) decrementMatchIndex()
          else incrementMatchIndex()
        }
        break
      case 'ArrowDown':
      case 'ArrowUp':
        if (e.target === searchInput || searchIcons.contains(e.target as HTMLElement)) {
          replaceInput.focus()
          replaceInput.select()
        } else if (e.target === replaceInput) {
          searchInput.focus()
          searchInput.select()
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
          onInput={(e) => {
            setMatchIndex(0)
            setSearchQuery(e.currentTarget.value)
          }}
        />
        <div ref={searchIcons!} class={styles.searchIcons}>
          <Codicon
            aria-label="Match Case"
            title="Match Case"
            as="button"
            type="case-sensitive"
            class={isCaseSensitive() && 'active'}
            onClick={onToggle(setIsCaseSensitive)}
          />
          <Codicon
            aria-label="Match Whole Word"
            title="Match Whole Word"
            as="button"
            type="whole-word"
            class={isWholeWord() && 'active'}
            onClick={onToggle(setIsWholeWord)}
          />
          <Codicon
            aria-label="Use Regular Expression"
            title="Use Regular Expression"
            as="button"
            class={isRegex() && 'active'}
            type="regex"
            onClick={onToggle(setIsRegex)}
          />
        </div>
      </div>

      <div class={styles.row}>
        <div class={styles.count}>
          <Show when={matches().length > 0} fallback="No results.">
            {currentMatchIndex() + 1} of {matches().length}
          </Show>
        </div>
        <Codicon
          aria-label="Search Previous Occurence"
          title="Search Previous Occurence"
          as="button"
          class={styles.iconButton}
          type="arrow-up"
          onClick={decrementMatchIndex}
        />
        <Codicon
          aria-label="Search Next Occurence"
          title="Search Next Occurence"
          as="button"
          class={styles.iconButton}
          type="arrow-down"
          onClick={incrementMatchIndex}
        />
        <Codicon
          aria-label="Close Search Panel"
          as="button"
          class={styles.iconButton}
          type="close"
          onClick={() => props.onClose()}
        />
      </div>
      <input
        ref={replaceInput!}
        aria-label="Replace Input"
        placeholder="replace"
        onInput={(e) => setReplaceQuery(e.currentTarget.value)}
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
