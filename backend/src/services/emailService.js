let nodemailer = null;

try {
  // Optional dependency: if unavailable, checkout still works and logs the reason.
  nodemailer = require('nodemailer');
} catch (_error) {
  nodemailer = null;
}

function buildTransport() {
  if (!nodemailer) return null;
  if (!process.env.SMTP_HOST || !process.env.SMTP_PORT || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    return null;
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: String(process.env.SMTP_SECURE || 'false') === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

async function sendOrderConfirmationEmail({ to, customerName, order, items }) {
  const transport = buildTransport();
  if (!transport) {
    console.log(`[mail] skipped order confirmation for ${to || 'unknown recipient'}: SMTP is not configured`);
    return { skipped: true };
  }

  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  const itemLines = items
    .map((item) => `${item.title} x${item.quantity} — ${Number(item.unit_price).toLocaleString()} ₸`)
    .join('\n');

  const text = [
    `Hello ${customerName || 'there'},`,
    '',
    `Your payment for order #${order.id} was successful.`,
    `Order total: ${Number(order.total).toLocaleString()} ₸`,
    `Payment status: ${order.payment_status}`,
    `Card: •••• ${order.payment_last4 || '****'}`,
    '',
    'Items:',
    itemLines,
    '',
    'Delivery details:',
    order.address || 'No address provided',
    '',
    'Thank you for choosing Nanny Pet Shop.',
  ].join('\n');

  await transport.sendMail({
    from,
    to,
    subject: `Nanny order #${order.id} payment confirmation`,
    text,
  });

  return { skipped: false };
}

async function sendPlainEmail({ to, subject, text }) {
  const transport = buildTransport();
  if (!transport) {
    console.log(`[mail] skipped email for ${to || 'unknown recipient'}: SMTP is not configured`);
    return { skipped: true };
  }

  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  await transport.sendMail({
    from,
    to,
    subject,
    text,
  });

  return { skipped: false };
}

module.exports = {
  sendOrderConfirmationEmail,
  sendPlainEmail,
};
