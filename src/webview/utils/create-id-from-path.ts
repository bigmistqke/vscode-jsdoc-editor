export function createIdFromPath(path: string) {
  // Replace invalid characters with underscores
  let id = path.replace(/[^a-zA-Z0-9-_:.]/g, '_____')

  // Ensure the ID starts with a letter
  if (!/^[a-zA-Z]/.test(id)) {
    id = 'id_' + id
  }

  return id
}
