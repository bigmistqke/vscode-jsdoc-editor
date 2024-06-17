import clsx from 'clsx'
import { ComponentProps } from 'solid-js'
import { processProps } from '~/utils/process-props'
import styles from './button.module.css'

export function Button(props: Omit<ComponentProps<'button'>, 'type'> & { type?: 'bare' | 'default' }) {
  const [config, rest] = processProps(props, { type: 'default' }, ['class', 'type'])
  return <button {...rest} class={clsx(styles[config.type], config.class)} />
}
