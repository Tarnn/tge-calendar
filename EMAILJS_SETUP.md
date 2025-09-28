# EmailJS Setup Guide for TGE Calendar

## 📧 Setting up Email Functionality

### Step 1: Create EmailJS Account
1. Go to [https://www.emailjs.com/](https://www.emailjs.com/)
2. Sign up for a free account (200 emails/month free tier)
3. Verify your email address

### Step 2: Add Email Service
1. In EmailJS dashboard → **"Email Services"**
2. Click **"Add New Service"**
3. Choose your email provider:
   - **Gmail** (recommended for personal)
   - **Outlook/Hotmail**
   - **Yahoo Mail**
   - **Custom SMTP** (for business emails)
4. Follow connection instructions
5. **Copy the Service ID** (format: `service_xxxxxxx`)

### Step 3: Create Email Templates

#### Bug Report Template
1. Go to **"Email Templates"** → **"Create New Template"**
2. **Template Name**: `Bug Report Template`
3. **Template ID**: `template_bug_report`
4. **Subject**: `TGE Calendar - Bug Report from {{from_name}}`
5. **Content**:
```
Hi there,

A bug report has been submitted from the TGE Calendar website:

**Reporter Details:**
- Name: {{from_name}}
- Email: {{from_email}}
- Timestamp: {{timestamp}}
- Page: {{page_url}}
- Browser: {{user_agent}}

**Bug Description:**
{{message}}

**Report Type:** {{report_type}}

---
This is an automated email from TGE Calendar
Website: https://tgecalendar.com
```

#### FAQ Contact Template
1. Create another template
2. **Template Name**: `FAQ Contact Template`
3. **Template ID**: `template_faq_contact`
4. **Subject**: `TGE Calendar - Contact from {{from_name}}`
5. **Content**:
```
Hi there,

A message has been submitted from the TGE Calendar FAQ page:

**Contact Details:**
- Name: {{from_name}}
- Email: {{from_email}}
- Timestamp: {{timestamp}}
- Page: {{page_url}}

**Message:**
{{message}}

**Type:** {{report_type}}

---
This is an automated email from TGE Calendar
Website: https://tgecalendar.com
```

### Step 4: Get Public Key
1. Go to **"Account"** → **"General"**
2. Find **"Public Key"** section
3. **Copy the Public Key** (long alphanumeric string)

### Step 5: Update Environment Variables
Create `.env.local` file in your project root with:

```bash
# Your existing API key
VITE_COINMARKETCAL_API_KEY=TOgJPIJwJK8Wn7JeLSKMZQNeRMrs5VwazqYDbwve
VITE_COINMARKETCAL_API_BASE_URL=https://developers.coinmarketcal.com

# EmailJS Configuration - Replace with your actual values
VITE_EMAILJS_SERVICE_ID=service_your_actual_service_id
VITE_EMAILJS_TEMPLATE_BUG=template_bug_report
VITE_EMAILJS_TEMPLATE_FAQ=template_faq_contact
VITE_EMAILJS_PUBLIC_KEY=your_actual_public_key_here
```

### Step 6: Test Email Functionality
1. Restart your dev server: `npm run dev`
2. Try submitting a bug report from the app
3. Try contacting from the FAQ page
4. Check your email for test messages

## 🔧 Troubleshooting

### Common Issues:
1. **"EmailJS not configured"** → Check your public key
2. **"Service not found"** → Verify service ID
3. **"Template not found"** → Check template IDs match exactly
4. **Emails not sending** → Check EmailJS dashboard for error logs

### Rate Limits:
- **Free tier**: 200 emails/month
- **Personal tier**: 1,000 emails/month ($9/month)
- **Team tier**: 10,000 emails/month ($35/month)

## 📝 Template Variables Available

The following variables are automatically passed to your templates:

### Bug Reports:
- `{{from_name}}` - User's name
- `{{from_email}}` - User's email
- `{{message}}` - Bug description
- `{{timestamp}}` - When submitted
- `{{page_url}}` - Current page URL
- `{{user_agent}}` - Browser info
- `{{report_type}}` - "Bug Report"

### FAQ Contact:
- `{{from_name}}` - User's name
- `{{from_email}}` - User's email
- `{{message}}` - User's message
- `{{timestamp}}` - When submitted
- `{{page_url}}` - Current page URL
- `{{report_type}}` - "FAQ Contact"

## 🚀 Ready to Go!

Once configured, users can:
- ✅ Submit bug reports with automatic emails to `tarnwallet@gmail.com`
- ✅ Contact you via FAQ page
- ✅ Spam protection with 5-minute cooldown
- ✅ Fallback to mailto: if EmailJS fails