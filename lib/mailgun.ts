import FormData from 'form-data'
import Mailgun from 'mailgun.js'

import { money } from '@/lib/money'

type ConfirmationItem = {
  name: string
  quantity: number
  unitPrice: number
}

type Confirmation = {
  to: string
  customerName: string
  reference: string
  items: ConfirmationItem[]
  total: number
  deliveryAddress: string
  deliveryArea: string
  paymentMethod: string
}

function escapeHtml(value: string) {
  return value.replace(
    /[&<>'"]/g,
    (character) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[
        character
      ] ?? character,
  )
}

export async function sendOrderConfirmation(details: Confirmation) {
  const apiKey = process.env.MAILGUN_API_KEY
  const domain = process.env.MAILGUN_DOMAIN
  const from = process.env.MAILGUN_FROM_EMAIL

  if (!apiKey || !domain || !from) {
    console.warn('Mailgun is not configured; the order was saved without an email.')
    return false
  }

  const mailgun = new Mailgun(FormData)
  const client = mailgun.client({
    username: 'api',
    key: apiKey,
    ...(process.env.MAILGUN_API_BASE_URL
      ? { url: process.env.MAILGUN_API_BASE_URL }
      : {}),
  })
  const rows = details.items
    .map(
      (item) => `
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #ead9d3">${escapeHtml(item.name)} × ${item.quantity}</td>
          <td style="padding:10px 0;border-bottom:1px solid #ead9d3;text-align:right">${money(item.unitPrice * item.quantity)}</td>
        </tr>`,
    )
    .join('')

  try {
    await client.messages.create(domain, {
      from,
      to: [details.to],
      subject: `VieZobo order ${details.reference} received`,
      text: `Thank you, ${details.customerName}. Your VieZobo order ${details.reference} for ${money(details.total)} has been received. Delivery: ${details.deliveryAddress}, ${details.deliveryArea}. Payment method: ${details.paymentMethod}.`,
      html: `
        <div style="margin:0;background:#fffaf5;padding:32px;font-family:Arial,sans-serif;color:#351522">
          <div style="max-width:600px;margin:auto;background:#ffffff;border-radius:24px;padding:32px">
            <p style="margin:0;color:#b70b4c;font-size:13px;font-weight:700;letter-spacing:2px">VIEZOBO</p>
            <h1 style="font-size:30px;margin:14px 0">Thank you, ${escapeHtml(details.customerName)}!</h1>
            <p style="line-height:1.6;color:#6d5961">We received your order <strong>${escapeHtml(details.reference)}</strong>.</p>
            <table style="width:100%;border-collapse:collapse;margin:24px 0">${rows}</table>
            <p style="font-size:18px"><strong>Total: ${money(details.total)}</strong></p>
            <div style="background:#f8ede8;border-radius:16px;padding:18px;margin-top:22px;line-height:1.7">
              <strong>Delivery</strong><br />
              ${escapeHtml(details.deliveryAddress)}<br />
              ${escapeHtml(details.deliveryArea)}<br /><br />
              <strong>Payment method:</strong> ${escapeHtml(details.paymentMethod)}
            </div>
          </div>
        </div>`,
    })
    return true
  } catch (error) {
    console.error('Mailgun confirmation failed:', error)
    return false
  }
}
