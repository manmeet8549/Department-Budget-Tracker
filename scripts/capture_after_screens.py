import os
import sys
import time
from playwright.sync_api import sync_playwright

BASE_URL = "http://localhost:5173"
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.dirname(SCRIPT_DIR)
OUT_DIR = os.path.join(REPO_ROOT, "docs", "ui-screens", "after")
os.makedirs(OUT_DIR, exist_ok=True)

VIEWPORTS = [
    (1280, 800, "1280"),
    (768, 1024, "768"),
    (360, 800, "360")
]

def capture_screens():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)

        for width, height, tag in VIEWPORTS:
            print(f"\n--- Capturing viewport: {tag} ({width}x{height}) ---")
            context = browser.new_context(viewport={"width": width, "height": height})
            page = context.new_page()

            # 1. Login page
            print(f"Capturing login ({tag})...")
            page.goto(f"{BASE_URL}/login")
            page.wait_for_selector("#email", timeout=15000)
            time.sleep(1)
            page.screenshot(path=os.path.join(OUT_DIR, f"login-{tag}.png"), full_page=True)

            # Log in as Super Admin
            print("Logging in as Super Admin...")
            page.fill("#email", "superadmin@college.edu")
            page.fill("#password", "Password@123")
            page.click("button[type='submit']")
            page.wait_for_url(f"{BASE_URL}/", timeout=15000)
            time.sleep(2)

            # 2. Overview
            print(f"Capturing overview ({tag})...")
            page.goto(f"{BASE_URL}/")
            page.wait_for_selector("h1", timeout=15000)
            # Give dashboard data a moment to fetch
            time.sleep(2)
            page.screenshot(path=os.path.join(OUT_DIR, f"overview-{tag}.png"), full_page=True)

            # 3. Financial Years
            print(f"Capturing financial-years ({tag})...")
            page.goto(f"{BASE_URL}/financial-years")
            page.wait_for_selector("table", timeout=15000)
            time.sleep(1.5)
            page.screenshot(path=os.path.join(OUT_DIR, f"financial-years-{tag}.png"), full_page=True)

            # 4. Modal (Add Financial Year modal on Financial Years page)
            print(f"Capturing modal ({tag})...")
            try:
                page.click("#btn-add-fy")
                page.wait_for_selector("[role='dialog']", timeout=10000)
                time.sleep(1)
                page.screenshot(path=os.path.join(OUT_DIR, f"modal-{tag}.png"), full_page=True)
                page.keyboard.press("Escape")
                time.sleep(0.5)
            except Exception as e:
                print(f"Warning capturing modal: {e}")

            # 5. Departments
            print(f"Capturing departments ({tag})...")
            page.goto(f"{BASE_URL}/departments")
            page.wait_for_selector("table", timeout=15000)
            time.sleep(1.5)
            page.screenshot(path=os.path.join(OUT_DIR, f"departments-{tag}.png"), full_page=True)

            # 6. Budgets
            print(f"Capturing budgets ({tag})...")
            page.goto(f"{BASE_URL}/budgets")
            page.wait_for_selector("table", timeout=15000)
            time.sleep(1.5)
            page.screenshot(path=os.path.join(OUT_DIR, f"budgets-{tag}.png"), full_page=True)

            # 7. Expenses
            print(f"Capturing expenses ({tag})...")
            page.goto(f"{BASE_URL}/expenses")
            page.wait_for_selector("table", timeout=15000)
            time.sleep(1.5)
            page.screenshot(path=os.path.join(OUT_DIR, f"expenses-{tag}.png"), full_page=True)

            context.close()

        browser.close()
        print(f"\n[OK] All after screenshots successfully captured and saved to {OUT_DIR}!")

if __name__ == "__main__":
    capture_screens()
