# Page snapshot

```yaml
- generic [ref=e4]:
  - generic [ref=e5]:
    - img "FinAlly logo" [ref=e6]
    - generic [ref=e7]:
      - heading "FinAlly" [level=1] [ref=e8]
      - paragraph [ref=e9]: Her Financial Ally
  - generic [ref=e10]:
    - progressbar "Step 1 of 2" [ref=e11]
    - heading "Create your account" [level=2] [ref=e14]
    - paragraph [ref=e15]: Start your financial wellness journey 🌸
    - generic [ref=e16]:
      - generic [ref=e17]:
        - generic [ref=e18]: Email
        - textbox "you@example.com" [ref=e19]: testuser_1774438310009@playwright.com
      - generic [ref=e20]:
        - generic [ref=e21]: Password
        - generic [ref=e22]:
          - textbox "Min 8 chars, upper, lower, number, special" [ref=e23]
          - button [ref=e24] [cursor=pointer]:
            - img [ref=e25]
      - generic [ref=e28]:
        - generic [ref=e29]: Confirm Password
        - textbox "Re-enter your password" [active] [ref=e30]: TestPassword123!
      - button "Next" [ref=e31] [cursor=pointer]:
        - text: Next
        - img [ref=e32]
    - paragraph [ref=e34]:
      - text: Already have an account?
      - link "Log in" [ref=e35] [cursor=pointer]:
        - /url: /login
```