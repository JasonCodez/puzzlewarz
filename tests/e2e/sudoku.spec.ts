import { test, expect } from '@playwright/test';

test('sudoku completed elapsed time appears on puzzles list', async ({ page }) => {
  // Visit puzzles list
  await page.goto('/puzzles');

  // Find first puzzle link
  const firstLink = await page.locator('a[href^="/puzzles/"]').first();
  const href = await firstLink.getAttribute('href');
  test.expect(href).toBeTruthy();

  const match = href!.match(/\/puzzles\/(.+)$/);
  test.expect(match).not.toBeNull();
  const puzzleId = match![1];

  // Set localStorage completed key for that puzzle id
  await page.evaluate(({ id }) => {
    try {
      localStorage.setItem(`sudoku-completed:${id}`, JSON.stringify({ ts: Date.now(), elapsedSeconds: 77 }));
    } catch (e) {
      // ignore
    }
  }, { id: puzzleId });

  // Reload and assert the completed time appears
  await page.reload();

  // Look for mm:ss string '01:17' or the label 'Completed in'
  await expect(page.locator('text=Completed in')).toBeVisible();
  await expect(page.locator('text=01:17')).toBeVisible();
});
