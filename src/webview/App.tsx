import { getHighlighter } from 'shiki'
import { Index, Show, createMemo, createResource, createSignal, mapArray, mergeProps } from 'solid-js'
import { createStore, reconcile } from 'solid-js/store'
import type { File, UpdateAllConfig } from '~extension/types'
import styles from './App.module.css'
import { File as FileComponent } from './components/file'
import { SearchAndReplace } from './components/search-and-replace'
import { calculateContrastingColor } from './solid-shiki-textarea/utils/calculate-contrasting-color'
import { cleanComment as cleanSource } from './utils/clean-comment'

export default function App() {
  const [theme, setTheme] = createSignal<string>() // Default theme
  const [isSearchAndReplaceOpened, setIsSearchAndReplaceOpened] = createSignal(false)
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

  return (
    <div class={styles.root} style={{ '--background-color': background() }}>
      <SearchAndReplace
        files={processedFiles()}
        onClose={() => setIsSearchAndReplaceOpened(false)}
        onOpen={() => setIsSearchAndReplaceOpened(true)}
        onReplace={(fileIndex, commentIndex, source) => {
          setSource(fileIndex, commentIndex, source)
          postUpdateFile(files[fileIndex].path, commentIndex, source)
        }}
        onUpdateAll={postUpdateAll}
        open={isSearchAndReplaceOpened()}
      />
      <div class={styles.comments} style={{ ...themeStyles() }}>
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
