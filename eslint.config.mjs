import noNegationOperator from './eslint/rules/no-negation-operator.js'
import eslint from '@eslint/js'
import stylistic from '@stylistic/eslint-plugin'
import prettier from 'eslint-config-prettier'
import tseslint from 'typescript-eslint'

// Prettier owns formatting; ESLint only carries the semantic rules. Stylistic is loaded for the
// one layout rule Prettier cannot express (a blank line before every return).
export default tseslint.config(
  { ignores: ['dist/**', 'coverage/**', 'test/fixtures/**', '.remember/**', '.superpowers/**'] },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,
  {
    plugins: {
      '@stylistic': stylistic,
      'istanbun': {
        rules: {
          'no-negation-operator': noNegationOperator,
        },
      },
    },
    rules: {
      'no-undef': 'off',
      'no-useless-assignment': 'warn',
      'no-else-return': 'error',
      'curly': ['error', 'all'],
      '@stylistic/padding-line-between-statements': [
        'error',
        { blankLine: 'always', prev: '*', next: 'return' },
      ],
      'istanbun/no-negation-operator': 'error',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unsafe-function-type': 'warn',
      '@typescript-eslint/no-empty-object-type': 'warn',
      '@typescript-eslint/no-namespace': 'off',
      '@typescript-eslint/no-unused-vars': 'warn',
      '@typescript-eslint/explicit-function-return-type': 'warn',
      '@typescript-eslint/explicit-member-accessibility': 'warn',
      '@typescript-eslint/typedef': [
        'error',
        {
          arrayDestructuring: true,
          arrowParameter: true,
          memberVariableDeclaration: true,
          objectDestructuring: true,
          parameter: true,
          propertyDeclaration: true,
          variableDeclaration: true,
          variableDeclarationIgnoreFunction: false,
        },
      ],
    },
  },
  {
    files: ['eslint/**/*.js'],
    rules: {
      '@typescript-eslint/typedef': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
    },
  },
)
