function trimAsterisks(str: string) {
  return str.replace(/^\*+|\*+$/g, '')
}

/**
 * Segments a JSDoc comment into its constituent parts for cleaning.
 * Handles both single-line and multi-line JSDoc comments, extracting
 * meaningful components such as comment markers and content.
 *
 * @param comment - The JSDoc comment string to be segmented.
 * @returns An array of arrays, where each sub-array contains parts of the JSDoc comment.
 */
function segmentCommentForCleaning(comment: string) {
  // Split the input string into lines
  const lines = comment.split('\n')

  // Handle single-line comments
  if (lines.length === 1) {
    // Target: Single-line JSDoc comments
    // Regex: /^\/\*\*(.*)\*\/$/
    // - ^\/\*\* : Match the start of a single-line JSDoc comment (/**)
    // - (.*) : Capture the content inside the JSDoc comment
    // - \*\/$ : Match the end of a single-line JSDoc comment (*/)
    const singleLineMatch = comment.match(/^\/\*\*(.*)\*\/$/)

    // If a single-line comment is found, parse it and return
    if (singleLineMatch) {
      // Extract the content between /** and */
      return [['/** ', trimAsterisks(singleLineMatch[1].trim()), ' */']]
    }
  }

  // Target: Start of a multi-line JSDoc comment
  // Regex: /^\/\*\*(.*)$/
  // - ^\/\*\* : Match the start of a multi-line JSDoc comment (/**)
  // - (.*) : Capture any content that follows
  // - $ : Match the end of the line
  const isStartOfComment = /^\/\*\*(.*)$/

  // Target: End of a multi-line JSDoc comment
  // Regex: /^(.*)\*\/$/
  // - ^(.*) : Capture any content at the start of the line
  // - \*\/$ : Match the end of a multi-line JSDoc comment (*/)
  const isEndOfComment = /^(.*)\**\*\/$/

  // Map each line to its parsed form
  const parsedArray = lines.map((line) => {
    const trimmedLine = line.trim()

    // Check if the line is the start or end of a multi-line comment
    if (isStartOfComment.test(trimmedLine)) {
      const match = trimmedLine.match(isStartOfComment)
      return match?.length && match[1] ? ['/**', match[1].trim()] : ['/**']
    } else if (isEndOfComment.test(trimmedLine)) {
      const match = trimmedLine.match(isEndOfComment)
      if (!match?.length || match[1]) {
        return ['*/']
      }
      const content = trimAsterisks(match[1].trim())
      if (!content) return ['*/']
      return [content, '*/']
    } else {
      //  Target: Lines within a multi-line JSDoc comment ` * `
      //  Regex: /^(\s*\*\s?)(.*)$/
      //  - ^(\s*\*\s?) : Match the start of the line, optional leading whitespace, followed by an asterisk and an optional space ( * )
      //  - (.*) : Capture the rest of the line
      //  - $ : Match the end of the line
      const match = line.match(/^(\s*\*\s?)(.*)$/)
      if (match) {
        // If the line matches the pattern, return the parts as an array
        return [match[1], trimAsterisks(match[2])]
      } else {
        // Lines without asterisks should keep their leading whitespace intact
        return ['', trimAsterisks(line)]
      }
    }
  })

  return parsedArray
}

/**
 * Cleans a JSDoc comment by segmenting it into parts,
 * removing jsdoc markers from each line, and then joining them back together.
 *
 * Handles both single-line and multi-line JSDoc comments.
 *
 * @param comment - The JSDoc comment string to be cleaned.
 * @returns - The cleaned JSDoc comment.
 */
export function cleanComment(comment: string) {
  return segmentCommentForCleaning(comment)
    .map((lineParts, index, array) => {
      if (array.length > 1 && index === array.length - 1) {
        if (lineParts.length > 1) {
          return lineParts[0]
        }
        return undefined
      }
      return lineParts[1]
    })
    .filter((line, index, array) => {
      if (index === 0 || index === array.length - 1) {
        return line !== undefined
      }
      return true
    })
    .join('\n')
}
