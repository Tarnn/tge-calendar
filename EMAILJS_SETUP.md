# Email delivery for issue reports (optional)

The "Report an issue" form works out of the box: with no configuration it opens a
pre-filled GitHub issue. If you would rather receive reports by email, connect
[EmailJS](https://www.emailjs.com/) (free tier: 200 emails a month).

## 1. Create the service and template

1. Sign up at emailjs.com and add an **Email Service** (Gmail, Outlook, custom SMTP…).
   Copy its **Service ID**.
2. Create an **Email Template**. Set the recipient ("To email") in the template
   itself — the app never sends a recipient address from the browser.
3. Use these variables in the template body:

   | Variable          | Content                                  |
   | ----------------- | ---------------------------------------- |
   | `{{from_name}}`   | Reporter's name, or "Anonymous"          |
   | `{{from_email}}`  | Reporter's email, or "not provided"      |
   | `{{subject}}`     | Fixed subject line                       |
   | `{{message}}`     | The report                               |
   | `{{page_url}}`    | Page the report was sent from            |
   | `{{user_agent}}`  | Browser                                  |
   | `{{timestamp}}`   | ISO timestamp                            |
   | `{{report_type}}` | "Issue report"                           |

   Copy the **Template ID**.
4. Copy your **Public Key** from *Account → General*.

## 2. Configure the app

Create `.env.local` in the project root (it is git-ignored):

```env
VITE_EMAILJS_SERVICE_ID=service_xxxxxxx
VITE_EMAILJS_TEMPLATE_BUG=template_xxxxxxx
VITE_EMAILJS_PUBLIC_KEY=xxxxxxxxxxxxxxxx
```

Restart `npm run dev`. On a host such as Vercel or Netlify, add the same three
variables in the project settings and redeploy.

## Behaviour

- All three values must be present, otherwise the form falls back to GitHub issues.
- A browser can send one report every five minutes.
- If EmailJS rejects a send, the user is offered the GitHub route instead.
- In the EmailJS dashboard, restrict the allowed origins to your domain so the
  public key cannot be reused elsewhere.
