import { getHighlighter } from 'shiki'
import { Index, createMemo, createResource, createSignal, mapArray, mergeProps, onMount } from 'solid-js'
import { createStore, reconcile } from 'solid-js/store'
import { File, UpdateAllConfig } from '~extension/types'
import styles from './App.module.css'
import { BreadCrumbs } from './components/breadcrumbs'
import { Comment as CommentComponent } from './components/comment'
import { SearchAndReplace } from './components/search-and-replace'
import { calculateContrastingColor } from './solid-shiki-textarea/utils/calculate-contrasting-color'
import { cleanComment as cleanSource } from './utils/clean-comment'
import { createIdFromPath } from './utils/create-id-from-path'

export default function App() {
  const [theme, setTheme] = createSignal<string>('min-light') // Default theme
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

  onMount(() => {
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
    window.vscode.postMessage({ command: 'initialize' })
  })

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
        <Index each={files}>
          {(file, fileIndex) => (
            <div class={styles.file}>
              <h1>
                <BreadCrumbs breadcrumbs={file().relativePath.split('/')} />
              </h1>
              <Index each={file().comments}>
                {(comment, commentIndex) => (
                  <CommentComponent
                    cleanedSource={processedFiles()[fileIndex].comments[commentIndex].cleanedSource}
                    comment={comment()}
                    id={`${createIdFromPath(file().path)}${commentIndex}`}
                    onInput={(comment) => setSource(fileIndex, commentIndex, comment)}
                    onOpenLine={() => postOpenLine(file().path, comment().line)}
                    onUpdateFile={() => postUpdateFile(file().path, commentIndex, comment().source)}
                    theme={theme()}
                  />
                )}
              </Index>
            </div>
          )}
        </Index>
      </div>
    </div>
  )
}
