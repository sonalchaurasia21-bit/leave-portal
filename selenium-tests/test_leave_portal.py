"""
CRCE Leave Portal — Selenium WebDriver Test Suite
===================================================
Two automated test cases executed against the deployed website:
  https://leave-portal-zeta.vercel.app/?logout=1

Test Case 1: Website Availability and Login Page Validation
Test Case 2: Login Validation with Invalid Credentials
"""

import os
import time
import json
from datetime import datetime

import pytest
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager


# ─── Configuration ───────────────────────────────────────────────
BASE_URL = "https://leave-portal-zeta.vercel.app/?logout=1"
LOGIN_URL = "https://leave-portal-zeta.vercel.app/?logout=1"
SCREENSHOTS_DIR = os.path.join(os.path.dirname(__file__), "screenshots")
REPORTS_DIR = os.path.join(os.path.dirname(__file__), "reports")
WAIT_TIMEOUT = 15  # seconds for explicit waits

# Headless mode can be enabled with $env:HEADLESS="true", otherwise defaults to visible browser
HEADLESS = os.environ.get("HEADLESS", "false").lower() in ("true", "1", "yes")

# Ensure output directories exist
os.makedirs(SCREENSHOTS_DIR, exist_ok=True)
os.makedirs(REPORTS_DIR, exist_ok=True)

# Collect test results for the final report
test_results = []


# ─── Fixtures ────────────────────────────────────────────────────
@pytest.fixture(scope="module")
def driver():
    """Create and configure Chrome WebDriver (visible by default, headless if requested)."""
    chrome_options = Options()
    if HEADLESS:
        chrome_options.add_argument("--headless=new")
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    chrome_options.add_argument("--disable-gpu")
    chrome_options.add_argument("--start-maximized")
    chrome_options.add_argument("--disable-extensions")
    chrome_options.add_argument("--disable-popup-blocking")

    # Use webdriver-manager to auto-detect correct ChromeDriver
    service = Service(ChromeDriverManager().install())
    driver = webdriver.Chrome(service=service, options=chrome_options)
    driver.implicitly_wait(5)

    yield driver

    # Give a brief moment before closing so the final state is visible
    time.sleep(1)
    driver.quit()

    # Write test report after all tests finish
    _write_report()


def _save_screenshot(driver, name):
    """Save a screenshot with the given name."""
    filepath = os.path.join(SCREENSHOTS_DIR, f"{name}.png")
    driver.save_screenshot(filepath)
    print(f"  [+] Screenshot saved: {filepath}")
    return filepath


def _record_result(tc_id, description, expected, actual, status, failure_reason=""):
    """Record a test result for the final report."""
    test_results.append({
        "test_case_id": tc_id,
        "description": description,
        "expected_result": expected,
        "actual_result": actual,
        "status": status,
        "failure_reason": failure_reason,
        "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
    })


