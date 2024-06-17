import clsx from 'clsx'
import { Show, createEffect, createMemo, createSignal, on, onMount } from 'solid-js'
import { composeComment } from '~/utils/compose-comment'
import { getIdFromPath } from '~/utils/get-id-from-path'
import { getMatchedRanges } from '~/utils/get-matched-ranges'
import { decrementSignal, incrementSignal } from '~/utils/increment-signal'
import { onToggle } from '~/utils/on-toggle'
import { spliceString } from '~/utils/splice-string'
import type { CleanedFile, UpdateAllConfig } from '~extension/types'
import { composeRegex } from '~extension/utils/compose-regex'
import { CodiconButton } from './codicon-button'
import { getHighlightElement } from './comment'
import { LoaderAnimation } from './loader-animation'
import styles from './search-and-replace.module.css'

type Match = {
  start: number
  end: number
  path: string
  index: number
  id: string
  fileIndex: number
  commentIndex: number
}

/**
 * SearchAndReplace component allows searching and replacing text within multiple files.
 *
 * @param props - The properties object.
 * @param props.files - An array of cleaned file objects where the search and replace operations will be performed.
 * @param props.onClose - Callback function to be called when the search panel is closed.
 * @param props.onOpen - Callback function to be called when the search panel is opened.
 * @param props.onReplace - Callback function to be called when a replace operation is performed.
 * @param props.onUpdateAll - Callback function to be called when the replace all operation is performed.
 * @param props.open - A boolean indicating whether the search panel is open or closed.
 *
 * @example
 * <SearchAndReplace
 *   files={files}
 *   onClose={() => console.log('Search panel closed')}
 *   onOpen={() => console.log('Search panel opened')}
 *   onReplace={(fileIndex, commentIndex, source) => console.log(`Replaced text in file ${fileIndex}, comment ${commentIndex}`)}
 *   onUpdateAll={(config) => console.log('Replace all config', config)}
 *   open={true}
 * />
 */
