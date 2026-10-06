// Parent types that bind stronger than "===", so the replacement itself needs parentheses
const PARENT_TYPES_NEEDING_PARENTHESES = [
  'AwaitExpression',
  'BinaryExpression',
  'MemberExpression',
  'TaggedTemplateExpression',
  'UnaryExpression',
]

/**
 * Check whether the "=== false" replacement must be wrapped in parentheses for its parent.
 *
 * @param {Object} node The reported UnaryExpression node.
 *
 * @private
 */
function needsOuterParentheses(node) {
  const parent = node.parent

  if (PARENT_TYPES_NEEDING_PARENTHESES.includes(parent.type)) {
    return true
  }

  return (
    (parent.type === 'CallExpression' || parent.type === 'NewExpression') && parent.callee === node
  )
}

export default {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Disallow the "!" negation operator in favor of explicit comparisons such as "=== false"',
    },
    hasSuggestions: true,
    messages: {
      useExplicitFalse: 'Use "=== false" instead of the "!" operator.',
      suggestExplicitFalse: 'Replace with an explicit "=== false" comparison.',
    },
    schema: [],
  },
  create(context) {
    return {
      UnaryExpression(node) {
        if (node.operator !== '!') {
          return
        }

        // Only report from the outermost "!" of a chain, so a chain yields a single report
        if (node.parent.type === 'UnaryExpression' && node.parent.operator === '!') {
          return
        }

        // Skip exactly "!!" (a chain of two), often used deliberately as a boolean cast
        let chainLength = 1
        let innermost = node.argument
        while (innermost.type === 'UnaryExpression' && innermost.operator === '!') {
          chainLength++
          innermost = innermost.argument
        }
        if (chainLength === 2) {
          return
        }

        context.report({
          node,
          messageId: 'useExplicitFalse',
          suggest: [
            {
              messageId: 'suggestExplicitFalse',
              fix(fixer) {
                // Slice the original source after "!", so comments and source parentheses survive.
                // Anything binding weaker than "!" can only be its argument when parenthesized,
                // so the source text already carries the parentheses "===" needs.
                const operatorToken = context.sourceCode.getFirstToken(node)
                const argumentText = context.sourceCode.text
                  .slice(operatorToken.range[1], node.range[1])
                  .trim()

                const replacement = `${argumentText} === false`

                return fixer.replaceText(
                  node,
                  needsOuterParentheses(node) ? `(${replacement})` : replacement,
                )
              },
            },
          ],
        })
      },
    }
  },
}
