import nodemailer from 'nodemailer';

function createTransporter() {
  const GMAIL_USER = (process.env.GMAIL_USER || '').trim()
  const GMAIL_APP_PASSWORD = (process.env.GMAIL_APP_PASSWORD || '').replace(/\s+/g, '')

  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: GMAIL_USER,
      pass: GMAIL_APP_PASSWORD,
    },
  })
}

export default createTransporter;