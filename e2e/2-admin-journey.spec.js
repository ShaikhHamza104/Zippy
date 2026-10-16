import { test, expect } from '@playwright/test';

test.describe('Phase 11: End-to-End Admin Journey', () => {
  const adminEmail = 'admin@zippy.com';
  const adminPassword = process.env.SUPER_ADMIN_PASSWORD || 'root@123';
  const productName = `E2E Organic Alphonso Mangoes ${Date.now()}`;

  test('Super Admin logs in, creates a product, and updates customer order to Delivered', async ({
    page,
  }) => {
    // 1. Admin Login
    await page.goto('/login');
    await page.waitForSelector('#email');

    await page.fill('#email', adminEmail);
    await page.fill('#password', adminPassword);
    await page.click('button:has-text("Sign In to Zippy")');

    // Wait for authentication and redirect
    await expect(page).toHaveURL(/\/(#.*)?$/);
    await expect(
      page.locator('a[aria-label="Admin Dashboard"], a:has-text("Admin")').first()
    ).toBeVisible({ timeout: 10000 });

    // 2. Navigate to Admin Products Management via Header & Sidebar
    const adminLink = page.locator('a[aria-label="Admin Dashboard"], a:has-text("Admin")').first();
    await adminLink.click();
    await expect(page).toHaveURL(/\/admin/);

    await page
      .locator('aside nav a[href="/admin/products"], aside nav a:has-text("Products")')
      .first()
      .click();
    await expect(page).toHaveURL(/\/admin\/products/);
    await page.waitForSelector('text=Product Catalog & Inventory');

    // 3. Open Create Product Modal
    await page.click('button:has-text("Add Product")');
    await page.waitForSelector('text=Create New Product');

    // Fill Product Information
    await page.fill('input[placeholder="e.g. Amul Taaza Fresh Toned Milk"]', productName);

    // Select first category option
    const categorySelect = page.locator('select').first();
    const firstCatVal = await categorySelect
      .locator('option:not([disabled])')
      .first()
      .getAttribute('value');
    if (firstCatVal) {
      await categorySelect.selectOption(firstCatVal);
    }

    await page.fill('input[placeholder="e.g. Amul"]', 'Zippy Orchards');
    await page.fill(
      'textarea[placeholder="Detailed nutritional info, storage instructions, and quality details..."]',
      'Fresh naturally ripened premium export quality mangoes directly from certified farms.'
    );

    // Fill Image URL
    await page.fill(
      'input[placeholder="https://... image URL"]',
      'https://images.unsplash.com/photo-1553279768-865429fa0078?w=500'
    );

    // Fill Variant Details
    await page.fill(
      'input[placeholder="MILK-500ML"]',
      `E2E-MANGO-${Date.now().toString().slice(-4)}`
    );
    await page.fill('input[placeholder="500 ml"]', '1 kg');
    await page.fill('input[placeholder="28"]', '499');
    await page.fill('input[placeholder="30"]', '599');
    await page.fill('input[placeholder="50"]', '100');

    // Submit Create Product Form
    await page.click('button:has-text("Create Product")');

    // Wait for success toast / modal closure
    await expect(page.getByText(/Product Created/i)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(productName)).toBeVisible({ timeout: 10000 });

    // 4. Navigate to Admin Orders Management via Sidebar
    await page
      .locator('aside nav a[href="/admin/orders"], aside nav a:has-text("Orders")')
      .first()
      .click();
    await expect(page).toHaveURL(/\/admin\/orders/);
    await page.waitForSelector('text=Order Fulfillment & Logistics');

    // Locate the first order row
    const firstRow = page.locator('table tbody tr').first();
    await expect(firstRow).toBeVisible({ timeout: 10000 });

    // Step A: Transition to PACKED
    const updateBtn = firstRow.locator('button:has-text("Update")');
    if (await updateBtn.isVisible()) {
      await updateBtn.click();
      await page.waitForSelector('text=Update Order #');

      // Select PACKED
      await page.locator('select').selectOption('PACKED');
      await page.click('button:has-text("Confirm Transition")');
      await expect(page.getByText(/transitioned to PACKED/i)).toBeVisible({ timeout: 10000 });

      // Step B: Transition to OUT_FOR_DELIVERY
      await page.waitForTimeout(1000);
      const updateBtn2 = page
        .locator('table tbody tr')
        .first()
        .locator('button:has-text("Update")');
      if (await updateBtn2.isVisible()) {
        await updateBtn2.click();
        await page.waitForSelector('text=Update Order #');
        await page.locator('select').selectOption('OUT_FOR_DELIVERY');
        await page.click('button:has-text("Confirm Transition")');
        await expect(page.getByText(/transitioned to OUT_FOR_DELIVERY/i)).toBeVisible({
          timeout: 10000,
        });
      }

      // Step C: Transition to DELIVERED
      await page.waitForTimeout(1000);
      const updateBtn3 = page
        .locator('table tbody tr')
        .first()
        .locator('button:has-text("Update")');
      if (await updateBtn3.isVisible()) {
        await updateBtn3.click();
        await page.waitForSelector('text=Update Order #');
        await page.locator('select').selectOption('DELIVERED');
        await page.click('button:has-text("Confirm Transition")');
        await expect(page.getByText(/transitioned to DELIVERED/i)).toBeVisible({ timeout: 10000 });
      }

      // Verify the status badge is now "Delivered"
      await expect(page.locator('table tbody tr').first().getByText('Delivered')).toBeVisible({
        timeout: 10000,
      });
    }
  });
});
