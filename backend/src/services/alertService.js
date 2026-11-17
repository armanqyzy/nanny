const db = require('../config/db');
const { createNotification } = require('./notificationService');
const { sendPlainEmail } = require('./emailService');
const { serviceRu, dateRu } = require('../utils/ruText');

async function sendEmail({ to, subject, text, customerName = '' }) {
  if (!to) return { skipped: true };
  return sendPlainEmail({
    to,
    subject,
    text: `Здравствуйте, ${customerName}!\n\n${text}\n\nКоманда Nanny`,
  });
}

async function sendSms({ phone, text }) {
  if (!phone) return { skipped: true };

  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM;

  if (!sid || !token || !from) {
    console.log(`[sms] skipped to ${phone}: Twilio is not configured`);
    return { skipped: true };
  }

  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      To: phone,
      From: from,
      Body: text,
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`SMS delivery failed: ${details}`);
  }

  return response.json();
}

async function getUserContact(userId) {
  const { rows } = await db.query(
    'SELECT id, full_name, email, phone FROM users WHERE id = $1',
    [userId]
  );
  return rows[0] || null;
}

async function notifyUser(
  {
    userId,
    type,
    title,
    body,
    meta = {},
    emailSubject,
    emailText,
    smsText,
  },
  options = {}
) {
  const notification = await createNotification({ userId, type, title, body, meta }, options);
  const contact = await getUserContact(userId);

  if (contact?.email && (emailSubject || emailText)) {
    sendEmail({
      to: contact.email,
      subject: emailSubject || title,
      text: emailText || body || title,
      customerName: contact.full_name,
    }).catch((error) => console.error('Email alert failed:', error.message));
  }

  if (contact?.phone && smsText) {
    sendSms({
      phone: contact.phone,
      text: smsText,
    }).catch((error) => console.error('SMS alert failed:', error.message));
  }

  return notification;
}

// DATE columns come back from pg as Date objects (local midnight) and TIME as 'HH:MM:SS',
// so normalise both before building the reminder timestamp.
function toDateString(value) {
  if (value instanceof Date) {
    const pad = (n) => String(n).padStart(2, '0');
    return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
  }
  return String(value).slice(0, 10);
}

function toTimeString(value) {
  return value ? String(value).slice(0, 5) : '09:00';
}

function buildReminderDueAt(startDate, startTime) {
  const base = new Date(`${toDateString(startDate)}T${toTimeString(startTime)}:00+05:00`);
  base.setHours(base.getHours() - 2);
  return base.toISOString();
}

async function clearBookingReminderJobs(bookingId, client = db) {
  await client.query(
    `UPDATE notification_jobs
        SET status = 'cancelled',
            processed_at = NOW()
      WHERE booking_id = $1
        AND type = 'booking_reminder'
        AND processed_at IS NULL`,
    [bookingId]
  );
}

async function queueBookingReminder({
  bookingId,
  userId,
  petName,
  service,
  startDate,
  startTime,
}, client = db) {
  const contact = await getUserContact(userId);
  if (!contact) return;

  const dueAt = buildReminderDueAt(startDate, startTime);
  const title = 'Скоро уход за питомцем';
  const body = `${petName}: ${serviceRu(service)} ${dateRu(startDate)}${startTime ? ` в ${toTimeString(startTime)}` : ''}.`;

  const jobs = [];
  if (contact.email) {
    jobs.push({
      channel: 'email',
      destination: contact.email,
    });
  }
  if (contact.phone) {
    jobs.push({
      channel: 'sms',
      destination: contact.phone,
    });
  }

  for (const job of jobs) {
    await client.query(
      `INSERT INTO notification_jobs (user_id, booking_id, type, channel, destination, title, body, due_at, meta)
       VALUES ($1,$2,'booking_reminder',$3,$4,$5,$6,$7,$8)`,
      [
        userId,
        bookingId,
        job.channel,
        job.destination,
        title,
        body,
        dueAt,
        JSON.stringify({ pet_name: petName, service, start_date: startDate, start_time: startTime || null }),
      ]
    );
  }
}

async function processDueNotificationJobs(io) {
  const { rows } = await db.query(
    `SELECT *
       FROM notification_jobs
      WHERE processed_at IS NULL
        AND status = 'queued'
        AND due_at <= NOW()
      ORDER BY due_at ASC
      LIMIT 20`
  );

  for (const job of rows) {
    try {
      if (job.channel === 'email') {
        await sendEmail({
          to: job.destination,
          subject: job.title,
          text: job.body,
        });
      }

      if (job.channel === 'sms') {
        await sendSms({
          phone: job.destination,
          text: job.body,
        });
      }

      await notifyUser({
        userId: job.user_id,
        type: 'booking_reminder',
        title: job.title,
        body: job.body,
        meta: job.meta || {},
      }, { io });

      await db.query(
        `UPDATE notification_jobs
            SET status = 'sent',
                processed_at = NOW()
          WHERE id = $1`,
        [job.id]
      );
    } catch (error) {
      console.error('Notification job failed:', error.message);
      await db.query(
        `UPDATE notification_jobs
            SET status = 'failed'
          WHERE id = $1`,
        [job.id]
      );
    }
  }
}

function startNotificationWorker(io) {
  setInterval(() => {
    processDueNotificationJobs(io).catch((error) => {
      console.error('Notification worker crashed:', error.message);
    });
  }, 60 * 1000);
}

module.exports = {
  notifyUser,
  queueBookingReminder,
  clearBookingReminderJobs,
  startNotificationWorker,
};
