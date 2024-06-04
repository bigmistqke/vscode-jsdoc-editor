import { createDeepSignal } from '@solid-primitives/resource'
import clsx from 'clsx'
import { codeToHast, codeToHtml, type BundledTheme, type CodeOptionsSingleTheme } from 'shiki'
import { ComponentProps, createEffect, createResource, createSignal, type JSX } from 'solid-js'
import styles from './index.module.css'
import { processProps } from './utils/process-props'

type Root = Awaited<ReturnType<typeof codeToHast>>
type Theme = CodeOptionsSingleTheme<BundledTheme>['theme']

/** A textarea with syntax highlighting capabilities powered by [shiki](https://github.com/shikijs/shiki). */
export function ShikiText(
  props: Omit<ComponentProps<'div'>, 'style' | 'onInput'> & {
    /** Custom CSS properties to apply to the editor. */
    style?: JSX.CSSProperties
    /** The source code to be displayed and edited. */
    value: string
    /** The default source code to initialize the editor with. */
    defaultValue?: string
    /** The theme to apply for syntax highlighting. */
    theme?: Theme
    /** Callback function to handle updates to the source code. */
    onInput?: (source: string) => void
    /** The programming language of the source code for syntax highlighting. */
    lang?: string
  },
) {
  const [config, rest] = processProps(props, { lang: 'tsx', theme: 'min-light' }, [
    'class',
    'defaultValue',
    'lang',
    'onInput',
    'value',
    'style',
    'theme',
    'onBlur',
  ])
  const [source, setSource] = createSignal(config.defaultValue || config.value)

  // Sync local source signal with config.source
  createEffect(() => setSource(config.value))

  // Transform source to hast (hypertext abstract syntax tree)
  const [html] = createResource(
    () => [source(), config.theme, config.lang] as const,
    ([source, theme, lang]) => (source ? codeToHtml(source, { lang, theme }) : ''),
    { storage: createDeepSignal },
  )

  return (
    <div class={clsx(styles.editor, config.class)} style={config.style} {...rest}>
      <div class={styles.container} innerHTML={html() || html.latest || ''}></div>
    </div>
  )
}
