import { defineConfig } from 'vitest/config';

export default defineConfig({
  // percorsi relativi: la build funziona anche dentro una sottocartella,
  // come succede su GitHub Pages
  base: './',
  test: {
    include: ['tests/**/*.test.js'],
    coverage: {
      include: ['src/js/**/*.js'],
      // main.js collega solo i moduli tra loro, lo provo a mano nel browser
      exclude: ['src/js/main.js'],
    },
  },
});