def _write_report():
    """Write the collected test results to JSON, HTML, and text reports."""
    json_path = os.path.join(REPORTS_DIR, "test_report.json")
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(test_results, f, indent=2)

    txt_path = os.path.join(REPORTS_DIR, "test_report.txt")
    with open(txt_path, "w", encoding="utf-8") as f:
        f.write("=" * 75 + "\n")
        f.write("  CRCE Leave Portal — Selenium WebDriver Automated Test Report\n")
        f.write(f"  Target Website : {LOGIN_URL}\n")
        f.write(f"  Browser        : Google Chrome\n")
        f.write(f"  Generated      : {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
        f.write("=" * 75 + "\n\n")
        for r in test_results:
            f.write(f"Test Case ID   : {r['test_case_id']}\n")
            f.write(f"Description    : {r['description']}\n")
            f.write(f"Expected       : {r['expected_result']}\n")
            f.write(f"Actual         : {r['actual_result']}\n")
            f.write(f"Status         : {r['status']}\n")
            if r["failure_reason"]:
                f.write(f"Failure Reason : {r['failure_reason']}\n")
            f.write(f"Timestamp      : {r['timestamp']}\n")
            f.write("-" * 75 + "\n\n")

    print(f"\n  [+] Reports generated:\n      {json_path}\n      {txt_path}")


# ─── TEST CASE 1 ─────────────────────────────────────────────────
class TestCase1:
    """TC-001: Website Availability and Login Page Validation"""

    def test_website_availability_and_login_page(self, driver):
        """
        TC-001: Verify the website loads, displays the correct title/heading,
        has a login form with email & password fields, and a visible Login button.
        """
        tc_id = "TC-001"
        description = "Website Availability and Login Page Validation"
        expected = (
            "Page loads successfully; title contains 'CRCE Leave Portal'; "
            "heading 'Student Portal' is visible; login form with email field, "
            "password field, and enabled Login button is present and usable."
        )

        try:
            print(f"\n--> Running {tc_id}: {description}")
            # 1. Open the website URL
            driver.get(LOGIN_URL)
            time.sleep(1)

            # 2. Wait for the login form to be present
            wait = WebDriverWait(driver, WAIT_TIMEOUT)
            login_form = wait.until(
                EC.presence_of_element_located((By.ID, "login-form"))
            )

            # 3. Verify the page title
            assert "CRCE Leave Portal" in driver.title, (
                f"Expected title to contain 'CRCE Leave Portal', got: '{driver.title}'"
            )

            # 4. Verify the main heading — "Student Portal"
            heading = wait.until(
                EC.visibility_of_element_located(
                    (By.CSS_SELECTOR, ".login-card__brand h1")
                )
            )
            assert heading.text.strip() == "Student Portal", (
                f"Expected heading 'Student Portal', got: '{heading.text.strip()}'"
            )

            # 5. Verify the subtitle
            subtitle = driver.find_element(
                By.CSS_SELECTOR, ".login-card__brand p"
            )
            assert "Leave Management System" in subtitle.text, (
                f"Expected subtitle to mention 'Leave Management System', "
                f"got: '{subtitle.text.strip()}'"
            )

            # 6. Verify email input field exists and is visible
            email_input = driver.find_element(By.ID, "login-email")
            assert email_input.is_displayed(), "Email input is not visible"
            assert email_input.get_attribute("type") == "email", (
                "Email input type is not 'email'"
            )

            # 7. Verify password input field exists and is visible
            password_input = driver.find_element(By.ID, "login-password")
            assert password_input.is_displayed(), "Password input is not visible"
            assert password_input.get_attribute("type") == "password", (
                "Password input type is not 'password'"
            )

            # 8. Verify Login button is visible and enabled
            login_btn = driver.find_element(By.ID, "login-btn")
            assert login_btn.is_displayed(), "Login button is not visible"
            assert login_btn.is_enabled(), "Login button is not enabled"
            assert "Login" in login_btn.text, (
                f"Login button text does not contain 'Login', got: '{login_btn.text}'"
            )

            time.sleep(1)
            # 9. Capture screenshot of the verified login page
            _save_screenshot(driver, "TC001_login_page_loaded")

            # All assertions passed
            actual = (
                f"Page loaded successfully. Title: '{driver.title}'. "
                f"Heading: '{heading.text.strip()}'. "
                f"Email input, password input, and enabled Login button confirmed present."
            )
            _record_result(tc_id, description, expected, actual, "PASS")
            print(f"    Status: PASS")

        except Exception as e:
            _save_screenshot(driver, "TC001_FAILED")
            actual = f"FAILED: {str(e)}"
            _record_result(tc_id, description, expected, actual, "FAIL", str(e))
            print(f"    Status: FAIL ({e})")
            raise


# ─── TEST CASE 2 ─────────────────────────────────────────────────
class TestCase2:
    """TC-002: Login Validation with Invalid Credentials"""

    def test_login_with_invalid_credentials(self, driver):
        """
        TC-002: Submit intentionally invalid credentials and verify the
        application rejects them with an appropriate error message, without
        granting access.
        """
        tc_id = "TC-002"
        description = "Login Validation with Invalid Credentials"
        expected = (
            "Invalid credentials are submitted; the application rejects them; "
            "an error toast message is displayed; user is NOT granted access "
            "and remains on the login page."
        )

        try:
            print(f"\n--> Running {tc_id}: {description}")
            # 1. Navigate to login page
            driver.get(LOGIN_URL)
            wait = WebDriverWait(driver, WAIT_TIMEOUT)
            wait.until(EC.presence_of_element_located((By.ID, "login-form")))
            time.sleep(1)

            # 2. Enter intentionally invalid email
            email_input = wait.until(
                EC.element_to_be_clickable((By.ID, "login-email"))
            )
            email_input.clear()
            email_input.send_keys("invalid_test_user@nonexistent.com")
            time.sleep(0.5)

            # 3. Enter intentionally invalid password
            password_input = wait.until(
                EC.element_to_be_clickable((By.ID, "login-password"))
            )
            password_input.clear()
            password_input.send_keys("WrongP@ssw0rd123!")
            time.sleep(0.5)

            # 4. Click the Login button
            login_btn = driver.find_element(By.ID, "login-btn")
            login_btn.click()

            # 5. Wait for the error toast notification to appear
            toast = wait.until(
                EC.visibility_of_element_located((By.CSS_SELECTOR, ".toast--visible"))
            )
            toast_msg_el = driver.find_element(By.CSS_SELECTOR, ".toast__msg")
            toast_msg = toast_msg_el.text.strip()

            # 6. Verify toast has the error styling and a non-empty message
            toast_el = driver.find_element(By.ID, "toast")
            toast_classes = toast_el.get_attribute("class")
            assert "toast--error" in toast_classes, (
                f"Expected error toast style (toast--error), got: '{toast_classes}'"
            )
            assert len(toast_msg) > 0, "Error toast message is empty"

            # 7. Verify user is still on the login page (not redirected to dashboard)
            current_url = driver.current_url
            assert "dashboard" not in current_url.lower(), (
                f"User was redirected to dashboard despite invalid credentials! URL: {current_url}"
            )

            # 8. Verify the login form is still displayed
            login_form = driver.find_element(By.ID, "login-form")
            assert login_form.is_displayed(), (
                "Login form is no longer visible — user may have been incorrectly logged in"
            )

            time.sleep(1)
            # 9. Capture screenshot showing the rejection and error toast
            _save_screenshot(driver, "TC002_invalid_login_rejected")

            # All assertions passed
            actual = (
                f"Invalid credentials rejected. Error toast displayed: '{toast_msg}'. "
                f"Access denied, user remains on login page (URL: '{current_url}')."
            )
            _record_result(tc_id, description, expected, actual, "PASS")
            print(f"    Status: PASS")

        except Exception as e:
            _save_screenshot(driver, "TC002_FAILED")
            actual = f"FAILED: {str(e)}"
            _record_result(tc_id, description, expected, actual, "FAIL", str(e))
            print(f"    Status: FAIL ({e})")
            raise
