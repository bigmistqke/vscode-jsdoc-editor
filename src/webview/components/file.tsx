import { Index } from 'solid-js'
import { getIdFromPath } from '~/utils/get-id-from-path'
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
      <h1 id={getIdFromPath(props.file.relativePath, 'file')} class={styles.title}>
        <BreadCrumbs breadcrumbs={props.file.relativePath.split('/')} />
      </h1>
      <Index each={props.file.comments}>
        {(comment, commentIndex) => (
          <Comment
            comment={comment()}
            id={getIdFromPath(props.file.relativePath, 'comment', commentIndex)}
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
