import { parse } from 'comment-parser'
import { codeToHast, getHighlighter } from 'shiki/index.mjs'
import { Show, createEffect, createMemo, createResource, createSignal } from 'solid-js'
import { HastTextarea } from '~/hast-textarea'
import { defaultProps } from '~/hast-textarea/utils/process-props'
import { calculateContrastingColor } from '~/solid-shiki-textarea/utils/calculate-contrasting-color'
import { cleanComment } from '~/utils/clean-comment'
import { formatHastToMatchText } from '~/utils/format-hast-to-match-text'
import { isSingleLine } from '~/utils/is-single-line'
import { type Comment } from '~extension/types'
import { BreadCrumbs } from './breadcrumbs'
import styles from './comment.module.css'

export function getHighlightElement(id: string) {
  return document.getElementById(id)?.querySelector(`code.${styles.highlight}`)
}

export function Comment(props: {
  id: string
  comment: Comment
  theme?: string
  onUpdate: (value: string) => void
  onOpenLine: () => void
}) {
  const config = defaultProps(props, {
    theme: 'min-light',
  })
  const theme = () => config.theme?.toLowerCase()

  const [error, setError] = createSignal<string>()
  const [currentComment, setCurrentComment] = createSignal<string>(config.comment.source)
  createEffect(() => setCurrentComment(config.comment.source))

  const cleanedComment = createMemo(() => cleanComment(currentComment()))
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

  // Transform source to hast (hypertext abstract syntax tree)
  const [hast] = createResource(
    () => [currentComment(), cleanedComment(), theme()] as const,
    async ([currentComment, cleanedComment, theme]) => {
      const hast = await codeToHast(currentComment, { lang: 'tsx', theme })
      return await (currentComment ? formatHastToMatchText(hast, cleanedComment) : undefined)
    },
  )

  function validateComment(comment: string): boolean {
    try {
      const parsed = parse(comment)
      return parsed.length > 0
    } catch (e) {
      return false
    }
  }

  let commentBeforeFocus = ''
  function onBlur() {
    const comment = currentComment()
    if (commentBeforeFocus === comment) return
    if (validateComment(comment)) {
      config.onUpdate(comment)
      setError(undefined)
    } else {
      setError('Invalid JSDoc comment')
    }
  }

  function onInput(comment: string) {
    const lines = comment.split('\n')
    if (isSingleLine(comment)) {
      setCurrentComment(`/** ${lines[0]} */`)
    } else {
      setCurrentComment(`/** 
${comment
  .split('\n')
  .map((line) => `${config.comment.indentation} * ${line}`)
  .join('\n')}
${config.comment.indentation} */`)
    }
  }

  return (
    <div class={styles.comment}>
      <div class={styles.header}>
        <h2>
          <BreadCrumbs breadcrumbs={config.comment.breadcrumbs} />
        </h2>
        <button onClick={config.onOpenLine}>Go to Line {config.comment.line}</button>
      </div>
      <div class={styles.textareaContainer}>
        <Show when={hast() || hast.latest}>
          {(hast) => (
            <HastTextarea
              class={styles.textarea}
              hast={hast().children[0].children[0]}
              id={config.id}
              onBlur={onBlur}
              onFocus={() => (commentBeforeFocus = currentComment())}
              onInput={onInput}
              overlay={<code class={styles.highlight}>{cleanedComment()}</code>}
              style={{ ...themeStyles(), padding: '10px' }}
              theme={config.theme?.toLowerCase()}
              value={cleanedComment()}
            />
          )}
        </Show>
        <Show when={error()}>{(error) => <div class={styles.error}>{error()}</div>}</Show>
      </div>
    </div>
  )
}
