import clsx from 'clsx'
import Fuse from 'fuse.js'
import { For, Show, createContext, createEffect, createMemo, createSignal, on, useContext } from 'solid-js'
import { Codicon } from '~/solid-codicon'
import { CleanedFile } from '~extension/types'

import { every, when, whenever } from '~/utils/conditionals'
import { getIdFromPath } from '~/utils/get-id-from-path'
import { isNonNullable } from '~/utils/is-nullable'
import { Button } from './button'
import { CodiconButton } from './codicon-button'
import styles from './hierarchy.module.css'
import { LoaderAnimation } from './loader-animation'

const fuzzyOptions = {
  includeScore: true,
  shouldSort: false,
  threshold: 0.2,
}
function fuzzySearch(query: string, paths: string[]) {
  // Create a new Fuse instance
  const fuse = new Fuse(paths, fuzzyOptions)

  // Perform the search
  const results = fuse.search(query)

  return results.map((result) => result.item)
}

function processFiles(files: CleanedFile[]) {
  const hierarchy: Record<string, any> = {}
  for (const file of files) {
    const path = file.relativePath.split('/')
    const fileName = path.pop() as string
    let node = hierarchy
    for (const directory of path) {
      if (!(directory in node)) {
        node[directory] = {}
      }
      node = node[directory]
    }
    node[fileName] = true
  }
  return hierarchy
}

const hierarchyContext = createContext<{
  expanded: boolean
  matches: string[] | undefined
  scrollToFilePath: (path: string) => void
  scrolledFilePathArray: string[] | undefined
}>()
function useHiearchy() {
  const context = useContext(hierarchyContext)
  if (!context) throw 'useHiearchy should be called in a descendant of Hierachy'
  return context
}

export function Hierachy(props: {
  scrolledFilePathArray: string[] | undefined
  files: CleanedFile[]
  onScrollToFilePath: (pathArray: string) => void
  initialised: boolean
}) {
  let scrollContainer: HTMLDivElement
  const [searchQuery, setSearchQuery] = createSignal<string>()
  const [expanded, setExpanded] = createSignal(true)
  const [currentMatchIndex, setCurrentMatchIndex] = createSignal<number | undefined>()
  const currentMatch = () =>
    when(every(matches, currentMatchIndex), ([matches, currentMatchIndex]) => matches[currentMatchIndex])

  const hierarchy = createMemo(() => processFiles(props.files.filter((file) => file.comments.length > 0)))
  const matches = createMemo(
    whenever(searchQuery, (searchQuery) =>
      fuzzySearch(
        searchQuery,
        props.files.filter((file) => file.comments.length > 0).map((file) => file.relativePath),
      ),
    ),
  )

  createEffect(on(matches, () => setCurrentMatchIndex(undefined)))
  const incrementCurrentMatchIndex = () => {
    setCurrentMatchIndex((matchIndex) =>
      when(
        matches,
        (matches) => (isNonNullable(matchIndex) ? (matchIndex + 1) % matches.length : 0),
        () => undefined,
      ),
    )
  }
  const decrementCurrentMatchIndex = () => {
    setCurrentMatchIndex((matchIndex) =>
      when(
        matches,
        (matches) => {
          if (!matchIndex) return matches.length - 1
          return matchIndex - 1
        },
        () => undefined,
      ),
    )
  }

  // Scroll to the currently matched button if it is outside the viewport
  createEffect(
    whenever(currentMatch, (currentMatch) => {
      const button = document.getElementById(getIdFromPath(currentMatch, 'hierarchy-button'))
      if (!button) return

      const containerRect = scrollContainer.getBoundingClientRect()
      const buttonRect = button.getBoundingClientRect()

      if (buttonRect.top < containerRect.top) {
        scrollContainer.scrollTop -= containerRect.top - buttonRect.top
      } else if (buttonRect.bottom > containerRect.bottom) {
        scrollContainer.scrollTop += buttonRect.bottom - containerRect.bottom
      }
    }),
  )

  return (
    <hierarchyContext.Provider
      value={{
        get expanded() {
          return expanded()
        },
        get scrolledFilePathArray() {
          return props.scrolledFilePathArray
        },
        get matches() {
          return matches()
        },
        scrollToFilePath: props.onScrollToFilePath,
      }}>
      <div class={clsx(styles.hierarchy, expanded() && styles.expanded)}>
        <header class={clsx(styles.header, expanded() && styles.expanded)}>
          <Show when={expanded()}>
            <FilterFileInput
              searchQuery={searchQuery()}
              onSubmit={(e) => {
                when(matches, (matches) => {
                  if (e.shiftKey) {
                    decrementCurrentMatchIndex()
                  } else {
                    incrementCurrentMatchIndex()
                  }
                  props.onScrollToFilePath(matches[currentMatchIndex() || 0])
                })
              }}
              onInput={setSearchQuery}
            />
          </Show>
          <CodiconButton
            type="bare"
            class={styles.closeButton}
            kind={expanded() ? 'chrome-minimize' : 'arrow-right'}
            onClick={() => setExpanded((expanded) => !expanded)}
          />
        </header>
        <Show when={props.initialised} fallback={<LoaderAnimation />}>
          <div ref={scrollContainer!} class={styles.scrollContainer}>
            <For each={Object.keys(hierarchy())}>
              {(path) => <Node visible={true} node={hierarchy()[path]} path={[path]} />}
            </For>
          </div>
        </Show>
      </div>
    </hierarchyContext.Provider>
  )
}

