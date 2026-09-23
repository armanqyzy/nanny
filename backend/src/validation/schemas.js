const { z } = require('../middleware/validate');

const emailSchema = z
  .string()
  .trim()
  .email('Enter a valid email address')
  .max(160);

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be at most 128 characters')
  .regex(/[A-Za-z]/, 'Password must include at least one letter')
  .regex(/[0-9]/, 'Password must include at least one number');

const phoneSchema = z
  .string()
  .trim()
  .min(6)
  .max(40)
  .regex(/^[+0-9()\-\s]+$/, 'Phone contains invalid characters');

const optionalTime = z
  .string()
  .regex(/^\d{2}:\d{2}(:\d{2})?$/, 'Time must be in HH:MM format')
  .optional()
  .nullable();

const authSchemas = {
  register: z.object({
    full_name: z.string().trim().min(2).max(120),
    email: emailSchema,
    phone: phoneSchema.optional(),
    password: passwordSchema,
    role: z.enum(['owner', 'sitter']).optional(),
  }),
  login: z.object({
    email: emailSchema,
    password: z.string().min(1, 'Password is required').max(128),
  }),
  forgotPassword: z.object({
    email: emailSchema,
  }),
  resetPassword: z.object({
    token: z.string().trim().min(16).max(255),
    password: passwordSchema,
  }),
};

const bookingBase = z.object({
  sitter_id: z.coerce.number().int().positive(),
  pet_id: z.coerce.number().int().positive(),
  service: z.enum(['walking', 'daycare', 'boarding', 'grooming', 'home_visit', 'medication_care']),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'start_date must be YYYY-MM-DD'),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'end_date must be YYYY-MM-DD'),
  start_time: optionalTime,
  end_time: optionalTime,
  notes: z.string().trim().max(2000).optional().nullable(),
});

const bookingSchemas = {
  create: bookingBase,
  rebook: bookingBase.pick({
    start_date: true,
    end_date: true,
    start_time: true,
    end_time: true,
    notes: true,
  }),
  status: z.object({
    status: z.enum(['pending', 'confirmed', 'completed', 'cancelled']),
  }),
  availabilityQuery: z.object({
    start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    start_time: optionalTime,
    end_time: optionalTime,
  }),
};

const mediaUrl = z.string().trim().max(500).url().or(z.string().trim().startsWith('/uploads/'));

const messageSchemas = {
  send: z.object({
    receiver_id: z.coerce.number().int().positive(),
    body: z.string().trim().max(4000).optional().nullable(),
    audio_url: mediaUrl.optional().nullable(),
    image_url: mediaUrl.optional().nullable(),
    file_url: mediaUrl.optional().nullable(),
  }).refine((value) => value.body || value.audio_url || value.image_url || value.file_url, {
    message: 'Message must include text, audio, image or file content',
  }),
  delivered: z.object({
    message_id: z.coerce.number().int().positive(),
  }),
  deleteMessage: z.object({
    scope: z.enum(['self', 'everyone']).optional(),
  }),
};

const supportSchemas = {
  createTicket: z.object({
    category: z.enum(['booking_issue', 'payment_issue', 'safety_concern', 'sitter_report', 'shop_order', 'technical_issue', 'other']),
    priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
    subject: z.string().trim().min(3).max(180),
    body: z.string().trim().min(10).max(4000),
  }),
};

const orderSchemas = {
  checkout: z.object({
    items: z.array(z.object({
      product_id: z.coerce.number().int().positive(),
      quantity: z.coerce.number().int().positive().max(99),
    })).min(1),
    address: z.string().trim().min(5).max(255),
    customer_email: emailSchema,
    customer_name: z.string().trim().min(2).max(120).optional().nullable(),
    customer_phone: phoneSchema.optional().nullable(),
    payment: z.object({
      cardholder_name: z.string().trim().min(2).max(120).optional(),
      card_holder: z.string().trim().min(2).max(120).optional(),
      card_number: z.string().trim().regex(/^\d{12,19}$/, 'Card number must be 12-19 digits'),
      expiry_month: z.coerce.number().int().min(1).max(12),
      expiry_year: z.coerce.number().int().min(new Date().getFullYear()).max(new Date().getFullYear() + 20),
      cvc: z.string().trim().regex(/^\d{3,4}$/).optional(),
      cvv: z.string().trim().regex(/^\d{3,4}$/).optional(),
    }).superRefine((payment, ctx) => {
      if (!payment.cardholder_name && !payment.card_holder) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['cardholder_name'],
          message: 'Card holder name is required',
        });
      }

      if (!payment.cvc && !payment.cvv) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['cvc'],
          message: 'Security code is required',
        });
      }
    }).transform(({ cardholder_name, card_holder, cvc, cvv, ...payment }) => ({
      ...payment,
      cardholder_name: cardholder_name || card_holder,
      cvc: cvc || cvv,
    })),
  }),
};

