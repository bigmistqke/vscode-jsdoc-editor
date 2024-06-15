// Target: Single-line JSDoc comments
// Regex: /^\/\*\*+ ?(.*?) *\*+\/$/
// - ^\/\*\*+ : Match the start of a single-line JSDoc comment (/**)
// - ? : Match zero or one whitespace
// - (.*?) : Capture the content inside the JSDoc comment in a non-greedy way
// - * : Match zero or more trailing whitespace
// - \*+\/$ : Match one or more asterisks followed by the closing (*/)
const singleLineCommentRegex = /^\/\*\*+ ?(.*?) *\*+\/$/

// Target: Start of a multi-line JSDoc comment with zero or one whitespace after /**
// Regex: /^\/\*\* ?(.*)$/
// - ^\/\*\* : Match the start of a multi-line JSDoc comment (/**)
// - ? : Match zero or one whitespace
// - (.*) : Capture any content that follows, including additional leading whitespaces
// - $ : Match the end of the line
const startOfCommentRegex = /^\/\*\* ?(.*)$/

// Target: End of a multi-line JSDoc comment with zero or more whitespace characters before */
// Regex: /^(.*?)\s*\*+\/$/
// - ^(.*?) : Capture any content at the start of the line in a non-greedy way
// - \s* : Match zero or more whitespace characters
// - \*+\/$ : Match one or more asterisks followed by the closing (*/)
const endOfCommentRegex = /^(.*?)\s*\*+\/$/

// Target: Lines within a multi-line JSDoc comment ` * `
// Regex: /\s*\*+\s?(.*)$/
// - ^\s*\*+\s? : Match the start of the line, optional leading whitespace, followed by one or more asterisks and an optional space ( * )
// - (.*) : Capture the rest of the line
// - $ : Match the end of the line
const middleOfCommentRegex = /\s*\*+\s?(.*)$/

/**
 * Cleans a JSDoc comment by removing all of its jsdoc markers.
 * Handles both single-line and multi-line JSDoc comments.
 *
 * @param comment - The JSDoc comment string to be cleaned.
 * @returns - The cleaned JSDoc comment.
 */
export function cleanComment(comment: string) {
  // Split the input string into lines
  const lines = comment.split('\n')

  // Handle single-line comments
  if (lines.length === 1) {
    const singleLineMatch = comment.match(singleLineCommentRegex)
    // If a single-line comment is found, parse it and return
    if (singleLineMatch) {
      // Extract the content between /** and */
      return singleLineMatch[1]
    }
  }

  const result: string[] = []

  // Map each line to its parsed form
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Check if the line is the start or end of a multi-line comment
    if (startOfCommentRegex.test(line)) {
      const match = line.match(startOfCommentRegex)
      const trimmed = match?.length && match[1]
      if (trimmed) {
        result.push(trimmed)
      }
    } else if (endOfCommentRegex.test(line)) {
      const match = line.match(endOfCommentRegex)
      const trimmed = match?.length && match[1]
      if (trimmed) {
        result.push(trimmed)
      }
    } else {
      const match = line.match(middleOfCommentRegex)
      if (match) {
        // If the line matches the pattern, return the parts as an array
        result.push(match[1])
      } else {
        // Lines without asterisks should keep their leading whitespace intact
        result.push(line)
      }
    }
  }

  return result.join('\n')
}
