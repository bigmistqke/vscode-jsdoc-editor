export function throttle<T extends (...args: any) => any>(mainFunction: T, delay: number) {
  let timeout: ReturnType<typeof setTimeout> | null = null
  return (...args: Parameters<T>) => {
    if (timeout === null) {
      mainFunction(...args)
      timeout = setTimeout(() => (timeout = null), delay)
    }
  }
}
