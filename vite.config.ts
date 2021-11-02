import { defineConfig } from 'vite'

export default defineConfig(({ command, mode }) => {
  if (command === 'serve') {
    return {
      base: '/',
    }
  } else {
    return {
      base: './',
    }
  }
})