const userSchemas = {
  updateMe: z.object({
    full_name: z.string().trim().min(2).max(120).optional(),
    phone: phoneSchema.optional().nullable(),
    address: z.string().trim().max(255).optional().nullable(),
    avatar_url: mediaUrl.optional().nullable(),
    emergency_contact_name: z.string().trim().max(120).optional().nullable(),
    emergency_contact_phone: phoneSchema.optional().nullable(),
    emergency_contact_notes: z.string().trim().max(500).optional().nullable(),
  }),
};

const sitterSchemas = {
  searchQuery: z.object({
    city: z.string().trim().max(120).optional(),
    service: z.enum(['walking', 'daycare', 'boarding', 'grooming', 'home_visit', 'medication_care']).optional(),
    min_rating: z.coerce.number().min(0).max(5).optional(),
    max_price: z.coerce.number().nonnegative().optional(),
    q: z.string().trim().max(120).optional(),
  }),
  mapQuery: z.object({
    city: z.string().trim().max(120).optional(),
    service: z.enum(['walking', 'daycare', 'boarding', 'grooming', 'home_visit', 'medication_care']).optional(),
    min_rating: z.coerce.number().min(0).max(5).optional(),
    max_price: z.coerce.number().nonnegative().optional(),
    q: z.string().trim().max(120).optional(),
    sort: z.enum(['nearest', 'best_rating', 'lowest_price']).optional(),
    max_distance: z.coerce.number().positive().max(100).optional(),
    lat: z.coerce.number().min(-90).max(90).optional(),
    lng: z.coerce.number().min(-180).max(180).optional(),
  }),
  updateMe: z.object({
    description: z.string().trim().max(4000).optional().nullable(),
    experience_yrs: z.coerce.number().int().min(0).max(80).optional().nullable(),
    city: z.string().trim().max(120).optional().nullable(),
    district: z.string().trim().max(120).optional().nullable(),
    price_per_day: z.coerce.number().nonnegative().max(1000000).optional().nullable(),
    is_available: z.boolean().optional().nullable(),
    id_document_url: mediaUrl.optional().nullable(),
    latitude: z.coerce.number().min(-90).max(90).optional().nullable(),
    longitude: z.coerce.number().min(-180).max(180).optional().nullable(),
    service_area_text: z.string().trim().max(255).optional().nullable(),
    service_radius_km: z.coerce.number().int().min(1).max(100).optional().nullable(),
    work_days: z.string().trim().max(64).optional().nullable(),
    work_start: optionalTime,
    work_end: optionalTime,
    auto_reply_templates: z.array(z.string().trim().max(400)).max(10).optional().nullable(),
  }),
  services: z.object({
    services: z.array(z.object({
      service: z.enum(['walking', 'daycare', 'boarding', 'grooming', 'home_visit', 'medication_care']),
      price: z.coerce.number().nonnegative().max(1000000),
    })).max(20),
  }),
  verification: z.object({
    id_document_url: mediaUrl,
  }),
};

const recommendationSchemas = {
  query: z.object({
    pet_id: z.coerce.number().int().positive().optional(),
    lat: z.coerce.number().min(-90).max(90).optional(),
    lng: z.coerce.number().min(-180).max(180).optional(),
  }),
};

const petSchemas = {
  create: z.object({
    name: z.string().trim().min(1).max(120),
    pet_type: z.enum(['dog', 'cat', 'other']),
    gender: z.string().trim().max(30).optional().nullable(),
    age: z.coerce.number().int().min(0).max(100).optional().nullable(),
    size: z.string().trim().max(40).optional().nullable(),
    care_type: z.string().trim().max(60).optional().nullable(),
    behavior: z.string().trim().max(1000).optional().nullable(),
    health: z.string().trim().max(1000).optional().nullable(),
    description: z.string().trim().max(2000).optional().nullable(),
    photo_url: mediaUrl.optional().nullable(),
  }),
  update: z.object({
    name: z.string().trim().min(1).max(120).optional(),
    pet_type: z.enum(['dog', 'cat', 'other']).optional(),
    gender: z.string().trim().max(30).optional().nullable(),
    age: z.coerce.number().int().min(0).max(100).optional().nullable(),
    size: z.string().trim().max(40).optional().nullable(),
    care_type: z.string().trim().max(60).optional().nullable(),
    behavior: z.string().trim().max(1000).optional().nullable(),
    health: z.string().trim().max(1000).optional().nullable(),
    description: z.string().trim().max(2000).optional().nullable(),
    photo_url: mediaUrl.optional().nullable(),
  }),
};

const uploadSchemas = {
  query: z.object({
    kind: z.enum(['document', 'avatar', 'pet-photo', 'booking-photo', 'product-photo']).optional(),
  }),
  headers: z.object({
    'content-type': z.enum(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']),
    'x-file-name': z.string().trim().min(1).max(255).optional(),
  }).passthrough(),
};

module.exports = {
  authSchemas,
  bookingSchemas,
  messageSchemas,
  supportSchemas,
  orderSchemas,
  userSchemas,
  sitterSchemas,
  recommendationSchemas,
  petSchemas,
  uploadSchemas,
};
