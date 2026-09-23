import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import DashboardLayout from '../../components/DashboardLayout';
import { absoluteAssetUrl, api, currentUser } from '../../lib/api';
import { STORE_INFO, handleProductImageError } from '../../lib/shop';
import { useLanguage } from '../../lib/i18n';

export default function ProductDetails() {
  const { language } = useLanguage();
  const router = useRouter();
  const { id } = router.query;
  const [product, setProduct] = useState(null);
  const [related, setRelated] = useState([]);
  const [cart, setCart] = useState({});
  const t = {
    en: { inStock: 'in stock', outOfStock: 'Out of stock', needHelp: 'Need help before ordering?', shop: 'Shop:', address: 'Address:', phone: 'Phone:', hours: 'Hours:', addToCart: 'Add to cart', unavailable: 'Unavailable', buyNow: 'Buy now', backToShop: 'Back to shop', moreIn: 'More in', seeAll: 'See all' },
    ru: { inStock: 'в наличии', outOfStock: 'Нет в наличии', needHelp: 'Нужна помощь перед заказом?', shop: 'Магазин:', address: 'Адрес:', phone: 'Телефон:', hours: 'Часы:', addToCart: 'Добавить в корзину', unavailable: 'Недоступно', buyNow: 'Купить сейчас', backToShop: 'Назад в магазин', moreIn: 'Ещё в категории', seeAll: 'Смотреть всё' },
    kz: { inStock: 'қоймада бар', outOfStock: 'Қолжетімсіз', needHelp: 'Тапсырыс алдында көмек керек пе?', shop: 'Дүкен:', address: 'Мекенжай:', phone: 'Телефон:', hours: 'Сағаттар:', addToCart: 'Себетке қосу', unavailable: 'Қолжетімсіз', buyNow: 'Қазір сатып алу', backToShop: 'Дүкенге оралу', moreIn: 'Осы санаттағы тағы', seeAll: 'Барлығын көру' },
  }[language] || {};

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const item = await api.get(`/api/products/${id}`);
        setProduct(item);
        const relatedItems = await api.get(`/api/products?category=${item.category}`);
        setRelated(relatedItems.filter((entry) => entry.id !== item.id).slice(0, 3));
      } catch {
        router.replace('/shop');
      }
    })();
  }, [id, router]);

  useEffect(() => {
    const raw = typeof window !== 'undefined' && localStorage.getItem('nanny_cart');
    if (raw) setCart(JSON.parse(raw));
  }, []);

  function addToCart() {
    if (!product) return;
    const next = { ...cart, [product.id]: { product, qty: (cart[product.id]?.qty || 0) + 1 } };
    setCart(next);
    localStorage.setItem('nanny_cart', JSON.stringify(next));
  }

  function goCheckout() {
    if (!currentUser()) {
      router.push('/login');
      return;
    }
    router.push('/shop/cart');
  }

  if (!product) return null;

  return (
    <DashboardLayout title={product.title}>
      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="card p-0 overflow-hidden">
          <img
            src={absoluteAssetUrl(product.image_url)}
            alt={product.title}
            className="h-[340px] w-full object-cover"
            onError={handleProductImageError}
          />
        </div>

        <div className="card">
          <div className="flex items-center justify-between gap-3">
            <span className="badge bg-nanny-yellow/80 text-nanny-brownish capitalize">{product.category}</span>
            <span className={`badge inline-flex shrink-0 whitespace-nowrap ${product.stock > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {product.stock > 0 ? `${product.stock} ${t.inStock || 'in stock'}` : (t.outOfStock || 'Out of stock')}
            </span>
          </div>

          <p className="mt-4 text-3xl font-bold text-nanny-deepOrange">{Number(product.price).toLocaleString()} ₸</p>
          <p className="mt-4 text-base">{product.description}</p>

          <div className="mt-6 rounded-xl bg-nanny-orange/10 p-4 text-sm">
            <p className="font-semibold text-nanny-deepOrange">{t.needHelp || 'Need help before ordering?'}</p>
            <p className="mt-2"><span className="font-semibold">{t.shop || 'Shop:'}</span> {STORE_INFO.name}</p>
            <p><span className="font-semibold">{t.address || 'Address:'}</span> {STORE_INFO.address}</p>
            <p><span className="font-semibold">{t.phone || 'Phone:'}</span> <a className="text-nanny-blue hover:underline" href={`tel:${STORE_INFO.phone}`}>{STORE_INFO.phone}</a></p>
            <p><span className="font-semibold">{t.hours || 'Hours:'}</span> {STORE_INFO.hours}</p>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={addToCart}
              className="btn-secondary"
              disabled={product.stock <= 0}
            >
              {product.stock > 0 ? (t.addToCart || 'Add to cart') : (t.unavailable || 'Unavailable')}
            </button>
            <button
              onClick={goCheckout}
              className="btn-primary"
              disabled={product.stock <= 0}
            >
              {t.buyNow || 'Buy now'}
            </button>
            <Link href="/shop" className="btn-ghost">{t.backToShop || 'Back to shop'}</Link>
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-nanny-deepOrange">{t.moreIn || 'More in'} {product.category}</h2>
            <Link href={`/shop?category=${product.category}`} className="text-nanny-blue hover:underline">
              {t.seeAll || 'See all'}
            </Link>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((item) => (
              <Link key={item.id} href={`/shop/${item.id}`} className="card p-0 overflow-hidden block">
                <img
                  src={absoluteAssetUrl(item.image_url)}
                  alt={item.title}
                  className="h-40 w-full object-cover"
                  onError={handleProductImageError}
                />
                <div className="p-4">
                  <p className="font-semibold">{item.title}</p>
                  <p className="text-sm opacity-70 mt-1 line-clamp-2">{item.description}</p>
                  <p className="mt-3 font-bold text-nanny-deepOrange">{Number(item.price).toLocaleString()} ₸</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </DashboardLayout>
  );
}
