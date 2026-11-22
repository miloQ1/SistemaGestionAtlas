// Configuración de Playwright para las pruebas E2E de Atlas
const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  workers: 1, // en serie: comparten la misma base de datos
  reporter: [['list'], ['html', { outputFolder: 'reports/playwright', open: 'never' }], ['json', { outputFile: 'reports/playwright.json' }]],
  use: {
    baseURL: process.env.FRONT_URL || 'http://localhost:3000',
    channel: process.env.PW_CHANNEL || undefined, // 'chrome' para usar el Chrome instalado
    headless: true,
    screenshot: 'on',
    trace: 'retain-on-failure',
    viewport: { width: 1280, height: 800 },
  },
  outputDir: 'reports/playwright-artifacts',
});
