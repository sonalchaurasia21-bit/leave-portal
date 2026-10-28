# CRCE Leave Portal — Selenium WebDriver Automated Tests

Automated end-to-end browser testing suite for the **CRCE Leave Management Portal** deployed at:
`https://leave-portal-zeta.vercel.app/?logout=1`

## Project Structure

```
selenium-tests/
├── test_leave_portal.py    # Main pytest test suite (2 test cases)
├── requirements.txt        # Python dependencies
├── README.md               # Test documentation and instructions
├── screenshots/            # Captured screenshots from test executions
│   ├── TC001_login_page_loaded.png
│   └── TC002_invalid_login_rejected.png
└── reports/                # Test execution reports
    ├── test_report.html    # Interactive HTML test report
    ├── test_report.json    # Machine-readable JSON test report
    └── test_report.txt     # Human-readable summary text report
```

---

## Test Cases

### Test Case 1 (TC-001): Website Availability & Login Page Validation
* **Objective**: Verify that the deployed web application loads successfully, presents the correct page title, displays the main heading (`Student Portal`) and subtitle (`CRCE Leave Management System`), contains the login form with both `email` and `password` input fields, and displays an enabled `Login` button.
* **Expected Result**: Page loads successfully with all login elements visible and enabled.
* **Artifact**: Screenshot saved at `screenshots/TC001_login_page_loaded.png`.

### Test Case 2 (TC-002): Login Validation with Invalid Credentials
* **Objective**: Submit intentionally invalid credentials (`invalid_test_user@nonexistent.com` / `WrongP@ssw0rd123!`) to verify that the application properly rejects unauthorized access, renders an appropriate error notification toast (`toast--error`), and ensures the user is **not** granted access or redirected to the protected dashboard.
* **Expected Result**: Invalid credentials rejected, error toast displayed, user remains safely on the login page.
* **Artifact**: Screenshot saved at `screenshots/TC002_invalid_login_rejected.png`.

---

## Prerequisites

1. **Python 3.10+** (Python 3.12 installed in workspace)
2. **Google Chrome** browser installed
3. **ChromeDriver** (automatically managed by `webdriver-manager`)

---

## Installation & Setup

1. Open PowerShell / Command Prompt and navigate to the `selenium-tests` directory:
   ```powershell
   cd C:\Users\vaidehi\Desktop\leave-portal\selenium-tests
   ```

2. Install dependencies:
   ```powershell
   pip install -r requirements.txt
   ```

---

## Execution

### Run in Visible Browser (Headed Mode):
Watch Google Chrome physically launch on your desktop, navigate, fill out the form, and execute the tests:
```powershell
$env:Path = "$env:LOCALAPPDATA\Programs\Python\Python312;$env:LOCALAPPDATA\Programs\Python\Python312\Scripts;$env:LOCALAPPDATA\Google\Chrome\Application;" + $env:Path
cd C:\Users\vaidehi\Desktop\leave-portal\selenium-tests
pytest test_leave_portal.py -v -s --html=reports/test_report.html --self-contained-html
```

### Run in Headless Mode (Background):
If you want to run without the browser window popping up:
```powershell
$env:HEADLESS = "true"
pytest test_leave_portal.py -v --html=reports/test_report.html --self-contained-html
```

---

## Test Results Summary

| Test Case ID | Test Case Description | Expected Result | Actual Result | Status |
| :--- | :--- | :--- | :--- | :---: |
| **TC-001** | Website Availability & Login Page Validation | Page loads, title contains "CRCE Leave Portal", heading is "Student Portal", email/password fields & Login button visible and enabled | Title verified, heading verified, form fields verified, button enabled | **PASS** |
| **TC-002** | Login Validation (Invalid Credentials) | Invalid credentials rejected, error toast displayed, access denied, user stays on login page | Rejected with error toast, access denied, user remained on login page | **PASS** |

### Reports Generated
* **HTML Report**: [reports/test_report.html](reports/test_report.html)
* **Text Report**: [reports/test_report.txt](reports/test_report.txt)
* **JSON Report**: [reports/test_report.json](reports/test_report.json)
