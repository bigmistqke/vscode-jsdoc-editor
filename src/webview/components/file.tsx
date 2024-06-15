import { Index } from 'solid-js'
import { createIdFromPath } from '~/utils/create-id-from-path'
import type { CleanedFile } from '~extension/types'
import { BreadCrumbs } from './breadcrumbs'
import { Comment } from './comment'
import styles from './file.module.css'

export function File(props: {
  file: CleanedFile
  theme?: string
  onInput: (commentIndex: number, source: string) => void
  onOpenLine: (filePath: string, line: number) => void
  onUpdateFile: (filePath: string, commentIndex: number, source: string) => void
}) {
  return (
    <div class={styles.file}>
      <h1 class={styles.title}>
        <BreadCrumbs breadcrumbs={props.file.relativePath.split('/')} />
      </h1>
      <Index each={props.file.comments}>
        {(comment, commentIndex) => (
          <Comment
            comment={comment()}
            id={`${createIdFromPath(props.file.path)}${commentIndex}`}
            onInput={(source) => props.onInput(commentIndex, source)}
            onOpenLine={() => props.onOpenLine(props.file.path, comment().line)}
            onUpdateFile={() => props.onUpdateFile(props.file.path, commentIndex, comment().source)}
            theme={props.theme}
          />
        )}
      </Index>
    </div>
  )
}