export function SearchAndReplace(props: {
  files: CleanedFile[]
  pendingReplaceAll: boolean
  onClose: () => void
  onOpen: () => void
  onReplace: (fileIndex: number, commentIndex: number, source: string) => void
  onReplaceAll: (config: UpdateAllConfig) => void
  open: boolean
}) {
  const [searchQuery, setSearchQuery] = createSignal<string>('')
  const [replaceQuery, setReplaceQuery] = createSignal<string>('')
  const [isRegex, setIsRegex] = createSignal(false)
  const [isCaseSensitive, setIsCaseSensitive] = createSignal(false)
  const [isWholeWord, setIsWholeWord] = createSignal(false)

  const [currentMatchIndex, setMatchIndex] = createSignal(0)
  const incrementMatchIndex = () => incrementSignal(setMatchIndex, matches().length - 1)
  const decrementMatchIndex = () => decrementSignal(setMatchIndex, matches().length - 1)

  const regex = createMemo(() =>
    composeRegex({
      query: searchQuery(),
      isCaseSensitive: isCaseSensitive(),
      isWholeWord: isWholeWord(),
      isRegex: isRegex(),
    }),
  )

  let searchInput: HTMLInputElement
  let replaceInput: HTMLInputElement
  let searchIcons: HTMLDivElement
  const highlights = {
    allMatches: new Highlight(),
    currentMatch: new Highlight(),
  }
  CSS.highlights.set('all-matches', highlights.allMatches)

  const matches = createMemo(() => {
    const _query = searchQuery()
    if (!_query) return []
    const result: Match[] = []
    for (let fileIndex = 0; fileIndex < props.files.length; fileIndex++) {
      const { path, relativePath, comments } = props.files[fileIndex]
      let index = 0
      for (let commentIndex = 0; commentIndex < comments.length; commentIndex++) {
        const cleanedSource = comments[commentIndex].cleanedSource

        if (!cleanedSource) {
          console.error('cleanedSource is undefined')
          continue
        }

        const ranges = getMatchedRanges(cleanedSource, regex()).map(([start, end]) => ({
          start,
          end,
          path,
          index,
          fileIndex,
          commentIndex,
          id: getIdFromPath(relativePath, 'comment', commentIndex),
        }))

        result.push(...ranges)
        index++
      }
    }
    return result
  })

  // Highlight current match
  createEffect(
    on(
      () => [matches(), currentMatchIndex()] as const,
      ([_matches, currentMatchIndex]) => {
        // FIXME
        // why do we have to delay the highlight for some unknown reason.
        queueMicrotask(() => {
          const match = _matches[currentMatchIndex]

          console.log('match is', match, matches())

          if (!match) {
            highlights.currentMatch.clear()
            return
          }

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
      // FIXME
      // why do we have to delay the highlight for some unknown reason.
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

  // Initialize keydown-event
  onMount(() => {
    function onKeyDown(e: KeyboardEvent) {
      const cmd = e.ctrlKey || e.metaKey
      switch (e.key) {
        case 'f':
          if (cmd) {
            props.onOpen()
            const selection = window.getSelection()
            setSearchQuery(selection?.toString() || '')
            searchInput.focus()
            searchInput.select()
          }
          break
        case 'r':
          if (cmd) {
            props.onOpen()
            replaceInput.focus()
            replaceInput.select()
          }
          break
      }
    }
    window.addEventListener('keydown', onKeyDown)
  })

  // Select the currently match
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

  // Replace the current match with the replaceQuery
  function replace() {
    const match = matches()[currentMatchIndex()]

    const comment = props.files[match.fileIndex].comments[match.commentIndex]

    if (!comment) {
      console.error('Can not find comment', props.files, match.path)
      return
    }

    const newCleanedSource = spliceString(comment.cleanedSource, match.start, match.end - match.start, replaceQuery())
    props.onReplace(match.fileIndex, match.commentIndex, composeComment(newCleanedSource, comment.indentation))

    if (getMatchedRanges(replaceQuery(), regex())) {
      incrementMatchIndex()
    }
  }

  // Replace all the matches with the replaceQuery
  function replaceAll() {
    props.onReplaceAll({
      search: {
        query: searchQuery(),
        isRegex: isRegex(),
        isWholeWord: isWholeWord(),
        isCaseSensitive: isCaseSensitive(),
      },
      replace: replaceQuery(),
    })
  }

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
      <div class={styles.inputContainer}>
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
        <div ref={searchIcons!} class={styles.inputIcons}>
          <CodiconButton
            aria-label="Match Case"
            title="Match Case"
            kind="case-sensitive"
            class={isCaseSensitive() ? 'active' : undefined}
            onClick={onToggle(setIsCaseSensitive)}
          />
          <CodiconButton
            aria-label="Match Whole Word"
            title="Match Whole Word"
            kind="whole-word"
            class={isWholeWord() ? 'active' : undefined}
            onClick={onToggle(setIsWholeWord)}
          />
          <CodiconButton
            aria-label="Use Regular Expression"
            title="Use Regular Expression"
            class={isRegex() ? 'active' : undefined}
            kind="regex"
            onClick={onToggle(setIsRegex)}
          />
        </div>
      </div>

      <div class={styles.row}>
        <div class={styles.count} data-break-350>
          <Show when={matches().length > 0} fallback="No results.">
            {currentMatchIndex() + 1} of {matches().length}
          </Show>
        </div>
        <CodiconButton
          aria-label="Search Previous Occurence"
          title="Search Previous Occurence"
          kind="arrow-up"
          onClick={decrementMatchIndex}
          data-break-400
          type="bare"
        />
        <CodiconButton
          aria-label="Search Next Occurence"
          data-break-400
          kind="arrow-down"
          onClick={incrementMatchIndex}
          title="Search Next Occurence"
          type="bare"
        />
        <CodiconButton
          aria-label="Close Search Panel"
          kind="close"
          onClick={() => props.onClose()}
          title="Close Search Panel"
          type="bare"
        />
      </div>
      <div class={styles.inputContainer}>
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
        <div class={styles.inputIcons} data-break-350-show>
          <CodiconButton aria-label="Replace Next Occurences" kind="replace" onClick={replace} />
          <CodiconButton aria-label="Replace All Occurences" kind="replace-all" onClick={replaceAll} />
        </div>
      </div>
      <div class={styles.row}>
        <CodiconButton aria-label="Replace Next Occurence" kind="replace" onClick={replace} data-break-350 />
        <CodiconButton aria-label="Replace All Occurences" kind="replace-all" onClick={replaceAll} data-break-350 />
        <Show when={props.pendingReplaceAll}>
          <div class={styles.loaderContainer}>
            <LoaderAnimation class={styles.loader} data-break-350 />
          </div>
        </Show>
      </div>
    </div>
  )
}
