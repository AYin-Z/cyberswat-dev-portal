import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import pluginVue from 'eslint-plugin-vue'

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '**/.pnpm/**',
      'deploy/**',
      '**/*.tsbuildinfo',
      '**/*.map',
      'pnpm-lock.yaml',
    ],
  },
  js.configs.recommended,
  // TypeScript 规则（先应用，保证对 .ts 正确解析）
  ...tseslint.configs.recommended,
  // Vue3（flat/essential：只保留正确性规则，格式化交给 prettier，避免与 vue 风格规则冲突）
  ...pluginVue.configs['flat/essential'],
  {
    files: ['**/*.vue'],
    languageOptions: {
      parserOptions: { parser: tseslint.parser },
    },
  },
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      // 禁空 catch：至少应注释或抛错（非必须但推荐）
      'no-empty': ['error', { allowEmptyCatch: false }],
      // TS/vue 编译期已覆盖未定义标识符，关闭避免误报
      'no-undef': 'off',
      // 与 tsc 的 noUnusedLocals/noUnusedParameters 对齐：_ 前缀视为有意忽略
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
      'vue/multi-word-component-names': 'off',
      'vue/no-v-html': 'off',
    },
  },
)
