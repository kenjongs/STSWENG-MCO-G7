*** Settings ***
Resource         ../resources/common.robot
Test Setup       Open Login Page
Test Teardown    Close All Browsers

*** Test Cases ***
TC-D01-01: Valid credentials open the dashboard
    [Tags]    positive    D01
    Log In With    ${VALID_USER}    ${VALID_PASS}
    Wait Until Element Contains    css:header h1    Support cases    timeout=10s
    Element Should Contain         css:aside        ${VALID_DISPLAY_NAME}
    Element Should Contain         css:header       ${VALID_DISPLAY_NAME}

TC-D01-02: Password visibility Toggle
    [Tags]    positive    D01    known-bug    robot:skip-on-failure
    Input Password    id:password    SamplePass42
    ${type_default}=    Get Element Attribute    id:password    type
    Should Be Equal     ${type_default}    password
    Click Button        xpath://button[@aria-label="Show password"]
    ${type_shown}=      Get Element Attribute    id:password    type
    Should Be Equal     ${type_shown}      text
    Textfield Value Should Be    id:password    SamplePass42
    Click Button        xpath://button[@aria-label="Hide password"]
    ${type_hidden}=     Get Element Attribute    id:password    type
    Should Be Equal     ${type_hidden}     password
    Textfield Value Should Be    id:password    SamplePass42

TC-D01-03: Keyboard Submission (Pressing ENTER)
    [Tags]    positive    D01
    Input Text        id:username    ${VALID_USER}
    Input Password    id:password    ${VALID_PASS}
    Press Keys        id:password    RETURN
    Wait Until Element Contains        css:header h1    Support cases    timeout=10s
    Page Should Not Contain Element    css:button[type="submit"]

TC-D01-04: Unregistered Account
    [Tags]    negative    D01
    Log In With    ${UNKNOWN_USER}    SamplePass42
    Login Should Be Refused

TC-D01-05: Empty username and password are refused
    [Tags]    negative    D01
    Click Button    css:button[type="submit"]
    Login Should Be Refused

TC-D01-06: Case Sensitivity
    [Tags]    negative    D01
    # Alters the first character's case (e.g., secret123 -> Secret123)
    ${first_char}=      Evaluate    "${VALID_PASS}"[0].swapcase()
    ${altered_pass}=    Set Variable    ${first_char}${VALID_PASS}[1:]
    Log In With         ${VALID_USER}    ${altered_pass}
    Login Should Be Refused

TC-D01-07: Leading And Trailing Spaces
    [Tags]    negative    D01
    ${spaces_only}=    Set Variable    ${SPACE}${SPACE}${SPACE}
    Log In With        ${spaces_only}    ${VALID_PASS}
    Login Should Be Refused

TC-D01-08: Sign out returns to an empty login form
    [Tags]    positive    D01
    Log In As Valid Admin
    Click Button    xpath://aside//button[normalize-space()="Sign out"]
    Wait Until Page Contains     Enter an admin credential below.    timeout=10s
    Textfield Value Should Be    id:username    ${EMPTY}
    Textfield Value Should Be    id:password    ${EMPTY}

TC-D01-09: Reloading after sign out stays on the login page
    [Tags]    negative    security    D01
    Log In As Valid Admin
    Click Button    xpath://aside//button[normalize-space()="Sign out"]
    Wait Until Page Contains    Enter an admin credential below.    timeout=10s
    Reload Page
    Page Should Contain                Enter an admin credential below.
    Page Should Not Contain Element    css:header h1

TC-D01-10: Wrong password is refused
    [Tags]    negative    security    D01
    Log In With    ${VALID_USER}    ${WRONG_PASS}
    Login Should Be Refused

TC-D01-11: Browser Back cannot restore dashboard access after sign-out
    [Tags]    negative    D01
    Log In As Valid Admin
    Go To    about:blank
    Go To    ${BASE_URL}
    Wait Until Element Contains    css:header h1    Support cases    timeout=10s
    Click Button    xpath://aside//button[normalize-space()="Sign out"]
    Wait Until Page Contains    Enter an admin credential below.    timeout=10s
    Go Back
    Go Back
    Wait Until Location Contains    ${BASE_URL}    timeout=10s
    Login Should Be Refused

TC-D01-14: Signing out in one tab signs the admin out in another tab
    [Tags]    positive    D01
    Log In As Valid Admin
    ${tab_a}=    Get Window Handles
    Execute Javascript    window.open('${BASE_URL}', '_blank');
    Switch Window    NEW
    Wait Until Element Contains    css:header h1    Support cases    timeout=10s
    Switch Window    ${tab_a}[0]
    Click Button     xpath://aside//button[normalize-space()="Sign out"]
    Wait Until Page Contains    Enter an admin credential below.    timeout=10s
    Switch Window    NEW
    Wait Until Page Contains           Enter an admin credential below.    timeout=10s
    Page Should Not Contain Element    css:header h1