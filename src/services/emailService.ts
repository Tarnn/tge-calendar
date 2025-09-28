import emailjs from '@emailjs/browser'
import { toast } from 'sonner'

// EmailJS configuration - set these up in EmailJS dashboard or environment variables
const EMAILJS_SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID || 'service_tge_calendar'
const EMAILJS_TEMPLATE_ID_BUG = import.meta.env.VITE_EMAILJS_TEMPLATE_BUG || 'template_bug_report'
const EMAILJS_PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY || 'your_emailjs_public_key'

// Initialize EmailJS only if we have a valid key
if (EMAILJS_PUBLIC_KEY && EMAILJS_PUBLIC_KEY !== 'your_emailjs_public_key') {
  emailjs.init(EMAILJS_PUBLIC_KEY)
}

export interface BugReportData {
  name: string
  email: string
  description: string
  userAgent: string
  timestamp: string
  url: string
}


export class EmailService {
  static async sendBugReport(data: BugReportData): Promise<{ success: boolean; message: string }> {
    // Check if EmailJS is properly configured
    if (EMAILJS_PUBLIC_KEY === 'your_emailjs_public_key' || !EMAILJS_PUBLIC_KEY) {
      console.warn('EmailJS not configured, using fallback method')
      toast.error('EmailJS not configured. Please check your EmailJS public key in .env.local', {
        duration: 5000,
        style: {
          background: '#ef4444',
          color: 'white',
          border: '1px solid #dc2626'
        }
      })
      return this.sendEmailFallback({
        type: 'bug',
        name: data.name,
        email: data.email,
        message: data.description
      })
    }

    try {
      const templateParams = {
        to_email: 'tarnwallet@gmail.com',
        from_name: data.name || 'Anonymous',
        from_email: data.email || 'no-reply@tgecalendar.com',
        subject: 'TGE Calendar - Bug Report',
        message: data.description,
        user_agent: data.userAgent,
        timestamp: data.timestamp,
        page_url: data.url,
        report_type: 'Bug Report'
      }

      const response = await emailjs.send(
        EMAILJS_SERVICE_ID,
        EMAILJS_TEMPLATE_ID_BUG,
        templateParams
      )

      if (response.status === 200) {
        return { success: true, message: 'Bug report sent successfully!' }
      } else {
        throw new Error(`EmailJS returned status: ${response.status}`)
      }
    } catch (error) {
      console.error('Error sending bug report:', error)
      
      // Try fallback method if EmailJS fails
      console.log('Attempting fallback email method...')
      return this.sendEmailFallback({
        type: 'bug',
        name: data.name,
        email: data.email,
        message: data.description
      })
    }
  }


  // Fallback method using a simple HTTP service (like Formspree or similar)
  static async sendEmailFallback(data: {
    type: 'bug'
    name: string
    email: string
    message: string
  }): Promise<{ success: boolean; message: string }> {
    try {
      // Using a generic form submission service as fallback
      // You can replace this with Formspree, Netlify Forms, or similar
      const formData = new FormData()
      formData.append('_to', 'tarnwallet@gmail.com')
      formData.append('_subject', 'TGE Calendar - Bug Report')
      formData.append('name', data.name)
      formData.append('email', data.email)
      formData.append('message', data.message)
      formData.append('timestamp', new Date().toISOString())
      formData.append('url', window.location.href)

      // This is a placeholder - you'll need to replace with actual service endpoint
      const response = await fetch('https://formspree.io/f/your_form_id', {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json'
        }
      })

      if (response.ok) {
        return { success: true, message: 'Message sent successfully!' }
      } else {
        throw new Error(`HTTP ${response.status}`)
      }
    } catch (error) {
      console.error('Fallback email service error:', error)
      return { 
        success: false, 
        message: 'Failed to send message. Please try again later.' 
      }
    }
  }
}

// Spam prevention utility
export class SpamPrevention {
  private static readonly COOLDOWN_PERIOD = 5 * 60 * 1000 // 5 minutes
  private static readonly COOKIE_NAME = 'tge_last_submission'

  static canSubmit(): { allowed: boolean; remainingTime?: number } {
    const lastSubmission = document.cookie
      .split('; ')
      .find(row => row.startsWith(`${this.COOKIE_NAME}=`))
      ?.split('=')[1]

    if (!lastSubmission) {
      return { allowed: true }
    }

    const lastTime = parseInt(lastSubmission)
    const now = Date.now()
    const timeDiff = now - lastTime

    if (timeDiff < this.COOLDOWN_PERIOD) {
      const remainingTime = Math.ceil((this.COOLDOWN_PERIOD - timeDiff) / 60000)
      return { allowed: false, remainingTime }
    }

    return { allowed: true }
  }

  static recordSubmission(): void {
    const expires = new Date(Date.now() + this.COOLDOWN_PERIOD).toUTCString()
    document.cookie = `${this.COOKIE_NAME}=${Date.now()}; expires=${expires}; path=/; SameSite=Strict`
  }
}
