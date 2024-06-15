import { parse } from 'comment-parser'
import { codeToHast } from 'shiki/index.mjs'
import { Show, createResource, createSignal } from 'solid-js'
import { HastTextarea } from '~/hast-textarea'
import { composeComment } from '~/utils/compose-comment'
import { formatHastToMatchText } from '~/utils/format-hast-to-match-text'
import { type Comment } from '~extension/types'
import { BreadCrumbs } from './breadcrumbs'
import styles from './comment.module.css'

export function getHighlightElement(id: string) {
  return document.getElementById(id)?.querySelector(`code.${styles.highlight}`)
}

function validateSource(source: string): boolean {
  try {
    const parsed = parse(source)
    return parsed.length > 0
  } catch (e) {
    return false
  }
}

export function Comment(props: {
  id: string
  comment: Comment
  cleanedSource: string
  theme: string
  onInput: (value: string) => void
  onOpenLine: () => void
  onUpdateFile: () => void
}) {
  const [error, setError] = createSignal<string>()

  // Transform source to hast (hypertext abstract syntax tree)
  const [hast] = createResource(
    () => [props.comment.source, props.cleanedSource, props.theme] as const,
    async ([source, cleanedSource, theme]) => {
      const hast = await codeToHast(source, { lang: 'tsx', theme })
      return await (source ? formatHastToMatchText(hast, cleanedSource) : undefined)
    },
  )

  let commentBeforeFocus = ''
  function onFocus() {
    commentBeforeFocus = props.comment.source
  }
  function onBlur() {
    const comment = props.comment.source
    if (commentBeforeFocus === comment) return
    if (validateSource(comment)) {
      setError(undefined)
      props.onUpdateFile()
    } else {
      setError('Invalid JSDoc comment')
    }
  }

  function onInput(comment: string) {
    props.onInput(composeComment(comment, props.comment.indentation))
  }

  return (
    <div class={styles.comment}>
      <div class={styles.header}>
        <h2>
          <BreadCrumbs breadcrumbs={props.comment.breadcrumbs} />
        </h2>
        <button onClick={props.onOpenLine}>Go to Line {props.comment.line}</button>
      </div>
      <div class={styles.textareaContainer}>
        <HastTextarea
          class={styles.textarea}
          hast={(hast() || hast.latest)?.children?.[0]?.children[0]}
          id={props.id}
          onBlur={onBlur}
          onFocus={onFocus}
          onInput={onInput}
          overlay={<code class={styles.highlight}>{props.cleanedSource}</code>}
          style={{ padding: '10px' }}
          theme={props.theme?.toLowerCase()}
          value={props.cleanedSource}
        />
        <Show when={error()}>{(error) => <div class={styles.error}>{error()}</div>}</Show>
      </div>
    </div>
  )
}
