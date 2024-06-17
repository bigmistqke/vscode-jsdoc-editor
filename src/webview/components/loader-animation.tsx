import clsx from 'clsx'
import { ComponentProps } from 'solid-js'
import { Codicon } from '~/solid-codicon'
import styles from './loader-animation.module.css'

export function LoaderAnimation(props: ComponentProps<'div'>) {
  return (
    <div {...props} class={clsx(styles.container, props.class)}>
      <Codicon kind="loading" class={styles.icon} />
    </div>
  )
}
