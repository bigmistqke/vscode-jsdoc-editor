import { MergeProps, mergeProps, splitProps } from 'solid-js'

type KeyOfOptionals<T> = keyof {
  [K in keyof T as T extends Record<K, T[K]> ? never : K]: T[K]
}

export function processProps<
  TProps extends Record<string, any>,
  TKey extends KeyOfOptionals<TProps>,
  TSplit extends (keyof TProps)[],
>(props: TProps, defaults: Required<Pick<TProps, TKey>>, split?: TSplit) {
  return splitProps(defaultProps(props, defaults), split || [])
}

// from https://github.com/solidjs/solid/issues/1526#issuecomment-1623035790
export function defaultProps<T, K extends KeyOfOptionals<T>>(
  props: T,
  defaults: Required<Pick<T, K>>,
): MergeProps<[Required<Pick<T, K>>, T]> {
  return mergeProps(defaults, props)
}
