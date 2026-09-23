const db = require('../config/db');
const { notifyUser } = require('../services/alertService');
const { chargeCard } = require('../services/paymentService');
const { sendOrderConfirmationEmail } = require('../services/emailService');

// POST /api/orders { items: [{product_id, quantity}], address, customer_email, customer_name, customer_phone, payment }
async function checkout(req, res) {
  const {
    items,
    address,
    customer_email,
    customer_name,
    customer_phone,
    payment,
  } = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'items required' });
  }
  if (!address || !String(address).trim()) {
    return res.status(400).json({ error: 'delivery address required' });
  }
  if (!customer_email || !String(customer_email).trim()) {
    return res.status(400).json({ error: 'customer email required' });
  }
  if (!payment || typeof payment !== 'object') {
    return res.status(400).json({ error: 'payment details required' });
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    let total = 0;
    const priced = [];
    for (const it of items) {
      const { rows } = await client.query(
        'SELECT id, title, price, stock FROM products WHERE id=$1 AND is_active=TRUE',
        [it.product_id]
      );
      const p = rows[0];
      if (!p) throw new Error(`Product ${it.product_id} not found`);
      if (p.stock < it.quantity) throw new Error(`Not enough stock for product ${it.product_id}`);
      total += Number(p.price) * it.quantity;
      priced.push({ ...it, title: p.title, unit_price: p.price });
    }

    const paymentResult = await chargeCard({
      amount: total,
      orderReference: `user${req.user.id}`,
      paymentCard: payment,
    });

    const { rows: orderRows } = await client.query(
      `INSERT INTO orders (
          user_id,
          total,
          status,
          address,
          customer_email,
          customer_name,
          customer_phone,
          payment_method,
          payment_status,
          payment_reference,
          payment_last4,
          paid_at
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,NOW())
        RETURNING *`,
      [
        req.user.id,
        total,
        'paid',
        address || null,
        String(customer_email).trim(),
        String(customer_name || '').trim() || null,
        String(customer_phone || '').trim() || null,
        paymentResult.payment_method,
        paymentResult.payment_status,
        paymentResult.payment_reference,
        paymentResult.payment_last4,
      ]
    );
    const order = orderRows[0];

    for (const p of priced) {
      await client.query(
        'INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES ($1,$2,$3,$4)',
        [order.id, p.product_id, p.quantity, p.unit_price]
      );
      await client.query(
        'UPDATE products SET stock = stock - $1 WHERE id = $2',
        [p.quantity, p.product_id]
      );
    }

    await client.query('COMMIT');
    await notifyUser({
      userId: req.user.id,
      type: 'shop_order_created',
      title: 'Shop order paid',
      body: `Your shop order #${order.id} was paid successfully.`,
      meta: { order_id: order.id, payment_status: order.payment_status },
      emailSubject: `Shop order #${order.id} paid successfully`,
      emailText: `Your shop order #${order.id} was paid successfully. Open Nanny to track status updates.`,
      smsText: `Nanny: shop order #${order.id} paid successfully.`,
    }, { io: req.app.get('io') });

    const detailedItems = priced.map((item) => {
      return {
        ...item,
        title: item.title || `Product #${item.product_id}`,
      };
    });

    sendOrderConfirmationEmail({
      to: order.customer_email,
      customerName: order.customer_name,
      order,
      items: detailedItems,
    }).catch((error) => {
      console.error('Order confirmation email failed:', error.message);
    });

    res.status(201).json(order);
  } catch (e) {
    await client.query('ROLLBACK');
    res.status(400).json({ error: e.message });
  } finally {
    client.release();
  }
}

async function myOrders(req, res) {
  const { rows: orders } = await db.query(
    'SELECT * FROM orders WHERE user_id=$1 ORDER BY created_at DESC',
    [req.user.id]
  );
  for (const o of orders) {
    const { rows: items } = await db.query(
      `SELECT oi.*, p.title, p.image_url
         FROM order_items oi
         JOIN products p ON p.id = oi.product_id
        WHERE oi.order_id = $1`,
      [o.id]
    );
    o.items = items;
  }
  res.json(orders);
}

module.exports = { checkout, myOrders };
