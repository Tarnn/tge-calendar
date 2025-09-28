# EmailJS Setup Guide for TGE Calendar

This guide will help you set up EmailJS to handle email submissions from the TGE Calendar application.

## Step 1: Create EmailJS Account

1. Go to [EmailJS](https://www.emailjs.com/)
2. Sign up for a free account
3. Verify your email address

## Step 2: Add Email Service

1. In your EmailJS dashboard, go to "Email Services"
2. Click "Add New Service"
3. Choose your email provider (Gmail recommended for `tarnwallet@gmail.com`)
4. Follow the setup instructions for Gmail:
   - Service ID: `service_tge_calendar` (or your preferred ID)
   - Configure with your Gmail credentials

## Step 3: Create Email Templates

### Bug Report Template
1. Go to "Email Templates" in your dashboard
2. Create a new template with ID: `template_bug_report`
3. Use this template content:

```
Subject: TGE Calendar - Bug Report from {{from_name}}

Hello,

You have received a new bug report from the TGE Calendar application.

**Reporter Details:**
- Name: {{from_name}}
- Email: {{from_email}}
- Timestamp: {{timestamp}}
- Page URL: {{page_url}}
- User Agent: {{user_agent}}

**Bug Description:**
{{message}}

---
This email was sent automatically from TGE Calendar.
```

### FAQ Contact Template
1. Create another template with ID: `template_faq_contact`
2. Use this template content:

```
Subject: TGE Calendar - Question from {{from_name}}

Hello,

You have received a new message from the TGE Calendar application.

**Contact Details:**
- Name: {{from_name}}
- Email: {{from_email}}
- Timestamp: {{timestamp}}
- Page URL: {{page_url}}

**Message:**
{{message}}

---
This email was sent automatically from TGE Calendar.
```

## Step 4: Get Your Public Key

1. Go to "Account" > "General"
2. Copy your Public Key
3. Update the `EMAILJS_PUBLIC_KEY` in `src/services/emailService.ts`

## Step 5: Update Configuration

Update the following values in `src/services/emailService.ts`:

```typescript
const EMAILJS_SERVICE_ID = 'your_service_id' // From Step 2
const EMAILJS_TEMPLATE_ID_BUG = 'template_bug_report' // From Step 3
const EMAILJS_TEMPLATE_ID_FAQ = 'template_faq_contact' // From Step 3
const EMAILJS_PUBLIC_KEY = 'your_public_key' // From Step 4
```

## Step 6: Test the Integration

1. Run your application
2. Try submitting a bug report
3. Try sending a message from the FAQ page
4. Check your email (`tarnwallet@gmail.com`) for the messages

## Alternative: Using Formspree (Simpler Setup)

If you prefer a simpler setup, you can use Formspree instead:

1. Go to [Formspree](https://formspree.io/)
2. Create a free account
3. Create a new form pointing to `tarnwallet@gmail.com`
4. Get your form endpoint URL
5. Update the `sendEmailFallback` method in `emailService.ts` with your Formspree URL

## Environment Variables (Optional)

For better security, you can store the EmailJS configuration in environment variables:

1. Create `.env.local` file:
```
VITE_EMAILJS_SERVICE_ID=your_service_id
VITE_EMAILJS_TEMPLATE_BUG=template_bug_report
VITE_EMAILJS_TEMPLATE_FAQ=template_faq_contact
VITE_EMAILJS_PUBLIC_KEY=your_public_key
```

2. Update `emailService.ts` to use environment variables:
```typescript
const EMAILJS_SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID
const EMAILJS_TEMPLATE_ID_BUG = import.meta.env.VITE_EMAILJS_TEMPLATE_BUG
const EMAILJS_TEMPLATE_ID_FAQ = import.meta.env.VITE_EMAILJS_TEMPLATE_FAQ
const EMAILJS_PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY
```

## Troubleshooting

- **Emails not sending**: Check browser console for errors
- **Wrong email format**: Verify template variables match the code
- **Rate limiting**: EmailJS free tier has monthly limits
- **Spam folder**: Check if emails are going to spam

## Security Notes

- EmailJS public key is safe to expose in frontend code
- The 5-minute cooldown prevents spam
- Consider implementing additional validation for production use
