import type { Page } from '@playwright/test';

/**
 * Sets the app's theme preference before navigation, via the same localStorage key
 * useThemeManager() reads in src/app/layout.tsx. Uses page.addInitScript so the value is in
 * place before any app JS runs -- clicking the theme toggle button instead would work too,
 * but couples every dark-mode assertion to that button's selector staying stable.
 *
 * Call before page.goto(...), not after.
 */
export async function setTheme(page: Page, theme: 'light' | 'dark'): Promise<void> {
  await page.addInitScript((value) => {
    window.localStorage.setItem('theme-preference', value);
  }, theme);
}
