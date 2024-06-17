import { getHighlighter } from 'shiki'
import { Index, Show, createEffect, createMemo, createResource, createSignal, mapArray, mergeProps } from 'solid-js'
import { createStore, reconcile } from 'solid-js/store'
import type { File, UpdateAllConfig } from '~extension/types'
import styles from './App.module.css'
import { File as FileComponent } from './components/file'
import { Hierachy } from './components/hierarchy'
import { SearchAndReplace } from './components/search-and-replace'
import { calculateContrastingColor } from './utils/calculate-contrasting-color'
import { cleanComment as cleanSource } from './utils/clean-comment'
import { getIdFromPath, getPathFromId } from './utils/get-id-from-path'
import { throttle } from './utils/throttle'

export default function App() {
  let commentsContainer: HTMLDivElement
  const [theme, setTheme] = createSignal<string>() // Default theme
  const [isSearchAndReplaceOpened, setIsSearchAndReplaceOpened] = createSignal(false)
  const [scrolledFilePath, setScrolledFilePath] = createSignal<string | undefined>()
  const [files, setFiles] = createStore<File[]>([])
  function setSource(fileIndex: number, commentIndex: number, source: string) {
    setFiles(fileIndex, 'comments', commentIndex, 'source', source)
  }
  const processedFiles = createMemo(
    mapArray(
      () => files,
      (file) => {
        const cleanedComments = createMemo(
          mapArray(
            () => file.comments,
            (comment) => {
              const cleanedSource = createMemo(() => cleanSource(comment.source))
              return mergeProps(comment, {
                get cleanedSource() {
                  return cleanedSource()
                },
              })
            },
          ),
        )
        return mergeProps(file, {
          get comments() {
            return cleanedComments()
          },
        })
      },
    ),
  )
  const initialised = createMemo((prev) => prev || (files && theme()), false)

  const [background] = createResource(theme, (theme) =>
    getHighlighter({ themes: [theme.toLowerCase()], langs: ['tsx'] })
      .then((highlighter) => highlighter.getTheme(theme?.toLowerCase()))
      .then((theme) => theme.bg),
  )

  // Get styles from current theme
  const [themeStyles] = createResource(theme, (theme) =>
    getHighlighter({ themes: [theme], langs: ['tsx'] })
      .then((highlighter) => highlighter.getTheme(theme))
      .then((theme) => ({
        '--theme-selection-color': calculateContrastingColor(theme.bg),
        '--theme-background-color': theme.bg,
        '--theme-foreground-color': theme.fg,
      })),
  )

  window.addEventListener('message', (event) => {
    const message = event.data
    switch (message.command) {
      case 'setFiles':
        setFiles(reconcile(message.files))
        break
      case 'setTheme':
        setTheme(message.theme.toLowerCase())
        break
    }
  })
  window.vscode.postMessage({ command: 'initialise' })

  function postUpdateFile(filePath: string, commentIndex: number, source: string) {
    window.vscode.postMessage({
      command: 'update',
      data: { filePath, index: commentIndex, comment: source },
    })
  }

  function postUpdateAll(data: UpdateAllConfig) {
    window.vscode.postMessage({
      command: 'updateAll',
      data,
    })
  }

  function postOpenLine(filePath: string, line: number) {
    window.vscode.postMessage({
      command: 'openFileAtLine',
      data: { filePath, line },
    })
  }

  function updateScrolledFilePathArray() {
    const titles = document.querySelectorAll('h1')
    let currentStickyHeaderId: string | undefined = undefined

    for (const title of titles) {
      const rect = title.getBoundingClientRect()
      if (rect.top <= 1 && rect.bottom >= 0) {
        currentStickyHeaderId = title.id
        break
      }
    }

    if (currentStickyHeaderId) {
      setScrolledFilePath(getPathFromId(currentStickyHeaderId))
    }
  }

  function scrollToFilePath(pathArray: string) {
    const id = getIdFromPath(pathArray, 'file')
    const section = document.getElementById(id)?.parentElement
    if (!section) return
    const top = section.offsetTop
    commentsContainer.scrollTo({ top })
  }

  createEffect(() => {
    if (!initialised()) return
    updateScrolledFilePathArray()
  })

  return (
    <div class={styles.root} style={{ '--background-color': background() }}>
      <Hierachy
        scrolledFilePathArray={scrolledFilePath()?.split('/')}
        files={processedFiles()}
        onScrollToFilePath={scrollToFilePath}
      />
      <div
        ref={commentsContainer!}
        class={styles.comments}
        style={themeStyles()}
        onScroll={throttle(updateScrolledFilePathArray, 100)}>
        <SearchAndReplace
          files={processedFiles()}
          onClose={() => setIsSearchAndReplaceOpened(false)}
          onOpen={() => setIsSearchAndReplaceOpened(true)}
          onReplace={(fileIndex, commentIndex, source) => {
            setSource(fileIndex, commentIndex, source)
            postUpdateFile(files[fileIndex].path, commentIndex, source)
          }}
          onReplaceAll={postUpdateAll}
          open={isSearchAndReplaceOpened()}
        />
        <Index each={processedFiles()}>
          {(file, fileIndex) => (
            <Show when={file().comments.length > 0}>
              <FileComponent
                file={file()}
                theme={theme()}
                onInput={(commentIndex, source) => {
                  setSource(fileIndex, commentIndex, source)
                }}
                onOpenLine={postOpenLine}
                onUpdateFile={postUpdateFile}
              />
            </Show>
          )}
        </Index>
      </div>
    </div>
  )
}
