import asyncio
import os
from playwright.async_api import async_playwright

async def capture():
    output_dir = os.path.join(os.path.dirname(__file__), "..", "docs", "design-reference")
    os.makedirs(output_dir, exist_ok=True)

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)

        for width in [1280]:
            context = await browser.new_context(viewport={"width": width, "height": 800})
            page = await context.new_page()

            print("Capturing Login page...")
            await page.goto("http://localhost:5173/login", wait_until="networkidle")
            await page.wait_for_timeout(500)
            await page.screenshot(path=os.path.join(output_dir, "current-login.png"), full_page=True)

            print("Logging in as Super Admin...")
            admin_chip = page.locator("button:has-text('Admin')")
            if await admin_chip.count() > 0:
                await admin_chip.first.click()
            else:
                await page.fill('input#email', 'admin@college.edu')
                await page.fill('input#password', 'Password@123')

            await page.click('button[type="submit"]')
            await page.wait_for_timeout(1500)

            print(f"Current URL: {page.url}")

            print("Capturing Overview page...")
            await page.goto("http://localhost:5173/", wait_until="networkidle")
            await page.wait_for_timeout(1000)
            await page.screenshot(path=os.path.join(output_dir, "current-overview.png"), full_page=True)

            print("Capturing Financial Years page...")
            await page.goto("http://localhost:5173/financial-years", wait_until="networkidle")
            await page.wait_for_timeout(1000)
            await page.screenshot(path=os.path.join(output_dir, "current-financial-years.png"), full_page=True)

            print("Capturing Departments page...")
            await page.goto("http://localhost:5173/departments", wait_until="networkidle")
            await page.wait_for_timeout(1000)
            await page.screenshot(path=os.path.join(output_dir, "current-departments.png"), full_page=True)

            print("Capturing Budgets page...")
            await page.goto("http://localhost:5173/budgets", wait_until="networkidle")
            await page.wait_for_timeout(1000)
            await page.screenshot(path=os.path.join(output_dir, "current-budgets.png"), full_page=True)

            ceiling_btn = page.locator("button:has-text('Set Ceiling')")
            if await ceiling_btn.count() > 0:
                await ceiling_btn.first.click()
                await page.wait_for_timeout(500)
                print("Capturing Modal on Budgets page...")
                await page.screenshot(path=os.path.join(output_dir, "current-modal.png"), full_page=True)
                close_btn = page.locator("button:has-text('Cancel')")
                if await close_btn.count() > 0:
                    await close_btn.first.click()
                    await page.wait_for_timeout(300)

            print("Capturing Expenses page...")
            await page.goto("http://localhost:5173/expenses", wait_until="networkidle")
            await page.wait_for_timeout(1000)
            await page.screenshot(path=os.path.join(output_dir, "current-expenses.png"), full_page=True)

            await context.close()

        await browser.close()
        print("Done capturing current screenshots!")

if __name__ == "__main__":
    asyncio.run(capture())
