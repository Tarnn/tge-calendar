# EmailJS Setup Guide

## 🔧 Required Configuration

To fix the "Public Key is invalid" error, you need to set up EmailJS properly.

### 1. Get Your EmailJS Public Key

1. Go to [EmailJS Dashboard](https://dashboard.emailjs.com/admin/account)
2. Sign in to your EmailJS account
3. Go to **Account** → **General**
4. Copy your **Public Key** (it looks like: `user_xxxxxxxxxxxxxxxx`)

### 2. Update Environment Variables

Replace `your_emailjs_public_key_here` in `.env.local` with your actual public key:

```bash
VITE_EMAILJS_PUBLIC_KEY=user_your_actual_public_key_here
```

### 3. EmailJS Service Configuration

Your current configuration:
- **Service ID**: `service_ajhm1eq`
- **Bug Report Template**: `template_7px9yzl`
- **FAQ Contact Template**: `template_faq_contact`

### 4. Template Setup

#### Bug Report Template (`template_7px9yzl`)
```
Subject: TGE Calendar - Bug Report

From: {{from_name}} ({{from_email}})
Message: {{message}}
User Agent: {{user_agent}}
Timestamp: {{timestamp}}
Page URL: {{page_url}}
Report Type: {{report_type}}

Please respond to: {{from_email}}
```

#### FAQ Contact Template (`template_faq_contact`)
```
Subject: TGE Calendar - General Question

From: {{from_name}} ({{from_email}})
Message: {{message}}
Timestamp: {{timestamp}}
Page URL: {{page_url}}
Report Type: {{report_type}}

Please respond to: {{from_email}}
```

### 5. Email Service Setup

1. Go to [EmailJS Services](https://dashboard.emailjs.com/admin/integration)
2. Add your email service (Gmail, Outlook, etc.)
3. Note the Service ID (should be `service_ajhm1eq`)

### 6. Template Variables

Make sure your templates include these variables:
- `{{from_name}}` - User's name
- `{{from_email}}` - User's email
- `{{message}}` - User's message
- `{{user_agent}}` - Browser info
- `{{timestamp}}` - Submission time
- `{{page_url}}` - Current page URL
- `{{report_type}}` - Type of submission

### 7. Testing

After updating the public key:
1. Restart your development server
2. Try submitting a bug report
3. Check your email for the test message

## 🚨 Common Issues

### "Public Key is invalid"
- ✅ Make sure you copied the correct public key
- ✅ Ensure it starts with `user_`
- ✅ Check for typos in `.env.local`

### "Service not found"
- ✅ Verify Service ID is correct
- ✅ Check if service is active in EmailJS dashboard

### "Template not found"
- ✅ Verify Template ID is correct
- ✅ Check if template is published
- ✅ Ensure template has correct variables

## 📧 Email Destination

All emails will be sent to: `tarnwallet@gmail.com`

## 🔄 Fallback System

If EmailJS fails, the system will:
1. Show an error toast
2. Attempt to open user's email client
3. Pre-fill the email with the message

## ✅ Verification Checklist

- [ ] Public key added to `.env.local`
- [ ] Service ID matches EmailJS dashboard
- [ ] Template IDs are correct
- [ ] Templates have all required variables
- [ ] Email service is connected
- [ ] Development server restarted
- [ ] Test submission works
