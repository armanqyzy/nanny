import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import DashboardLayout from '../../components/DashboardLayout';
import { absoluteAssetUrl, api, currentUser } from '../../lib/api';
import { STORE_INFO, handleProductImageError } from '../../lib/shop';
import Icon from '../../components/Icon';
import { useLanguage } from '../../lib/i18n';

export default function Shop() {
  const { language } = useLanguage();
  const router = useRouter();
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState({});
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [maxPrice, setMaxPrice] = useState('');

  useEffect(() => { load(); }, [category, search]);

  useEffect(() => {
    if (!router.isReady) return;
    const queryCategory = typeof router.query.category === 'string' ? router.query.category : '';
    if (queryCategory && queryCategory !== category) {
      setCategory(queryCategory);
    }
  }, [router.isReady, router.query.category, category]);

  useEffect(() => {
    const raw = typeof window !== 'undefined' && localStorage.getItem('nanny_cart');
    if (raw) setCart(JSON.parse(raw));
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') localStorage.setItem('nanny_cart', JSON.stringify(cart));
  }, [cart]);

  async function load() {
    const params = new URLSearchParams();
    if (category) params.set('category', category);
    if (search.trim()) params.set('q', search.trim());
    const qs = params.toString() ? `?${params.toString()}` : '';
    setProducts(await api.get('/api/products' + qs));
  }

  function addToCart(p) {
    setCart({ ...cart, [p.id]: { product: p, qty: (cart[p.id]?.qty || 0) + 1 } });
  }

  function setQty(product, qty) {
    const next = { ...cart };
    if (qty <= 0) delete next[product.id];
    else next[product.id] = { product, qty };
    setCart(next);
  }

  function goCheckout() {
    if (!currentUser()) { router.push('/login'); return; }
    router.push('/shop/cart');
  }

  const filteredProducts = products.filter((product) => {
    if (onlyAvailable && product.stock <= 0) return false;
    if (maxPrice && Number(product.price) > Number(maxPrice)) return false;
    return true;
  });

  const cartCount = Object.values(cart).reduce((a, b) => a + b.qty, 0);
  const copy = {
    en: {
      supportEyebrow: 'Shop support',
      location: 'Location:',
      phone: 'Phone:',
      workingHours: 'Working hours:',
      delivery: 'Delivery:',
      myOrders: 'My orders',
      shopSupport: 'Shop support',
      viewOrders: 'View orders',
      cart: 'Cart',
      all: 'All',
      searchProducts: 'Search products',
      onlyAvailable: 'Only show available items',
      maxPrice: 'Max price',
      resetFilters: 'Reset filters',
      productsShown: 'products shown',
      inStock: 'in stock',
      outOfStock: 'Out of stock',
      details: 'Details',
      add: 'Add',
      unavailable: 'Unavailable',
      noProducts: 'No products found',
      noProductsText: 'Try another category or search query.',
      afterCheckout: 'After checkout',
      trackTitle: 'Track every shop order in one place',
      trackText: 'Once you pay, the order appears on your orders page with status, payment info, delivery address and shop contact details.',
      openOrders: 'Open my orders',
      categories: {
        '': 'All',
        food: 'Food',
        collar: 'Collars',
        toy: 'Toys',
      },
    },
    ru: {
      supportEyebrow: 'Поддержка магазина',
      location: 'Адрес:',
      phone: 'Телефон:',
      workingHours: 'Часы работы:',
      delivery: 'Доставка:',
      myOrders: 'Мои заказы',
      shopSupport: 'Поддержка магазина',
      viewOrders: 'Смотреть заказы',
      cart: 'Корзина',
      all: 'Все',
      searchProducts: 'Поиск товаров',
      onlyAvailable: 'Показывать только товары в наличии',
      maxPrice: 'Макс. цена',
      resetFilters: 'Сбросить фильтры',
      productsShown: 'товаров показано',
      inStock: 'в наличии',
      outOfStock: 'Нет в наличии',
      details: 'Подробнее',
      add: 'Добавить',
      unavailable: 'Недоступно',
      noProducts: 'Товары не найдены',
      noProductsText: 'Попробуйте другую категорию или поисковый запрос.',
      afterCheckout: 'После оплаты',
      trackTitle: 'Следите за всеми заказами магазина в одном месте',
      trackText: 'После оплаты заказ появится на странице заказов со статусом, информацией об оплате, адресом доставки и контактами магазина.',
      openOrders: 'Открыть мои заказы',
      categories: {
        '': 'Все',
        food: 'Корм',
        collar: 'Ошейники',
        toy: 'Игрушки',
      },
    },
    kz: {
      supportEyebrow: 'Дүкен қолдауы',
      location: 'Мекенжай:',
      phone: 'Телефон:',
      workingHours: 'Жұмыс уақыты:',
      delivery: 'Жеткізу:',
      myOrders: 'Менің тапсырыстарым',
      shopSupport: 'Дүкен қолдауы',
      viewOrders: 'Тапсырыстарды көру',
      cart: 'Себет',
      all: 'Барлығы',
      searchProducts: 'Тауар іздеу',
      onlyAvailable: 'Тек қолжетімді тауарларды көрсету',
      maxPrice: 'Макс. баға',
      resetFilters: 'Сүзгілерді тазалау',
      productsShown: 'тауар көрсетілді',
      inStock: 'қоймада бар',
      outOfStock: 'Қолжетімсіз',
      details: 'Толығырақ',
      add: 'Қосу',
      unavailable: 'Қолжетімсіз',
      noProducts: 'Тауар табылмады',
      noProductsText: 'Басқа санатты не іздеу сұрауын байқап көріңіз.',
      afterCheckout: 'Төлемнен кейін',
      trackTitle: 'Барлық дүкен тапсырысын бір жерден бақылаңыз',
      trackText: 'Төлемнен кейін тапсырыс мәртебесімен, төлем ақпаратымен, жеткізу мекенжайымен және дүкен байланыстарымен бірге тапсырыстар бетінде көрінеді.',
      openOrders: 'Менің тапсырыстарымды ашу',
      categories: {
        '': 'Барлығы',
        food: 'Жем',
        collar: 'Жаға',
        toy: 'Ойыншықтар',
      },
    },
  }[language] || {
    supportEyebrow: 'Shop support',
    location: 'Location:',
    phone: 'Phone:',
    workingHours: 'Working hours:',
    delivery: 'Delivery:',
    myOrders: 'My orders',
    shopSupport: 'Shop support',
    viewOrders: 'View orders',
    cart: 'Cart',
    all: 'All',
    searchProducts: 'Search products',
    onlyAvailable: 'Only show available items',
    maxPrice: 'Max price',
    resetFilters: 'Reset filters',
    productsShown: 'products shown',
    inStock: 'in stock',
    outOfStock: 'Out of stock',
    details: 'Details',
    add: 'Add',
    unavailable: 'Unavailable',
    noProducts: 'No products found',
    noProductsText: 'Try another category or search query.',
    afterCheckout: 'After checkout',
    trackTitle: 'Track every shop order in one place',
    trackText: 'Once you pay, the order appears on your orders page with status, payment info, delivery address and shop contact details.',
    openOrders: 'Open my orders',
    categories: { '': 'All', food: 'Food', collar: 'Collars', toy: 'Toys' },
  };

  return (
    <DashboardLayout title="Pet shop">
      <section className="card mb-6 bg-white/90">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-nanny-deepOrange/70">{copy.supportEyebrow}</p>
              <h2 className="text-2xl font-bold text-nanny-deepOrange">{STORE_INFO.name}</h2>
            </div>
            <div className="grid gap-2 text-sm md:grid-cols-2">
              <p><span className="font-semibold">{copy.location}</span> {STORE_INFO.address}</p>
              <p><span className="font-semibold">{copy.phone}</span> <a className="text-nanny-blue hover:underline" href={`tel:${STORE_INFO.phone}`}>{STORE_INFO.phone}</a></p>
              <p><span className="font-semibold">{copy.workingHours}</span> {STORE_INFO.hours}</p>
              <p><span className="font-semibold">{copy.delivery}</span> {STORE_INFO.deliveryNote}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button onClick={() => router.push('/shop/orders')} className="btn-ghost">
                <span className="inline-flex items-center gap-2">
                  <Icon name="booking" className="h-4 w-4" />
                  {copy.myOrders}
                </span>
              </button>
              <button onClick={() => router.push('/support')} className="btn-ghost">
                <span className="inline-flex items-center gap-2">
                  <Icon name="support" className="h-4 w-4" />
                  {copy.shopSupport}
                </span>
              </button>
            </div>
          </div>
          <div className="flex flex-wrap gap-3 self-start lg:self-auto">
            <button onClick={() => router.push('/shop/orders')} className="btn-ghost">
              {copy.viewOrders}
            </button>
            <button onClick={goCheckout} className="btn-primary" disabled={cartCount === 0}>
              <span className="inline-flex items-center gap-2">
                <Icon name="shop" className="h-4 w-4" />
                {copy.cart} ({cartCount})
              </span>
            </button>
          </div>
        </div>
      </section>

      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <div className="flex gap-2 flex-wrap">
          {['', 'food', 'collar', 'toy'].map((c) => (
            <button key={c}
                    className={`btn text-sm ${category === c ? 'btn-secondary' : 'btn-ghost'}`}
                    onClick={() => setCategory(c)}>
              {copy.categories[c] || c || copy.all}
            </button>
          ))}
        </div>
        <input
          className="input w-full sm:w-72"
          placeholder={copy.searchProducts}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="card mb-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3 flex-wrap">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={onlyAvailable}
                onChange={(e) => setOnlyAvailable(e.target.checked)}
              />
              {copy.onlyAvailable}
            </label>
            <input
              className="input w-44"
              type="number"
              min="0"
              placeholder={copy.maxPrice}
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
            />
            {(onlyAvailable || maxPrice) && (
              <button
                onClick={() => {
                  setOnlyAvailable(false);
                  setMaxPrice('');
                }}
                className="btn-ghost text-sm"
              >
                {copy.resetFilters}
              </button>
            )}
          </div>
          <p className="text-sm opacity-70">{filteredProducts.length} {copy.productsShown}</p>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-5">
        {filteredProducts.map((p) => (
          <div key={p.id} className="card p-0 overflow-hidden flex flex-col">
            <Link href={`/shop/${p.id}`} className="block">
              <img
                src={absoluteAssetUrl(p.image_url)}
                alt={p.title}
                className="w-full h-40 object-cover"
                onError={handleProductImageError}
              />
            </Link>
            <div className="p-4 flex flex-col flex-1">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <Link href={`/shop/${p.id}`} className="font-bold hover:text-nanny-blue">
                    {p.title}
                  </Link>
                  <p className="text-xs opacity-70 capitalize">{p.category}</p>
                </div>
                <span className={`badge inline-flex shrink-0 whitespace-nowrap ${p.stock > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {p.stock > 0 ? `${p.stock} ${copy.inStock}` : copy.outOfStock}
                </span>
              </div>
              <p className="text-sm mt-1 flex-1">{p.description}</p>
              <div className="mt-3 flex items-center justify-between">
                <span className="font-bold text-nanny-deepOrange">{Number(p.price).toLocaleString()} ₸</span>
                <div className="flex items-center gap-2">
                  <Link href={`/shop/${p.id}`} className="btn-ghost text-sm">{copy.details}</Link>
                  {cart[p.id]?.qty ? (
                    <div className="flex items-center rounded-xl border border-nanny-orange/25 bg-white">
                      <button
                        type="button"
                        className="px-3 py-2 text-sm font-bold text-nanny-deepOrange"
                        onClick={() => setQty(p, cart[p.id].qty - 1)}
                      >
                        -
                      </button>
                      <span className="min-w-[38px] text-center text-sm font-semibold">{cart[p.id].qty}</span>
                      <button
                        type="button"
                        className="px-3 py-2 text-sm font-bold text-nanny-deepOrange disabled:opacity-40"
                        onClick={() => setQty(p, cart[p.id].qty + 1)}
                        disabled={cart[p.id].qty >= p.stock}
                      >
                        +
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => addToCart(p)}
                      className="btn-secondary text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={p.stock <= 0}
                    >
                      {p.stock > 0 ? copy.add : copy.unavailable}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredProducts.length === 0 && (
        <div className="card mt-4 text-center">
          <p className="font-semibold text-nanny-deepOrange">{copy.noProducts}</p>
          <p className="text-sm opacity-70 mt-1">{copy.noProductsText}</p>
        </div>
      )}

      <div className="card mt-8 bg-gradient-to-r from-white to-[#fff7ee]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-nanny-brownish/45">{copy.afterCheckout}</p>
            <h3 className="mt-2 text-xl font-bold text-nanny-deepOrange">{copy.trackTitle}</h3>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-nanny-brownish/75">
              {copy.trackText}
            </p>
          </div>
          <Link href="/shop/orders" className="btn-secondary">
            <span className="inline-flex items-center gap-2">
              <Icon name="booking" className="h-4 w-4" />
              {copy.openOrders}
            </span>
          </Link>
        </div>
      </div>
    </DashboardLayout>
  );
}
