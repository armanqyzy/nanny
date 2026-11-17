// Russian wording for notifications, emails and Telegram. The site's main audience reads Russian,
// and these texts are stored as they are, so they are written once here.
const SERVICES = {
  walking: 'прогулка', daycare: 'дневной присмотр', boarding: 'передержка', grooming: 'груминг',
  home_visit: 'визит на дом', medication_care: 'помощь с лекарствами',
};
const ORDER_STATUSES = { new: 'новый', paid: 'оплачен', shipped: 'отправлен', delivered: 'доставлен', cancelled: 'отменён' };
const TICKET_STATUSES = { open: 'открыт', in_progress: 'в работе', resolved: 'решён', closed: 'закрыт' };
const CANCEL_REASONS = {
  plans_changed: 'изменились планы', found_other_sitter: 'нашёл(ла) другого ситтера',
  sitter_not_responding: 'ситтер не отвечает', pet_health: 'питомец заболел',
  not_available: 'занят(а) в эти даты', cannot_handle_pet: 'не сможет ухаживать за этим питомцем',
  emergency: 'непредвиденные обстоятельства', owner_not_responding: 'владелец не отвечает',
  expired: 'не подтверждено вовремя', other: 'другое',
};

const serviceRu = (service) => SERVICES[service] || String(service || '').replace(/_/g, ' ');
const orderStatusRu = (status) => ORDER_STATUSES[status] || status;
const ticketStatusRu = (status) => TICKET_STATUSES[status] || String(status || '').replace(/_/g, ' ');
const cancelReasonRu = (reason) => CANCEL_REASONS[reason] || String(reason || '').replace(/_/g, ' ');

function dateRu(value) {
  const text = value instanceof Date
    ? `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`
    : String(value).slice(0, 10);
  const [y, m, d] = text.split('-');
  return `${d}.${m}.${y}`;
}

const money = (value) => `${Number(value || 0).toLocaleString('ru-RU')} ₸`;

module.exports = { serviceRu, orderStatusRu, ticketStatusRu, cancelReasonRu, dateRu, money };