function FilterFileInput(props: {
  searchQuery: string | undefined
  onInput: (value: string | undefined) => void
  onSubmit: (e: KeyboardEvent) => void
}) {
  return (
    <div class={styles.inputContainer}>
      <div>
        <Show when={!props.searchQuery}>
          <Codicon kind="search" class={styles.searchIcon} />
        </Show>
        <input
          value={props.searchQuery || ''}
          placeholder="Filter files"
          onInput={(e) => props.onInput(e.currentTarget.value)}
          onKeyDown={(e) => {
            switch (e.key) {
              case 'Enter':
                props.onSubmit(e)
                break
              case 'Escape':
                props.onInput(undefined)
                break
            }
          }}
        />
      </div>
    </div>
  )
}

export function Node(props: { visible: boolean; node: Record<string, any> | boolean; path: string[] }) {
  const context = useHiearchy()

  const visible = () => {
    if (!context.expanded) {
      return false
    }
    if (context.matches) {
      return !!context.matches.find((match) => match.includes(props.path.join('/')))
    }
    return props.visible
  }
  return (
    <Show
      when={typeof props.node !== 'boolean' && props.node}
      fallback={<FileNode visible={visible()} path={props.path} />}>
      {(node) => <FolderNode visible={visible()} node={node()} path={props.path} />}
    </Show>
  )
}

function FileNode(props: { path: string[]; visible: boolean }) {
  const context = useHiearchy()
  const isActive = () => {
    if (!context.scrolledFilePathArray) return false
    return props.path.every((part, i) => part === context.scrolledFilePathArray![i])
  }
  return (
    <Button
      type="bare"
      id={getIdFromPath(props.path.join('/'), 'hierarchy-button')}
      onClick={() => context.scrollToFilePath(props.path.join('/'))}
      class={clsx(styles.button, isActive() && styles.active)}
      inert={!props.visible ? true : undefined}
      style={{
        'padding-left': `${props.path.length * 15}px`,
        display: !props.visible ? 'none' : undefined,
      }}>
      <Codicon kind="circle-small-filled" />
      {props.path[props.path.length - 1]}
    </Button>
  )
}

function FolderNode(props: { node: Record<string, any>; path: string[]; visible: boolean }) {
  const [childrenVisible, setChildrenVisible] = createSignal(false)
  const context = useHiearchy()

  const isActive = () => {
    if (!props.visible) return false
    if (context.matches) return false
    if (childrenVisible()) return false
    if (!context.scrolledFilePathArray) return false
    return props.path.every((part, i) => part === context.scrolledFilePathArray![i])
  }

  return (
    <>
      <Button
        type="bare"
        onClick={() => {
          if (context.matches) return
          setChildrenVisible((visible) => !visible)
        }}
        class={clsx(styles.button, isActive() && styles.active)}
        inert={!props.visible ? true : undefined}
        style={{
          'padding-left': `${props.path.length * 15}px`,
          display: !props.visible ? 'none' : undefined,
        }}>
        <Codicon kind={context.matches ? 'dash' : childrenVisible() ? 'chevron-down' : 'chevron-right'} />
        {props.path[props.path.length - 1]}
      </Button>
      <For each={Object.keys(props.node)}>
        {(path) => (
          <Node visible={props.visible && childrenVisible()} node={props.node[path]} path={[...props.path, path]} />
        )}
      </For>
    </>
  )
}
