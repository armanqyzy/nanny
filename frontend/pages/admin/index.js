import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import DashboardLayout from '../../components/DashboardLayout';
import { absoluteAssetUrl, api, currentUser, uploadFile } from '../../lib/api';
import { SHOP_ORDER_STATUSES, handleProductImageError } from '../../lib/shop';
import ConfirmModal from '../../components/ConfirmModal';
import { useLanguage } from '../../lib/i18n';

const REVIEW_STATUSES = ['new', 'in_review', 'approved', 'changes_requested', 'rejected'];

const EMPTY_PRODUCT = {
  title: '',
  category: 'food',
  description: '',
  price: '',
  stock: '',
  image_url: '',
  is_active: true,
};

function formatReviewStatusLabel(status) {
  return status.replace('_', ' ');
}

export default function Admin() {
  const router = useRouter();
  const { language } = useLanguage();
  const [tab, setTab] = useState('stats');
  const [stats, setStats]     = useState(null);
  const [users, setUsers]     = useState([]);
  const [pending, setPending] = useState([]);
  const [reviewOverview, setReviewOverview] = useState({ counts: [], actionItems: [] });
  const [reviewFilter, setReviewFilter] = useState('new');
  const [reviewSearch, setReviewSearch] = useState('');
  const [selectedPendingId, setSelectedPendingId] = useState(null);
  const [selectedPendingDetails, setSelectedPendingDetails] = useState(null);
  const [reviewChecklist, setReviewChecklist] = useState({
    identity: false,
    services: false,
    contacts: false,
    pricing: false,
  });
  const [reviewForm, setReviewForm] = useState({
    status: 'new',
    admin_notes: '',
    rejection_reason: '',
  });
  const [bookings, setBookings] = useState([]);
  const [bookingFilter, setBookingFilter] = useState('all');
  const [bookingSearch, setBookingSearch] = useState('');
  const [orders, setOrders] = useState([]);
  const [supportTickets, setSupportTickets] = useState([]);
  const [supportStatusDraft, setSupportStatusDraft] = useState({});
  const [supportResolutionDraft, setSupportResolutionDraft] = useState({});
  const [products, setProducts] = useState([]);
  const [productForm, setProductForm] = useState(EMPTY_PRODUCT);
  const [editingProductId, setEditingProductId] = useState(null);
  const [productError, setProductError] = useState('');
  const [productSuccess, setProductSuccess] = useState('');
  const [productToggleDraft, setProductToggleDraft] = useState(null);

  const t = {
    en: {
      pageTitle: 'Admin panel',
      stats: 'Stats',
      users: 'Users',
      pending: 'Pending sitters',
      allBookings: 'All bookings',
      support: 'Support',
      shopOrders: 'Shop orders',
      products: 'Products',
      platformKpi: 'Platform KPI',
      statMeta: {
        active_users: {
          label: 'Active users',
          description: 'Users with recent activity in bookings, orders or messages.',
        },
        active_sitters: {
          label: 'Active sitters',
          description: 'Approved sitters currently available or recently handling requests.',
        },
        completed_bookings: {
          label: 'Completed bookings',
          description: 'Finished services across the platform.',
        },
        average_rating: {
          label: 'Average rating',
          description: 'Average public rating from completed reviews.',
        },
        open_support_tickets: {
          label: 'Open support',
          description: 'Support tickets that still need attention.',
        },
      },
      productTitleRequired: 'Product title is required.',
      productDescriptionRequired: 'Product description is required.',
      validPrice: 'Enter a valid price.',
      stockCannotBeNegative: 'Stock cannot be negative.',
      chooseImageFile: 'Please choose an image file.',
      photoSmallerThan5Mb: 'Photo must be smaller than 5 MB.',
      failedProductPhotoUpload: 'Failed to upload product photo.',
      productUpdated: 'Product updated.',
      productCreated: 'Product created.',
      pendingTabCount: (count) => `Pending sitters (${count})`,
      phoneNotProvided: 'Phone not provided',
      notSpecified: 'Not specified',
      yearsShort: 'years',
      noDescriptionProvided: 'No description provided.',
      noServicesAddedYet: 'No services added yet.',
      pdfUploadedForManualReview: 'PDF document uploaded for manual review.',
      openPdfDocument: 'Open PDF document',
      openFullDocument: 'Open full document',
      noDocumentUploaded: 'No document uploaded.',
      noReviewHistoryYet: 'No review history yet.',
      noReviewsYetGoLive: 'No reviews yet. This application will go live without reviews.',
      latestSavedNote: 'Latest saved note',
      lastReviewed: 'Last reviewed',
      by: 'By',
      system: 'System',
      noBookingsMatch: 'No bookings match the selected filters.',
      noShopOrdersYet: 'No shop orders yet.',
      hideProductTitle: 'Hide this product from the shop?',
      showProductTitle: 'Show this product in the shop?',
      hideProductDescription: (title) => `This will remove "${title}" in the customer shop view.`,
      showProductDescription: (title) => `This will publish "${title}" in the customer shop view.`,
      hideProduct: 'Hide product',
      showProduct: 'Show product',
      cancel: 'Cancel',
    },
    ru: {
      pageTitle: 'Панель администратора',
      stats: 'Статистика',
      users: 'Пользователи',
      pending: 'Ситтеры на проверке',
      allBookings: 'Все бронирования',
      support: 'Поддержка',
      shopOrders: 'Заказы магазина',
      products: 'Товары',
      platformKpi: 'Метрика платформы',
      statMeta: {
        active_users: {
          label: 'Активные пользователи',
          description: 'Пользователи с недавней активностью в бронированиях, заказах или сообщениях.',
        },
        active_sitters: {
          label: 'Активные ситтеры',
          description: 'Одобренные ситтеры, которые сейчас доступны или недавно вели заявки.',
        },
        completed_bookings: {
          label: 'Завершённые бронирования',
          description: 'Завершённые услуги по всей платформе.',
        },
        average_rating: {
          label: 'Средний рейтинг',
          description: 'Средний публичный рейтинг по завершённым отзывам.',
        },
        open_support_tickets: {
          label: 'Открытые обращения',
          description: 'Заявки в поддержку, которые ещё требуют внимания.',
        },
      },
      productTitleRequired: 'Укажите название товара.',
      productDescriptionRequired: 'Укажите описание товара.',
      validPrice: 'Введите корректную цену.',
      stockCannotBeNegative: 'Остаток не может быть отрицательным.',
      chooseImageFile: 'Пожалуйста, выберите изображение.',
      photoSmallerThan5Mb: 'Фото должно быть меньше 5 МБ.',
      failedProductPhotoUpload: 'Не удалось загрузить фото товара.',
      productUpdated: 'Товар обновлён.',
      productCreated: 'Товар создан.',
      pendingTabCount: (count) => `Ситтеры на проверке (${count})`,
      phoneNotProvided: 'Телефон не указан',
      notSpecified: 'Не указано',
      yearsShort: 'лет',
      noDescriptionProvided: 'Описание пока не добавлено.',
      noServicesAddedYet: 'Услуги пока не добавлены.',
      pdfUploadedForManualReview: 'PDF-документ загружен для ручной проверки.',
      openPdfDocument: 'Открыть PDF-документ',
      openFullDocument: 'Открыть документ полностью',
      noDocumentUploaded: 'Документ не загружен.',
      noReviewHistoryYet: 'История проверки пока пуста.',
      noReviewsYetGoLive: 'Отзывов пока нет. Этот профиль выйдет в каталог без отзывов.',
      latestSavedNote: 'Последняя сохранённая заметка',
      lastReviewed: 'Последняя проверка',
      by: 'Кем',
      system: 'Система',
      noBookingsMatch: 'Нет бронирований под выбранные фильтры.',
      noShopOrdersYet: 'Заказов магазина пока нет.',
      hideProductTitle: 'Скрыть этот товар из магазина?',
      showProductTitle: 'Показать этот товар в магазине?',
      hideProductDescription: (title) => `Товар «${title}» исчезнет из клиентского магазина.`,
      showProductDescription: (title) => `Товар «${title}» появится в клиентском магазине.`,
      hideProduct: 'Скрыть товар',
      showProduct: 'Показать товар',
      cancel: 'Отмена',
    },
    kz: {
      pageTitle: 'Әкімші панелі',
      stats: 'Статистика',
      users: 'Пайдаланушылар',
      pending: 'Тексерудегі ситтерлер',
      allBookings: 'Барлық броньдар',
      support: 'Қолдау',
      shopOrders: 'Дүкен тапсырыстары',
      products: 'Тауарлар',
      platformKpi: 'Платформа метрикасы',
      statMeta: {
        active_users: {
          label: 'Белсенді пайдаланушылар',
          description: 'Бронь, тапсырыс немесе хабарламада жақында белсенді болған қолданушылар.',
        },
        active_sitters: {
          label: 'Белсенді ситтерлер',
          description: 'Қазір қолжетімді немесе жақында сұраныстармен жұмыс істеген мақұлданған ситтерлер.',
        },
        completed_bookings: {
          label: 'Аяқталған броньдар',
          description: 'Платформадағы аяқталған қызметтер.',
        },
        average_rating: {
          label: 'Орташа рейтинг',
          description: 'Аяқталған пікірлер бойынша орташа ашық рейтинг.',
        },
        open_support_tickets: {
          label: 'Ашық қолдау өтініштері',
          description: 'Әлі де назар талап ететін қолдау сұраныстары.',
        },
      },
      productTitleRequired: 'Тауар атауын енгізіңіз.',
      productDescriptionRequired: 'Тауар сипаттамасын енгізіңіз.',
      validPrice: 'Дұрыс бағаны енгізіңіз.',
      stockCannotBeNegative: 'Қалдық теріс болмауы керек.',
      chooseImageFile: 'Сурет файлын таңдаңыз.',
      photoSmallerThan5Mb: 'Фото 5 МБ-тан кіші болуы керек.',
      failedProductPhotoUpload: 'Тауар фотосын жүктеу сәтсіз аяқталды.',
      productUpdated: 'Тауар жаңартылды.',
      productCreated: 'Тауар жасалды.',
      pendingTabCount: (count) => `Тексерудегі ситтерлер (${count})`,
      phoneNotProvided: 'Телефон көрсетілмеген',
      notSpecified: 'Көрсетілмеген',
      yearsShort: 'жыл',
      noDescriptionProvided: 'Сипаттама әлі қосылмаған.',
      noServicesAddedYet: 'Қызметтер әлі қосылмаған.',
      pdfUploadedForManualReview: 'PDF құжат қолмен тексеру үшін жүктелді.',
      openPdfDocument: 'PDF құжатын ашу',
      openFullDocument: 'Құжатты толық ашу',
      noDocumentUploaded: 'Құжат жүктелмеген.',
      noReviewHistoryYet: 'Тексеру тарихы әлі жоқ.',
      noReviewsYetGoLive: 'Пікірлер әлі жоқ. Бұл профиль каталогқа пікірсіз шығады.',
      latestSavedNote: 'Соңғы сақталған жазба',
      lastReviewed: 'Соңғы тексеру',
      by: 'Орындаған',
      system: 'Жүйе',
      noBookingsMatch: 'Таңдалған сүзгілерге сай броньдар табылмады.',
      noShopOrdersYet: 'Дүкен тапсырыстары әлі жоқ.',
      hideProductTitle: 'Бұл тауарды дүкеннен жасыру керек пе?',
      showProductTitle: 'Бұл тауарды дүкенде көрсету керек пе?',
      hideProductDescription: (title) => `«${title}» тауары клиент дүкенінен жасырылады.`,
      showProductDescription: (title) => `«${title}» тауары клиент дүкенінде жарияланады.`,
      hideProduct: 'Тауарды жасыру',
      showProduct: 'Тауарды көрсету',
      cancel: 'Бас тарту',
    },
  }[language] || {
    pageTitle: 'Admin panel',
  };

  useEffect(() => {
    const u = currentUser();
    if (!u) { router.replace('/login'); return; }
    if (u.role !== 'admin') { router.replace('/dashboard'); return; }
    (async () => {
      setStats(await api.get('/api/admin/stats'));
      setUsers(await api.get('/api/admin/users'));
      setBookings(await api.get('/api/admin/bookings'));
      setOrders(await api.get('/api/admin/orders'));
      setSupportTickets(await api.get('/api/admin/support/tickets').catch(() => []));
      setProducts(await api.get('/api/admin/products'));
    })();
  }, [router]);

  useEffect(() => {
    const u = currentUser();
    if (!u || u.role !== 'admin') return;
    (async () => {
      setReviewOverview(await api.get('/api/admin/sitters/review-overview'));
      setPending(await api.get(`/api/admin/sitters/pending?status=${reviewFilter}${reviewSearch.trim() ? `&q=${encodeURIComponent(reviewSearch.trim())}` : ''}`));
    })();
  }, [reviewFilter, reviewSearch]);

  useEffect(() => {
    if (tab !== 'pending') return;
    if (!pending.length) {
      setSelectedPendingId(null);
      setSelectedPendingDetails(null);
      return;
    }
    if (!selectedPendingId || !pending.some((item) => item.id === selectedPendingId)) {
      setSelectedPendingId(pending[0].id);
    }
  }, [tab, pending, selectedPendingId]);

  useEffect(() => {
    if (tab !== 'pending' || !selectedPendingId) return;
    (async () => {
      const details = await api.get(`/api/admin/sitters/${selectedPendingId}/review`);
      setSelectedPendingDetails(details);
      setReviewChecklist({
        identity: false,
        services: false,
        contacts: false,
        pricing: false,
      });
      setReviewForm({
        status: details.review_status || 'new',
        admin_notes: details.admin_notes || '',
        rejection_reason: details.rejection_reason || '',
      });
    })();
  }, [tab, selectedPendingId]);

  async function toggleBlock(id, cur) {
    await api.put(`/api/admin/users/${id}/block`, { blocked: !cur });
    setUsers(await api.get('/api/admin/users'));
  }
  async function verify(id) {
    await api.put(`/api/admin/sitters/${id}/verify`, { verified: true });
    const nextPending = await api.get(`/api/admin/sitters/pending?status=${reviewFilter}`);
    setPending(nextPending);
  }

  async function reloadPending() {
    setPending(await api.get(`/api/admin/sitters/pending?status=${reviewFilter}${reviewSearch.trim() ? `&q=${encodeURIComponent(reviewSearch.trim())}` : ''}`));
    setReviewOverview(await api.get('/api/admin/sitters/review-overview'));
  }

  async function reloadProducts() {
    setProducts(await api.get('/api/admin/products'));
  }

  async function reloadOrders() {
    setOrders(await api.get('/api/admin/orders'));
  }

  async function reloadSupportTickets() {
    setSupportTickets(await api.get('/api/admin/support/tickets').catch(() => []));
  }

  function resetProductForm(clearStatus = true) {
    setProductForm(EMPTY_PRODUCT);
    setEditingProductId(null);
    if (clearStatus) {
      setProductError('');
      setProductSuccess('');
    }
  }

  function editProduct(product) {
    setEditingProductId(product.id);
    setProductForm({
      title: product.title || '',
      category: product.category || 'food',
      description: product.description || '',
      price: String(product.price ?? ''),
      stock: String(product.stock ?? ''),
      image_url: product.image_url || '',
      is_active: product.is_active,
    });
    setProductError('');
    setProductSuccess('');
    setTab('products');
  }

  async function saveProduct() {
    setProductError('');
    setProductSuccess('');

    if (!productForm.title.trim()) return setProductError(t.productTitleRequired);
    if (!productForm.description.trim()) return setProductError(t.productDescriptionRequired);
    if (!productForm.price || Number(productForm.price) <= 0) return setProductError(t.validPrice);
    if (Number(productForm.stock) < 0) return setProductError(t.stockCannotBeNegative);

    const payload = {
      title: productForm.title.trim(),
      category: productForm.category,
      description: productForm.description.trim(),
      price: Number(productForm.price),
      stock: Number(productForm.stock) || 0,
      image_url: productForm.image_url || null,
      is_active: productForm.is_active,
    };

    if (editingProductId) {
      await api.put(`/api/products/${editingProductId}`, payload);
      setProductSuccess(t.productUpdated);
    } else {
      await api.post('/api/products', payload);
      setProductSuccess(t.productCreated);
    }

    await reloadProducts();
    resetProductForm(false);
  }

  async function toggleProductActive(product) {
    await api.put(`/api/products/${product.id}`, { is_active: !product.is_active });
    setProductToggleDraft(null);
    await reloadProducts();
  }

  async function updateOrderStatus(orderId, status) {
    await api.put(`/api/admin/orders/${orderId}/status`, { status });
    await reloadOrders();
  }

  async function updateSupportTicket(ticketId) {
    await api.put(`/api/admin/support/tickets/${ticketId}`, {
      status: supportStatusDraft[ticketId],
      resolution_note: supportResolutionDraft[ticketId],
    });
    await reloadSupportTickets();
  }

  async function approveSelectedPending() {
    if (!selectedPendingDetails || !reviewReady) return;
    await api.put(`/api/admin/sitters/${selectedPendingDetails.id}/review`, {
      status: 'approved',
      admin_notes: reviewForm.admin_notes,
      rejection_reason: '',
    });
    await reloadPending();
    setSelectedPendingDetails(null);
  }

  async function saveReviewDecision(status) {
    if (!selectedPendingDetails) return;
    await api.put(`/api/admin/sitters/${selectedPendingDetails.id}/review`, {
      status,
      admin_notes: reviewForm.admin_notes,
      rejection_reason: reviewForm.rejection_reason,
    });
    await reloadPending();
    setSelectedPendingDetails(null);
  }

  const reviewReady = Object.values(reviewChecklist).every(Boolean);
  const todayKey = new Date().toISOString().slice(0, 10);
  const filteredBookings = bookings.filter((booking) => {
    const matchesStatus = bookingFilter === 'all'
      || (bookingFilter === 'today'
        ? todayKey >= booking.start_date?.slice(0, 10) && todayKey <= booking.end_date?.slice(0, 10)
        : booking.status === bookingFilter);
    const q = bookingSearch.trim().toLowerCase();
    const matchesSearch = !q || [booking.owner_name, booking.sitter_name, booking.pet_name, booking.service]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(q));
    return matchesStatus && matchesSearch;
  });
  const pendingTabLabel = pending.length ? t.pendingTabCount(pending.length) : t.pending;
  const reviewCounts = REVIEW_STATUSES.map((status) => ({
    status,
    count: reviewOverview.counts.find((entry) => entry.review_status === status)?.count || 0,
  }));

  async function handleProductPhotoChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setProductError(t.chooseImageFile);
      event.target.value = '';
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setProductError(t.photoSmallerThan5Mb);
      event.target.value = '';
      return;
    }

    try {
      const uploaded = await uploadFile('/api/uploads/document?kind=product-photo', file);
      setProductForm((prev) => ({ ...prev, image_url: uploaded.url }));
      setProductError('');
    } catch (err) {
      setProductError(err.message || t.failedProductPhotoUpload);
    }
    event.target.value = '';
  }

  return (
    <DashboardLayout title={t.pageTitle}>
      <nav className="flex gap-2 mb-6 flex-wrap">
        {[
          ['stats',    t.stats],
          ['users',    t.users],
          ['pending',  pendingTabLabel],
          ['bookings', t.allBookings],
          ['support',  t.support],
          ['orders',   t.shopOrders],
          ['products', t.products],
        ].map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)}
                  className={`btn text-sm ${tab === k ? 'btn-secondary' : 'btn-ghost'}`}>
            {label}
          </button>
        ))}
      </nav>

      {tab === 'stats' && stats && (
        <div className="grid sm:grid-cols-2 md:grid-cols-5 gap-4">
          {Object.entries(stats).map(([k, v]) => (
            <div key={k} className="card">
              <p className="text-xs uppercase tracking-[0.18em] opacity-55">{t.statMeta?.[k]?.label || k.replace('_', ' ')}</p>
              <div className="mt-3 text-4xl font-bold text-nanny-blue">{typeof v === 'number' && String(k).includes('rating') ? Number(v).toFixed(1) : v}</div>
              <p className="mt-2 text-sm opacity-70">{t.statMeta?.[k]?.description || t.platformKpi}</p>
            </div>
          ))}
        </div>
      )}

      {tab === 'support' && (
        <div className="space-y-4">
          {supportTickets.length === 0 && (
            <div className="card">
              <h3 className="font-bold text-nanny-deepOrange">{language === 'ru' ? 'Очередь поддержки' : language === 'kz' ? 'Қолдау кезегі' : 'Support queue'}</h3>
              <p className="mt-2 text-sm opacity-70">{language === 'ru' ? 'Обращений в поддержку пока нет.' : language === 'kz' ? 'Қолдау өтініштері әлі жоқ.' : 'No support tickets yet.'}</p>
            </div>
          )}
          {supportTickets.map((ticket) => (
            <article key={ticket.id} className="card">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-bold text-nanny-deepOrange">#{ticket.id} {ticket.subject}</h3>
                    <span className="badge bg-white text-nanny-brownish capitalize">{ticket.status.replace('_', ' ')}</span>
                    <span className="badge bg-nanny-yellow/80 text-nanny-brownish capitalize">{ticket.priority}</span>
                  </div>
                  <p className="mt-2 text-sm opacity-75">
                    {ticket.requester_name} · {ticket.requester_email}{ticket.requester_phone ? ` · ${ticket.requester_phone}` : ''}
                  </p>
                  <p className="mt-1 text-xs uppercase tracking-[0.18em] opacity-55">{ticket.category.replace('_', ' ')}</p>
                  <p className="mt-4 text-sm whitespace-pre-line">{ticket.body}</p>
                  {ticket.assigned_admin_name && (
                    <p className="mt-3 text-xs opacity-60">{language === 'ru' ? 'Назначено:' : language === 'kz' ? 'Жауапты:' : 'Assigned to:'} {ticket.assigned_admin_name}</p>
                  )}
                </div>
                <div className="w-full max-w-md space-y-3">
                  <select
                    className="input"
                    value={supportStatusDraft[ticket.id] || ticket.status}
                    onChange={(e) => setSupportStatusDraft((prev) => ({ ...prev, [ticket.id]: e.target.value }))}
                  >
                    {['open', 'in_progress', 'resolved', 'closed'].map((status) => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                  <textarea
                    className="input min-h-[112px]"
                    placeholder={language === 'ru' ? 'Заметка по решению для пользователя' : language === 'kz' ? 'Пайдаланушыға арналған шешім жазбасы' : 'Resolution note for the requester'}
                    value={supportResolutionDraft[ticket.id] ?? ticket.resolution_note ?? ''}
                    onChange={(e) => setSupportResolutionDraft((prev) => ({ ...prev, [ticket.id]: e.target.value }))}
                  />
                  <button type="button" onClick={() => updateSupportTicket(ticket.id)} className="btn-primary w-full">
                    {language === 'ru' ? 'Сохранить обновление' : language === 'kz' ? 'Жаңартуды сақтау' : 'Save support update'}
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {tab === 'users' && (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-nanny-deepOrange">
              <tr><th className="p-2">{language === 'ru' ? 'Имя' : language === 'kz' ? 'Аты' : 'Name'}</th><th>Email</th><th>{language === 'ru' ? 'Роль' : language === 'kz' ? 'Рөл' : 'Role'}</th><th>{language === 'ru' ? 'Статус' : language === 'kz' ? 'Күйі' : 'Status'}</th><th></th></tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-t border-nanny-orange/10">
                  <td className="p-2">{u.full_name}</td>
                  <td>{u.email}</td>
                  <td className="capitalize">{u.role}</td>
                  <td>
                    <span className={`badge ${u.is_blocked ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                      {u.is_blocked ? (language === 'ru' ? 'Заблокирован' : language === 'kz' ? 'Бұғатталған' : 'Blocked') : (language === 'ru' ? 'Активен' : language === 'kz' ? 'Белсенді' : 'Active')}
                    </span>
                  </td>
                  <td>
                    <button onClick={() => toggleBlock(u.id, u.is_blocked)} className="btn-ghost text-xs">
                      {u.is_blocked ? (language === 'ru' ? 'Разблокировать' : language === 'kz' ? 'Бұғаттан шығару' : 'Unblock') : (language === 'ru' ? 'Заблокировать' : language === 'kz' ? 'Бұғаттау' : 'Block')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'pending' && (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5 mb-6">
            {reviewCounts.map((item) => (
              <button
                key={item.status}
                onClick={() => setReviewFilter(item.status)}
                className={`card text-left transition ${reviewFilter === item.status ? 'ring-2 ring-nanny-orange' : ''}`}
              >
                <p className="text-xs uppercase tracking-[0.18em] opacity-60">{formatReviewStatusLabel(item.status)}</p>
                <p className="text-3xl font-bold text-nanny-blue mt-2">{item.count}</p>
              </button>
            ))}
          </div>

          {reviewOverview.actionItems.length > 0 && (
            <div className="card mb-6">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div>
                  <h3 className="font-bold text-nanny-deepOrange">Applications Needing Action Today</h3>
                  <p className="text-sm opacity-70 mt-1">{language === 'ru' ? 'Быстрый доступ к заявкам, которым сегодня нужно внимание модератора.' : language === 'kz' ? 'Бүгін модератор назарын қажет ететін өтінімдерге жылдам қолжеткізу.' : 'Quick access to applications that still need moderation attention.'}</p>
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {reviewOverview.actionItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setReviewFilter(item.review_status);
                      setSelectedPendingId(item.id);
                      setTab('pending');
                    }}
                    className="rounded-xl border border-nanny-orange/15 p-4 text-left hover:bg-nanny-orange/5"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-semibold">{item.full_name}</p>
                      <span className="badge bg-white text-nanny-brownish capitalize">{formatReviewStatusLabel(item.review_status)}</span>
                    </div>
                    <p className="text-xs opacity-70 mt-2">{item.email}</p>
                    <p className="text-xs opacity-60 mt-2">{language === 'ru' ? 'Создано:' : language === 'kz' ? 'Құрылған:' : 'Created:'} {new Date(item.created_at).toLocaleDateString()}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {pending.length === 0 ? (
            <div className="card">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <h3 className="font-bold text-nanny-deepOrange">Application review</h3>
                  <p className="text-sm opacity-70 mt-1">{language === 'ru' ? 'В выбранном статусе заявок нет.' : language === 'kz' ? 'Таңдалған күйде өтінімдер жоқ.' : 'No applications in the selected status.'}</p>
                </div>
                <select
                  className="input w-56"
                  value={reviewFilter}
                  onChange={(e) => setReviewFilter(e.target.value)}
                >
                  {REVIEW_STATUSES.map((status) => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>
            </div>
          ) : (
            <div className="grid gap-6 xl:grid-cols-[340px_1fr]">
              <div className="card">
                <div className="flex items-center justify-between gap-3 mb-4">
                  <div>
                    <h3 className="font-bold text-nanny-deepOrange">Review queue</h3>
                    <p className="text-sm opacity-70 mt-1">{language === 'ru' ? 'Выберите заявку ситтера для проверки перед одобрением.' : language === 'kz' ? 'Мақұлдау алдында тексеру үшін ситтер өтінімін таңдаңыз.' : 'Choose a sitter application to inspect before approval.'}</p>
                  </div>
                  <div className="flex flex-col gap-2">
                    <select
                      className="input w-40"
                      value={reviewFilter}
                      onChange={(e) => setReviewFilter(e.target.value)}
                    >
                      {REVIEW_STATUSES.map((status) => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </select>
                    <input
                      className="input w-40"
                      placeholder={language === 'ru' ? 'Поиск' : language === 'kz' ? 'Іздеу' : 'Search'}
                      value={reviewSearch}
                      onChange={(e) => setReviewSearch(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  {pending.map((s) => {
                    const active = s.id === selectedPendingId;
                    return (
                      <button
                        key={s.id}
                        onClick={() => setSelectedPendingId(s.id)}
                        className={`w-full rounded-xl border p-4 text-left transition ${
                          active
                            ? 'border-nanny-orange bg-nanny-orange/10'
                            : 'border-nanny-orange/15 hover:border-nanny-orange/40 hover:bg-nanny-orange/5'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold">{s.full_name}</p>
                            <p className="text-xs opacity-70 mt-1">{s.email}</p>
                          </div>
                          <span className="badge bg-white text-nanny-brownish capitalize">{s.review_status}</span>
                        </div>
                        <p className="text-xs opacity-70 mt-3">
                          {s.city}{s.district ? ` • ${s.district}` : ''} • {s.experience_yrs}{language === 'ru' ? ' г. опыта' : language === 'kz' ? ' ж. тәжірибе' : 'y exp'}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-6">
                {selectedPendingDetails && (
                  <>
                    <div className="card">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                          <div className="flex items-center gap-3">
                            <img
                              src={selectedPendingDetails.avatar_url || 'https://i.pravatar.cc/160?img=15'}
                              alt={selectedPendingDetails.full_name}
                              className="w-16 h-16 rounded-full object-cover border-4 border-nanny-orange/20"
                              onError={(event) => {
                                event.currentTarget.onerror = null;
                                event.currentTarget.src = 'https://i.pravatar.cc/160?img=15';
                              }}
                            />
                            <div>
                              <h3 className="text-xl font-bold text-nanny-deepOrange">{selectedPendingDetails.full_name}</h3>
                              <p className="text-sm opacity-70">{selectedPendingDetails.email}</p>
                              <p className="text-sm opacity-70">{selectedPendingDetails.phone || t.phoneNotProvided}</p>
                              <p className="text-xs mt-1">
                                <span className="badge bg-white text-nanny-brownish capitalize">{selectedPendingDetails.review_status}</span>
                              </p>
                            </div>
                          </div>
                          <div className="grid md:grid-cols-2 gap-3 mt-4 text-sm">
                            <p><span className="font-semibold">{language === 'ru' ? 'Город:' : language === 'kz' ? 'Қала:' : 'City:'}</span> {selectedPendingDetails.city}</p>
                            <p><span className="font-semibold">{language === 'ru' ? 'Район:' : language === 'kz' ? 'Аудан:' : 'District:'}</span> {selectedPendingDetails.district || t.notSpecified}</p>
                            <p><span className="font-semibold">{language === 'ru' ? 'Опыт:' : language === 'kz' ? 'Тәжірибе:' : 'Experience:'}</span> {selectedPendingDetails.experience_yrs} {t.yearsShort}</p>
                            <p><span className="font-semibold">{language === 'ru' ? 'Цена за день:' : language === 'kz' ? 'Күніне баға:' : 'Price per day:'}</span> {Number(selectedPendingDetails.price_per_day).toLocaleString()} ₸</p>
                          </div>
                        </div>

                        <div className="rounded-xl bg-nanny-orange/10 p-4 min-w-72">
                          <p className="font-semibold text-nanny-deepOrange">{language === 'ru' ? 'Чеклист одобрения' : language === 'kz' ? 'Мақұлдау чек-парағы' : 'Approval checklist'}</p>
                          <div className="mt-3 space-y-2 text-sm">
                            {[
                              ['identity', language === 'ru' ? 'Документ личности проверен' : language === 'kz' ? 'Жеке құжат тексерілді' : 'Identity document reviewed'],
                              ['services', language === 'ru' ? 'Услуги и описание проверены' : language === 'kz' ? 'Қызметтер мен сипаттама тексерілді' : 'Services and description checked'],
                              ['contacts', language === 'ru' ? 'Контактные данные заполнены' : language === 'kz' ? 'Байланыс деректері толық' : 'Contact details look complete'],
                              ['pricing', language === 'ru' ? 'Тарифы выглядят адекватно' : language === 'kz' ? 'Бағалар орынды көрінеді' : 'Pricing looks reasonable'],
                            ].map(([key, label]) => (
                              <label key={key} className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={reviewChecklist[key]}
                                  onChange={(e) => setReviewChecklist((prev) => ({ ...prev, [key]: e.target.checked }))}
                                />
                                {label}
                              </label>
                            ))}
                          </div>
                          <button
                            onClick={approveSelectedPending}
                            disabled={!reviewReady}
                            className="btn-primary mt-4 w-full disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {language === 'ru' ? 'Одобрить ситтера' : language === 'kz' ? 'Ситтерді мақұлдау' : 'Approve sitter'}
                          </button>
                          {!reviewReady && (
                            <p className="text-xs opacity-70 mt-2">{language === 'ru' ? 'Заполните чеклист перед одобрением.' : language === 'kz' ? 'Мақұлдаудан бұрын чек-парақты толтырыңыз.' : 'Complete the checklist before approval.'}</p>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-6 lg:grid-cols-2">
                      <div className="card">
                        <h4 className="font-bold text-nanny-deepOrange">{language === 'ru' ? 'Детали профиля' : language === 'kz' ? 'Профиль деректері' : 'Profile details'}</h4>
                        <p className="text-sm mt-3 whitespace-pre-line">{selectedPendingDetails.description || t.noDescriptionProvided}</p>

                        <div className="mt-4">
                          <p className="font-semibold text-sm mb-2">{language === 'ru' ? 'Услуги' : language === 'kz' ? 'Қызметтер' : 'Services'}</p>
                          {selectedPendingDetails.services?.length ? (
                            <div className="flex flex-wrap gap-2">
                              {selectedPendingDetails.services.map((service) => (
                                <span key={service.id} className="badge bg-nanny-yellow/80 text-nanny-brownish">
                                  {service.service}: {Number(service.price).toLocaleString()} ₸
                                </span>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm opacity-70">{t.noServicesAddedYet}</p>
                          )}
                        </div>
                      </div>

                      <div className="card">
                        <h4 className="font-bold text-nanny-deepOrange">{language === 'ru' ? 'Документ личности' : language === 'kz' ? 'Жеке құжат' : 'Identity document'}</h4>
                        {selectedPendingDetails.id_document_url ? (
                          <div className="mt-3 space-y-3">
                            {/\.pdf$/i.test(String(selectedPendingDetails.id_document_url)) ? (
                              <div className="rounded-xl border border-nanny-orange/15 bg-white p-4">
                                <p className="text-sm opacity-75">{t.pdfUploadedForManualReview}</p>
                                <a
                                  href={absoluteAssetUrl(selectedPendingDetails.id_document_url)}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="mt-3 inline-flex text-nanny-blue hover:underline text-sm"
                                >
                                  {t.openPdfDocument}
                                </a>
                              </div>
                            ) : (
                              <>
                                <img
                                  src={absoluteAssetUrl(selectedPendingDetails.id_document_url)}
                                  alt="Identity document"
                                  className="w-full h-64 rounded-xl object-contain border border-nanny-orange/15 bg-white"
                                />
                                <a
                                  href={absoluteAssetUrl(selectedPendingDetails.id_document_url)}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-nanny-blue hover:underline text-sm"
                                >
                                  {t.openFullDocument}
                                </a>
                              </>
                            )}
                          </div>
                        ) : (
                          <p className="text-sm opacity-70 mt-3">{t.noDocumentUploaded}</p>
                        )}
                      </div>
                    </div>

                    <div className="grid gap-6 lg:grid-cols-2">
                      <div className="card">
                        <h4 className="font-bold text-nanny-deepOrange">{language === 'ru' ? 'Детали проверки' : language === 'kz' ? 'Тексеру мәліметтері' : 'Admin review details'}</h4>
                        <div className="mt-3 space-y-3">
                          <select
                            className="input"
                            value={reviewForm.status}
                            onChange={(e) => setReviewForm((prev) => ({ ...prev, status: e.target.value }))}
                          >
                            {REVIEW_STATUSES.map((status) => (
                              <option key={status} value={status}>{status}</option>
                            ))}
                          </select>
                          <textarea
                            className="input"
                            rows={4}
                            placeholder={language === 'ru' ? 'Заметки администратора по этой заявке' : language === 'kz' ? 'Осы өтінім бойынша әкімші жазбалары' : 'Admin notes for this application'}
                            value={reviewForm.admin_notes}
                            onChange={(e) => setReviewForm((prev) => ({ ...prev, admin_notes: e.target.value }))}
                          />
                          <textarea
                            className="input"
                            rows={3}
                            placeholder={language === 'ru' ? 'Причина запроса изменений / отказа' : language === 'kz' ? 'Өзгеріс сұрау / бас тарту себебі' : 'Reason for request changes / rejection'}
                            value={reviewForm.rejection_reason}
                            onChange={(e) => setReviewForm((prev) => ({ ...prev, rejection_reason: e.target.value }))}
                          />
                          <div className="flex gap-2 flex-wrap">
                            <button
                              onClick={() => saveReviewDecision('in_review')}
                              className="btn-ghost text-sm"
                            >
                              {language === 'ru' ? 'Отметить как на проверке' : language === 'kz' ? 'Тексеруде деп белгілеу' : 'Mark in review'}
                            </button>
                            <button
                              onClick={() => saveReviewDecision('changes_requested')}
                              className="btn-ghost text-sm"
                            >
                              {language === 'ru' ? 'Запросить изменения' : language === 'kz' ? 'Өзгеріс сұрау' : 'Request changes'}
                            </button>
                            <button
                              onClick={() => saveReviewDecision('rejected')}
                              className="btn-ghost text-sm text-red-600"
                            >
                              {language === 'ru' ? 'Отклонить' : language === 'kz' ? 'Қабылдамау' : 'Reject'}
                            </button>
                          </div>
                          {selectedPendingDetails.admin_notes && (
                            <p className="text-sm opacity-70">
                              {t.latestSavedNote}: {selectedPendingDetails.admin_notes}
                            </p>
                          )}
                          {selectedPendingDetails.reviewed_at && (
                            <p className="text-xs opacity-60">
                              {t.lastReviewed}: {new Date(selectedPendingDetails.reviewed_at).toLocaleString()}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="card">
                        <h4 className="font-bold text-nanny-deepOrange">{language === 'ru' ? 'История проверки' : language === 'kz' ? 'Тексеру тарихы' : 'Review history'}</h4>
                        {selectedPendingDetails.history?.length ? (
                          <div className="mt-3 space-y-3">
                            {selectedPendingDetails.history.map((event) => (
                              <div key={event.id} className="relative rounded-xl border border-nanny-orange/15 p-3 pl-5">
                                <span className="absolute left-2 top-5 h-2 w-2 rounded-full bg-nanny-orange" />
                                <div className="flex items-center justify-between gap-3">
                                  <p className="font-semibold text-sm capitalize">{formatReviewStatusLabel(event.action)}</p>
                                  <span className="text-xs opacity-60">{new Date(event.created_at).toLocaleString()}</span>
                                </div>
                                <p className="text-xs opacity-70 mt-1">{t.by}: {event.actor_name || t.system}</p>
                                {event.note && <p className="text-sm mt-2 opacity-80">{event.note}</p>}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm opacity-70 mt-3">{t.noReviewHistoryYet}</p>
                        )}
                      </div>
                    </div>

                    <div className="card">
                      <h4 className="font-bold text-nanny-deepOrange">{language === 'ru' ? 'Публичный предпросмотр профиля' : language === 'kz' ? 'Профильдің ашық алдын ала көрінісі' : 'Public profile preview'}</h4>
                      {selectedPendingDetails.reviews?.length ? (
                        <div className="mt-3 space-y-3">
                          {selectedPendingDetails.reviews.map((review, index) => (
                            <div key={`${review.author}-${index}`} className="rounded-xl border border-nanny-orange/15 p-3">
                              <div className="flex items-center justify-between gap-3">
                                <p className="font-semibold text-sm">{review.author}</p>
                                <span className="badge bg-white text-nanny-brownish">★ {review.rating}</span>
                              </div>
                              <p className="text-sm mt-2 opacity-80">{review.body}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm opacity-70 mt-3">{t.noReviewsYetGoLive}</p>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {tab === 'bookings' && (
        <div className="space-y-5">
          <div className="card">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-nanny-deepOrange">Platform bookings</h3>
                <p className="text-sm opacity-70 mt-1">{language === 'ru' ? 'Следите за всей активностью бронирований, включая сегодняшние активные услуги.' : language === 'kz' ? 'Бүгінгі белсенді қызметтерді қоса, барлық бронь белсенділігін бақылаңыз.' : 'Track all booking activity, including today’s active services.'}</p>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  [language === 'ru' ? 'Все' : language === 'kz' ? 'Барлығы' : 'All', bookings.length],
                  [language === 'ru' ? 'Сегодня' : language === 'kz' ? 'Бүгін' : 'Today', bookings.filter((item) => todayKey >= item.start_date?.slice(0, 10) && todayKey <= item.end_date?.slice(0, 10)).length],
                  [language === 'ru' ? 'Ожидают' : language === 'kz' ? 'Күтуде' : 'Pending', bookings.filter((item) => item.status === 'pending').length],
                  [language === 'ru' ? 'Подтверждены' : language === 'kz' ? 'Расталған' : 'Confirmed', bookings.filter((item) => item.status === 'confirmed').length],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-2xl border border-nanny-orange/10 bg-white px-4 py-4">
                    <p className="text-xs uppercase tracking-[0.16em] opacity-45">{label}</p>
                    <p className="mt-2 text-2xl font-bold text-nanny-blue">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="card">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-nanny-deepOrange">Booking queue</h3>
                <p className="text-sm opacity-70 mt-1">{language === 'ru' ? 'Ищите по владельцу, ситтеру, питомцу или фокусируйтесь на сегодняшней активности.' : language === 'kz' ? 'Иесі, ситтері, жануары бойынша іздеңіз немесе бүгінгі белсенділікке назар аударыңыз.' : 'Search by owner, sitter, pet or focus on today’s activity.'}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {['all', 'today', 'pending', 'confirmed', 'completed', 'cancelled'].map((status) => (
                  <button
                    key={status}
                    onClick={() => setBookingFilter(status)}
                    className={`rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                      bookingFilter === status
                        ? 'bg-nanny-orange text-white shadow-sm'
                        : 'border border-nanny-orange/20 bg-white text-nanny-brownish hover:bg-[#fff8ef]'
                    }`}
                  >
                    {status}
                  </button>
                ))}
                <input
                  className="input w-56"
                  placeholder={language === 'ru' ? 'Поиск: владелец, ситтер, питомец' : language === 'kz' ? 'Іздеу: иесі, ситтер, жануар' : 'Search owner, sitter, pet'}
                  value={bookingSearch}
                  onChange={(e) => setBookingSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              {filteredBookings.map((b) => (
                <article key={b.id} className="rounded-[26px] border border-nanny-orange/12 bg-[#fffdf9] p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.16em] opacity-45">{language === 'ru' ? 'Бронь' : language === 'kz' ? 'Бронь' : 'Booking'} #{b.id}</p>
                      <h4 className="mt-2 text-lg font-bold text-nanny-brownish">{b.pet_name}</h4>
                      <p className="mt-1 text-sm opacity-70 capitalize">{String(b.service || '').replace(/_/g, ' ')}</p>
                    </div>
                    <span className={`badge ${
                      b.status === 'pending'
                        ? 'bg-[#fff1cf] text-[#8d5c0b] border border-[#f0d27d]'
                        : b.status === 'confirmed'
                          ? 'bg-[#eaf1ff] text-[#3158d6] border border-[#cddcff]'
                          : b.status === 'completed'
                            ? 'bg-[#e7f8ec] text-[#1c8b49] border border-[#bde8cb]'
                            : 'bg-[#ffe8e8] text-[#c54f4f] border border-[#f4bcbc]'
                    }`}>
                      {b.status}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <div className="rounded-2xl border border-nanny-orange/10 bg-white p-4 text-sm">
                      <p className="text-xs uppercase tracking-[0.16em] opacity-45">{language === 'ru' ? 'Владелец' : language === 'kz' ? 'Иесі' : 'Owner'}</p>
                      <p className="mt-2 font-semibold">{b.owner_name}</p>
                    </div>
                    <div className="rounded-2xl border border-nanny-orange/10 bg-white p-4 text-sm">
                      <p className="text-xs uppercase tracking-[0.16em] opacity-45">{language === 'ru' ? 'Ситтер' : language === 'kz' ? 'Ситтер' : 'Sitter'}</p>
                      <p className="mt-2 font-semibold">{b.sitter_name}</p>
                    </div>
                    <div className="rounded-2xl border border-nanny-orange/10 bg-white p-4 text-sm">
                      <p className="text-xs uppercase tracking-[0.16em] opacity-45">{language === 'ru' ? 'Даты' : language === 'kz' ? 'Күндер' : 'Dates'}</p>
                      <p className="mt-2 font-semibold">{b.start_date?.slice(0, 10)} → {b.end_date?.slice(0, 10)}</p>
                    </div>
                    <div className="rounded-2xl border border-nanny-orange/10 bg-white p-4 text-sm">
                      <p className="text-xs uppercase tracking-[0.16em] opacity-45">{language === 'ru' ? 'Время' : language === 'kz' ? 'Уақыт' : 'Time'}</p>
                      <p className="mt-2 font-semibold">{b.start_time && b.end_time ? `${String(b.start_time).slice(0,5)} → ${String(b.end_time).slice(0,5)}` : (language === 'ru' ? 'Не указано' : language === 'kz' ? 'Көрсетілмеген' : 'Not specified')}</p>
                    </div>
                  </div>

                  {b.notes && (
                    <div className="mt-4 rounded-2xl border border-nanny-orange/10 bg-white p-4 text-sm">
                      <p className="text-xs uppercase tracking-[0.16em] opacity-45">{language === 'ru' ? 'Заметки' : language === 'kz' ? 'Жазбалар' : 'Notes'}</p>
                      <p className="mt-2 leading-6 opacity-80">{b.notes}</p>
                    </div>
                  )}
                </article>
              ))}
              {!filteredBookings.length && (
                <div className="rounded-[28px] border border-dashed border-nanny-orange/18 bg-white/70 p-6 text-sm opacity-70">
                  {t.noBookingsMatch}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {tab === 'products' && (
        <div className="space-y-6">
          <div className="card">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="font-bold text-nanny-deepOrange">
                  {editingProductId
                    ? (language === 'ru' ? 'Редактировать товар' : language === 'kz' ? 'Тауарды өңдеу' : 'Edit product')
                    : (language === 'ru' ? 'Добавить товар' : language === 'kz' ? 'Жаңа тауар қосу' : 'Add new product')}
                </h3>
                <p className="text-sm opacity-70 mt-1">{language === 'ru' ? 'Создавайте товары магазина, загружайте фото, управляйте остатком и видимостью.' : language === 'kz' ? 'Дүкен тауарларын жасап, фото жүктеп, қалдық пен көрінуін басқарыңыз.' : 'Create shop items, upload product photos, manage stock and visibility.'}</p>
              </div>
              {(editingProductId || productForm.title || productForm.description || productForm.image_url) && (
                <button onClick={resetProductForm} className="btn-ghost text-sm">{language === 'ru' ? 'Очистить форму' : language === 'kz' ? 'Форманы тазалау' : 'Clear form'}</button>
              )}
            </div>

            <div className="grid md:grid-cols-2 gap-3">
              <input
                className="input"
                placeholder={language === 'ru' ? 'Название товара' : language === 'kz' ? 'Тауар атауы' : 'Product title'}
                value={productForm.title}
                onChange={(e) => setProductForm({ ...productForm, title: e.target.value })}
              />
              <select
                className="input"
                value={productForm.category}
                onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
              >
                <option value="food">{language === 'ru' ? 'Еда' : language === 'kz' ? 'Тағам' : 'Food'}</option>
                <option value="collar">{language === 'ru' ? 'Ошейник' : language === 'kz' ? 'Жаға' : 'Collar'}</option>
                <option value="toy">{language === 'ru' ? 'Игрушка' : language === 'kz' ? 'Ойыншық' : 'Toy'}</option>
                <option value="other">{language === 'ru' ? 'Другое' : language === 'kz' ? 'Басқа' : 'Other'}</option>
              </select>
              <input
                className="input"
                type="number"
                min="0"
                placeholder={language === 'ru' ? 'Цена' : language === 'kz' ? 'Баға' : 'Price'}
                value={productForm.price}
                onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
              />
              <input
                className="input"
                type="number"
                min="0"
                placeholder={language === 'ru' ? 'Остаток' : language === 'kz' ? 'Қалдық' : 'Stock'}
                value={productForm.stock}
                onChange={(e) => setProductForm({ ...productForm, stock: e.target.value })}
              />
            </div>

            <textarea
              className="input mt-3"
              rows={3}
              placeholder={language === 'ru' ? 'Описание товара' : language === 'kz' ? 'Тауар сипаттамасы' : 'Product description'}
              value={productForm.description}
              onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
            />

            <div className="mt-3 grid lg:grid-cols-[1fr_220px] gap-4 items-start">
              <div className="space-y-3">
                <label className="input flex items-center justify-between gap-3 cursor-pointer">
                  <span className="truncate text-sm opacity-70">
                    {productForm.image_url
                      ? (language === 'ru' ? 'Фото выбрано из медиатеки' : language === 'kz' ? 'Фото медиатекадан таңдалды' : 'Photo selected from media library')
                      : (language === 'ru' ? 'Выберите фото товара из медиатеки' : language === 'kz' ? 'Медиатекадан тауар фотосын таңдаңыз' : 'Choose product photo from media library')}
                  </span>
                  <span className="btn-ghost whitespace-nowrap px-3 py-1 text-sm">{language === 'ru' ? 'Загрузить' : language === 'kz' ? 'Жүктеу' : 'Upload'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleProductPhotoChange}
                  />
                </label>

                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={productForm.is_active}
                    onChange={(e) => setProductForm({ ...productForm, is_active: e.target.checked })}
                  />
                  {language === 'ru' ? 'Товар виден в магазине' : language === 'kz' ? 'Тауар дүкенде көрінеді' : 'Product is visible in the shop'}
                </label>

                {productError && <p className="text-sm text-red-600">{productError}</p>}
                {productSuccess && <p className="text-sm text-green-700">{productSuccess}</p>}

                <button onClick={saveProduct} className="btn-primary">
                  {editingProductId
                    ? (language === 'ru' ? 'Сохранить изменения' : language === 'kz' ? 'Өзгерістерді сақтау' : 'Save changes')
                    : (language === 'ru' ? 'Создать товар' : language === 'kz' ? 'Тауар жасау' : 'Create product')}
                </button>
              </div>

              <div className="rounded-xl border border-nanny-orange/20 p-3 bg-white">
                <p className="text-sm font-semibold text-nanny-deepOrange mb-3">{language === 'ru' ? 'Предпросмотр' : language === 'kz' ? 'Алдын ала көру' : 'Preview'}</p>
                {productForm.image_url ? (
                  <img
                    src={absoluteAssetUrl(productForm.image_url)}
                    alt={productForm.title || (language === 'ru' ? 'Предпросмотр товара' : language === 'kz' ? 'Тауардың алдын ала көрінісі' : 'Product preview')}
                    className="w-full h-40 rounded-lg object-cover"
                  />
                ) : (
                  <div className="h-40 rounded-lg bg-nanny-orange/10 flex items-center justify-center text-sm opacity-60">
                    {language === 'ru' ? 'Фото не выбрано' : language === 'kz' ? 'Фото таңдалмаған' : 'No photo selected'}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="card overflow-x-auto">
            <div className="flex items-center justify-between gap-3 mb-4">
              <h3 className="font-bold text-nanny-deepOrange">{language === 'ru' ? 'Товары магазина' : language === 'kz' ? 'Дүкен тауарлары' : 'Shop products'}</h3>
              <p className="text-sm opacity-70">{products.length} {language === 'ru' ? 'товаров' : language === 'kz' ? 'тауар' : 'products'}</p>
            </div>

            <table className="w-full text-sm">
              <thead className="text-left text-nanny-deepOrange">
                <tr>
                  <th className="p-2">{language === 'ru' ? 'Товар' : language === 'kz' ? 'Тауар' : 'Product'}</th>
                  <th>{language === 'ru' ? 'Категория' : language === 'kz' ? 'Санат' : 'Category'}</th>
                  <th>{language === 'ru' ? 'Цена' : language === 'kz' ? 'Баға' : 'Price'}</th>
                  <th>{language === 'ru' ? 'Остаток' : language === 'kz' ? 'Қалдық' : 'Stock'}</th>
                  <th>{language === 'ru' ? 'Статус' : language === 'kz' ? 'Күйі' : 'Status'}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.id} className="border-t border-nanny-orange/10 align-top">
                    <td className="p-2">
                      <div className="flex gap-3">
                        <img
                          src={absoluteAssetUrl(product.image_url)}
                          alt={product.title}
                          className="w-14 h-14 rounded-lg object-cover"
                          onError={handleProductImageError}
                        />
                        <div>
                          <p className="font-semibold">{product.title}</p>
                          <p className="text-xs opacity-70 max-w-xs">{product.description}</p>
                        </div>
                      </div>
                    </td>
                    <td className="capitalize">{product.category}</td>
                    <td>{Number(product.price).toLocaleString()} ₸</td>
                    <td>{product.stock}</td>
                    <td>
                      <span className={`badge ${product.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-700'}`}>
                        {product.is_active ? (language === 'ru' ? 'Виден' : language === 'kz' ? 'Көрінеді' : 'Visible') : (language === 'ru' ? 'Скрыт' : language === 'kz' ? 'Жасырын' : 'Hidden')}
                      </span>
                    </td>
                    <td>
                      <div className="flex gap-2">
                        <button onClick={() => editProduct(product)} className="btn-ghost text-xs">{language === 'ru' ? 'Редактировать' : language === 'kz' ? 'Өңдеу' : 'Edit'}</button>
                        <button onClick={() => setProductToggleDraft(product)} className="btn-ghost text-xs">
                          {product.is_active ? (language === 'ru' ? 'Скрыть' : language === 'kz' ? 'Жасыру' : 'Hide') : (language === 'ru' ? 'Показать' : language === 'kz' ? 'Көрсету' : 'Show')}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'orders' && (
        <div className="space-y-4">
          {orders.map((order) => (
            <div key={order.id} className="card">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="font-bold text-lg">{language === 'ru' ? 'Заказ' : language === 'kz' ? 'Тапсырыс' : 'Order'} #{order.id}</p>
                  <p className="text-sm opacity-70 mt-1">
                    {order.full_name} • {order.phone || (language === 'ru' ? 'телефон не указан' : language === 'kz' ? 'телефон көрсетілмеген' : 'no phone')} • {order.email}
                  </p>
                  <p className="text-xs opacity-60 mt-1">{new Date(order.created_at).toLocaleString()}</p>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                  <div className="font-bold text-nanny-deepOrange">{Number(order.total).toLocaleString()} ₸</div>
                  <span className="badge bg-nanny-blue/10 text-nanny-blue border border-nanny-blue/10">
                    {language === 'ru' ? 'Оплата' : language === 'kz' ? 'Төлем' : 'Payment'}: {order.payment_status || 'pending'}
                  </span>
                  <select
                    className="input min-w-40"
                    value={order.status}
                    onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                  >
                    {SHOP_ORDER_STATUSES.map((status) => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </div>
              </div>

              {order.address && (
                <div className="mt-4 rounded-xl bg-nanny-orange/10 p-3 text-sm whitespace-pre-line">
                  {order.address}
                </div>
              )}

              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <div className="rounded-xl border border-nanny-orange/15 bg-nanny-cream/40 p-3 text-sm">
                  <p className="text-xs uppercase tracking-[0.22em] opacity-50">{language === 'ru' ? 'Email для чека' : language === 'kz' ? 'Чекке арналған email' : 'Receipt email'}</p>
                  <p className="mt-1 font-semibold">{order.customer_email || order.email}</p>
                </div>
                <div className="rounded-xl border border-nanny-orange/15 bg-nanny-cream/40 p-3 text-sm">
                  <p className="text-xs uppercase tracking-[0.22em] opacity-50">{language === 'ru' ? 'Способ оплаты' : language === 'kz' ? 'Төлем тәсілі' : 'Payment method'}</p>
                  <p className="mt-1 font-semibold">{order.payment_method || (language === 'ru' ? 'карта' : language === 'kz' ? 'карта' : 'card')}</p>
                </div>
                <div className="rounded-xl border border-nanny-orange/15 bg-nanny-cream/40 p-3 text-sm">
                  <p className="text-xs uppercase tracking-[0.22em] opacity-50">{language === 'ru' ? 'Карта' : language === 'kz' ? 'Карта' : 'Card'}</p>
                  <p className="mt-1 font-semibold">{order.payment_last4 ? `•••• ${order.payment_last4}` : (language === 'ru' ? 'Скрыто' : language === 'kz' ? 'Жасырылған' : 'Hidden')}</p>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                {order.items?.map((item) => (
                  <div key={item.id} className="flex gap-3 items-center border-t border-nanny-orange/10 pt-3 first:border-t-0 first:pt-0">
                    <img
                      src={absoluteAssetUrl(item.image_url)}
                      alt={item.title}
                      className="w-14 h-14 rounded-lg object-cover"
                      onError={handleProductImageError}
                    />
                    <div className="flex-1">
                      <p className="font-semibold">{item.title}</p>
                      <p className="text-xs opacity-70">{language === 'ru' ? 'Кол-во' : language === 'kz' ? 'Саны' : 'Qty'}: {item.quantity}</p>
                    </div>
                    <div className="text-sm font-semibold">
                      {(Number(item.unit_price) * item.quantity).toLocaleString()} ₸
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {orders.length === 0 && (
            <div className="card">
              <p className="opacity-70">{t.noShopOrdersYet}</p>
            </div>
          )}
        </div>
      )}

      <ConfirmModal
        open={Boolean(productToggleDraft)}
        title={productToggleDraft?.is_active ? t.hideProductTitle : t.showProductTitle}
        description={productToggleDraft ? (productToggleDraft.is_active ? t.hideProductDescription(productToggleDraft.title) : t.showProductDescription(productToggleDraft.title)) : ''}
        confirmLabel={productToggleDraft?.is_active ? t.hideProduct : t.showProduct}
        cancelLabel={t.cancel}
        tone={productToggleDraft?.is_active ? 'danger' : 'primary'}
        onClose={() => setProductToggleDraft(null)}
        onConfirm={() => toggleProductActive(productToggleDraft)}
      />
    </DashboardLayout>
  );
}
