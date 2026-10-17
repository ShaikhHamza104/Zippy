import { expect, test } from '@playwright/test';

test.describe('Phase 14: Dark/Light Theme System & Layout Integrity Spec', () => {
  test('1. Theme toggle switches light -> dark -> light and persists across reload', async ({
    page,
  }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Ensure starting in light mode
    await page.evaluate(() => {
      localStorage.setItem('zippy_theme', 'light');
      document.documentElement.classList.remove('dark');
    });

    // 1. Initial State: Light mode
    const isDarkInitial = await page.evaluate(() =>
      document.documentElement.classList.contains('dark')
    );
    expect(isDarkInitial).toBe(false);

    // 2. Click Theme Toggle button in Header
    const themeBtn = page.locator('button[aria-label="Toggle dark mode"]').first();
    await expect(themeBtn).toBeVisible({ timeout: 10000 });
    await themeBtn.click();

    // 3. Verify dark class is applied to <html>
    await expect(page.locator('html')).toHaveClass(/dark/);
    const savedTheme = await page.evaluate(() => localStorage.getItem('zippy_theme'));
    expect(savedTheme).toBe('dark');

    // 4. Reload page to verify zero-FOUC persistence
    await page.reload();
    await page.waitForLoadState('networkidle');
    await expect(page.locator('html')).toHaveClass(/dark/);
    const persistedTheme = await page.evaluate(() => localStorage.getItem('zippy_theme'));
    expect(persistedTheme).toBe('dark');

    // 5. Toggle back to light mode
    const themeBtnDark = page.locator('button[aria-label="Toggle dark mode"]').first();
    await themeBtnDark.click();
    await expect(page.locator('html')).not.toHaveClass(/dark/);
    const lightTheme = await page.evaluate(() => localStorage.getItem('zippy_theme'));
    expect(lightTheme).toBe('light');
  });

  const viewports = [
    { name: 'Mobile (360x800)', width: 360, height: 800 },
    { name: 'Tablet (768x1024)', width: 768, height: 1024 },
    { name: 'Desktop (1440x900)', width: 1440, height: 900 },
  ];

  for (const vp of viewports) {
    test(`2. Zero horizontal overflow at ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });

      // Check Home Page
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      let noOverflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1;
      });
      expect(noOverflow).toBe(true);

      // Check Products Page
      await page.goto('/products');
      await page.waitForLoadState('networkidle');

      noOverflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1;
      });
      expect(noOverflow).toBe(true);

      // Check Login Page
      await page.goto('/login');
      await page.waitForLoadState('networkidle');

      noOverflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1;
      });
      expect(noOverflow).toBe(true);
    });
  }

  test('3. Pricing and stepper bounding boxes never collide or overlap at 360px viewport', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto('/products');
    await page.waitForLoadState('networkidle');

    // Find the first Add to Cart button and click it to display stepper
    const addBtn = page.locator('button:has-text("+ ADD")').first();
    await expect(addBtn).toBeVisible({ timeout: 10000 });
    await addBtn.click();

    // Wait for stepper to appear
    const stepper = page.getByRole('group', { name: 'Item quantity stepper' }).first();
    await expect(stepper).toBeVisible({ timeout: 5000 });

    // Locate pricing block adjacent to stepper inside the same ProductCard
    const card = page
      .locator('.product-card, div:has(button[aria-label="Increase quantity"])')
      .first();
    const priceText = card.locator('span:has-text("₹")').first();
    await expect(priceText).toBeVisible();

    // Calculate bounding boxes
    const priceBox = await priceText.boundingBox();
    const stepperBox = await stepper.boundingBox();

    expect(priceBox).not.toBeNull();
    expect(stepperBox).not.toBeNull();

    // Assert strictly non-colliding bounding boxes:
    // Elements do not overlap if rect1 is strictly to the left, right, top, or bottom of rect2
    const isToLeft = priceBox.x + priceBox.width <= stepperBox.x + 1;
    const isToRight = stepperBox.x + stepperBox.width <= priceBox.x + 1;
    const isAbove = priceBox.y + priceBox.height <= stepperBox.y + 1;
    const isBelow = stepperBox.y + stepperBox.height <= priceBox.y + 1;

    const noCollision = isToLeft || isToRight || isAbove || isBelow;
    expect(noCollision).toBe(true);
  });

  test('4. Admin layout theme toggle and table horizontal scrolling protection', async ({
    page,
  }) => {
    const adminEmail = 'admin@zippy.com';
    const adminPassword = process.env.SUPER_ADMIN_PASSWORD || 'root@123';

    // Log in as Super Admin
    await page.goto('/login');
    await page.fill('#email', adminEmail);
    await page.fill('#password', adminPassword);
    await page.click('button:has-text("Sign In to Zippy")');

    await expect(page).toHaveURL(/\/(#.*)?$/);

    // Navigate to Admin Dashboard via header button
    const adminLink = page.locator('a[aria-label="Admin Dashboard"], a:has-text("Admin")').first();
    await expect(adminLink).toBeVisible({ timeout: 10000 });
    await adminLink.click();
    await expect(page).toHaveURL(/\/admin/);

    // Toggle theme in Admin Layout
    const adminThemeBtn = page.locator('button[aria-label="Toggle dark mode"]').first();
    await expect(adminThemeBtn).toBeVisible({ timeout: 5000 });
    await adminThemeBtn.click();
    await expect(page.locator('html')).toHaveClass(/dark/);

    // Navigate to Admin Products
    await page.goto('/admin/products');
    await expect(page).toHaveURL(/\/admin\/products/);
    await page.waitForSelector('text=Product Catalog');

    // Verify Admin Tables have overflow-x-auto container
    const tableWrapper = page.locator('div.overflow-x-auto').first();
    await expect(tableWrapper).toBeVisible();

    // Check table responsiveness at 360px
    await page.setViewportSize({ width: 360, height: 800 });
    await page.waitForTimeout(400);
    const overflowInfo = await page.evaluate(() => {
      const scrollW = document.documentElement.scrollWidth;
      const clientW = document.documentElement.clientWidth;
      const overflowing = [];
      for (const el of document.querySelectorAll('*')) {
        const rect = el.getBoundingClientRect();
        if (rect.right > window.innerWidth + 1) {
          overflowing.push({
            tag: el.tagName,
            cls: typeof el.className === 'string' ? el.className.slice(0, 60) : '',
            right: Math.round(rect.right),
            width: Math.round(rect.width),
            id: el.id,
          });
        }
      }
      return { scrollW, clientW, overflowing: overflowing.slice(0, 5) };
    });
    if (overflowInfo.scrollW > overflowInfo.clientW + 1) {
      console.error('Overflow detected at 360px:', JSON.stringify(overflowInfo, null, 2));
    }
    expect(overflowInfo.scrollW <= overflowInfo.clientW + 1).toBe(true);
  });
});
