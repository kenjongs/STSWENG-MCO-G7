*** Settings ***
Library    SeleniumLibrary

*** Variables ***
${BASE_URL}        http://localhost:5173
${BROWSER}         Chrome
${VALID_USER}      jarvis_wuckert
${VALID_DISPLAY_NAME}   Jarvis Wuckert
${VALID_PASS}      jarvisWUCKERT.support
${WRONG_PASS}      wrongpass999
${UNKNOWN_USER}    qa.unregistered.021

*** Keywords ***
Open Login Page
    Open Browser    ${BASE_URL}    ${BROWSER}
    Set Window Size    1280    900
    Wait Until Element Is Visible    css:button[type="submit"]    timeout=10s

Log In With
    [Arguments]    ${username}    ${password}
    Input Text        id:username    ${username}
    Input Password    id:password    ${password}
    Click Button      css:button[type="submit"]

Log In As Valid Admin
    Log In With    ${VALID_USER}    ${VALID_PASS}
    Wait Until Element Contains    css:header h1    Support cases    timeout=10s

Login Should Be Refused
    Page Should Contain                Sign in
    Page Should Contain                Enter an admin credential below.
    Page Should Not Contain Element    css:header h1