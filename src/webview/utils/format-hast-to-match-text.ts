import type { Literal, Node, Parent } from 'unist'
import { visit } from 'unist-util-visit'

// Define types for HAST nodes
interface ElementNode extends Parent {
  type: 'element'
  tagName: string
  properties: {
    [key: string]: any
  }
  children: Array<Node>
}

interface TextNode extends Literal {
  type: 'text'
  value: string
}

// Function to format the HAST tree to match the target text
export function formatHastToMatchText(tree: any, target: string): any {
  console.log('Formatting HAST tree to match text')

  // Collect all text nodes from the HAST tree
  const textNodes: { node: TextNode; parent: ElementNode }[] = []
  // Gather all text nodes
  visit(tree, 'text', (node: TextNode, index: number, parent: ElementNode) => {
    textNodes.push({ node, parent })
  })

  // Initialize the index for the target text
  let targetIndex = 0

  // Iterate over each text node
  for (const { node, parent } of textNodes) {
    // Initialize new content for the current text node
    let newTextContent = ''
    // Iterate over each character in the text node
    for (let i = 0; i < node.value.length; i++) {
      // If the end of the target text is reached, remove all next elements
      if (targetIndex >= target.length) {
        //parent.children.splice(parent.children.indexOf(node))
        continue
      }

      // Get the current character from the target text
      const targetChar = target[targetIndex]
      // Get the current character from the text node
      const textNodeChar = node.value[i]

      // If the characters match
      if (targetChar === textNodeChar) {
        // Append the character to the new content
        newTextContent += textNodeChar
        // Move to the next character in the target text
        targetIndex++
      }
    }
    console.log('newTextContent', newTextContent)
    // Update the text node with the new content
    node.value = newTextContent
  }

  console.log('tree', tree)

  return tree // Return the modified HAST tree
}
