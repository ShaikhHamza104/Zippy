import { test, expect } from '@playwright/test';

test.describe('Phase 11: End-to-End Customer Journey', () => {
  const timestamp = Date.now();
  const testEmail = `e2e_cust_${timestamp}@zippy.test`;
  const testPhone = '9' + Math.floor(100000000 + Math.random() * 900000000).toString();
  const testPassword = 'Password#2026';
  const customerName = 'Priya Sharma';

  test('Customer registers, sets pincode, adds item to cart, and checks out via COD', async ({
    page,
  }) => {
    // 1. Visit Homepage
    await page.goto('/');
    await expect(page).toHaveTitle(/Zippy/i);

    // 2. Open Pincode Modal & Verify Serviceability
    const locationBtn = page.locator('button[aria-label^="Delivery location"]');
    if (await locationBtn.isVisible()) {
      await locationBtn.click();
      await page.waitForSelector('text=Select Delivery Location');

      // Click popular hub "Bengaluru (560001)" or enter pincode
      const hubBtn = page.locator('button:has-text("Bengaluru (560001)")');
      if (await hubBtn.isVisible()) {
        await hubBtn.click();
      } else {
        await page.fill('#pincode-input', '560001');
        await page.click('button:has-text("Check & Apply")');
      }

      // Wait for success toast / modal close
      await expect(page.getByText(/Delivering to Bengaluru|560001/i)).toBeVisible({
        timeout: 10000,
      });
    }

    // 3. Register New Customer Account
    await page.goto('/register');
    await page.waitForSelector('#name');

    await page.fill('#name', customerName);
    await page.fill('#email', testEmail);
    await page.fill('#phone', testPhone);
    await page.fill('#password', testPassword);

    await page.click('button:has-text("Create Account")');

    // Should redirect to / and show user's name in Header
    await expect(page).toHaveURL(/\/(#.*)?$/);
    await expect(page.getByText(customerName).first()).toBeVisible({ timeout: 10000 });

    // 4. Browse Products & Add an Item to Cart
    await page.goto('/products');
    await page.waitForSelector('button:has-text("+ ADD")');

    const firstAddBtn = page.locator('button:has-text("+ ADD")').first();
    await expect(firstAddBtn).toBeVisible();
    await firstAddBtn.click();

    // Verify stepper appears with quantity '1'
    const stepper = page.getByRole('group', { name: 'Item quantity stepper' }).first();
    await expect(stepper).toBeVisible({ timeout: 5000 });
    await expect(stepper.getByText('1')).toBeVisible();

    // 5. Open Cart Drawer and Proceed to Checkout
    const cartBtn = page.getByRole('button', { name: /Shopping Cart/i });
    await cartBtn.click();

    // Cart Drawer opens
    await expect(page.getByRole('heading', { name: 'My Cart' })).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Bill Summary')).toBeVisible();

    const checkoutBtn = page.getByRole('button', { name: /Proceed to Checkout/i });
    await expect(checkoutBtn).toBeVisible();
    await checkoutBtn.click();

    // 6. Checkout Page: Address and COD
    await expect(page).toHaveURL(/\/checkout/);
    await page.waitForSelector('text=Review & Place Order');

    // Check if an address is already present or needs adding
    const addAddressBtn = page
      .getByRole('button', { name: /Add Delivery Address|Add New Address/i })
      .first();
    if (await addAddressBtn.isVisible()) {
      await addAddressBtn.click();
      await page.waitForSelector('#chk-addressLine1');

      await page.fill('#chk-fullName', customerName);
      await page.fill('#chk-phone', testPhone);
      await page.fill('#chk-addressLine1', 'Flat 402, Green Glen Layout, Outer Ring Road');
      await page.fill('#chk-city', 'Bengaluru');
      await page.fill('#chk-state', 'Karnataka');
      await page.fill('#chk-pincode', '560001');

      await page.click('button:has-text("Save & Use Address")');
      await page.waitForTimeout(1000);
    }

    // Ensure Cash on Delivery (COD) is chosen
    await page.locator('text=Cash on Delivery (COD)').click();

    // Place the order
    const placeOrderBtn = page.locator('button:has-text("Place Order")');
    await expect(placeOrderBtn).toBeEnabled();
    await placeOrderBtn.click();

    // 7. Order Confirmation & Tracking
    await expect(page).toHaveURL(/\/orders\/[a-f0-9-]+\/success/, { timeout: 15000 });
    await expect(page.getByText('Arriving in 10 Minutes!')).toBeVisible();
    await expect(page.getByText('Order Confirmed')).toBeVisible();

    // Click "Track Live Delivery"
    await page.click('a:has-text("Track Live Delivery")');

    // 8. Order Tracking Screen
    await expect(page).toHaveURL(/\/orders\/[a-f0-9-]+$/);
    await expect(page.getByText('Order Placed')).toBeVisible();
    await expect(page.getByText('Received at dark store')).toBeVisible();
  });
});
