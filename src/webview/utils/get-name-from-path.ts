export function getNameFromPath(file: string) {
  const split = file.split('/')
  return split[split.length - 1]
}
