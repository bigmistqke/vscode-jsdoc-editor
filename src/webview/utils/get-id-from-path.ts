const prefixDivider = '_______'
const postfixDivider = '_-_-_-_-'
const pathDivider = '-------'

export function getIdFromPath(path: string, prefix?: string | number, postfix?: string | number) {
  const parts = path.split('/')
  let string = ''

  if (prefix) {
    string += `${prefix}${prefixDivider}`
  }

  string += parts.join(pathDivider)

  if (postfix) {
    string += `${postfix}${postfixDivider}`
  }
  return string
}

export function getPathFromId(id: string) {
  let pathArray = id

  if (id.includes(prefixDivider)) {
    pathArray = id.split(prefixDivider)[1]
  }

  if (pathArray.includes(postfixDivider)) {
    pathArray = pathArray.split(postfixDivider)[0]
  }

  return pathArray.replaceAll(pathDivider, '/')
}
