import Navbar from './Navbar';
import Sidebar from './Sidebar';
import { useLanguage } from '../lib/i18n';

export default function DashboardLayout({ children, title }) {
  const { translateTitle } = useLanguage();
  return (
    <>
      <Navbar />
      <div className="flex min-h-[calc(100vh-86px)]">
        <Sidebar />
        <main className="min-h-0 min-w-0 flex-1 p-6 lg:p-10">
          {title && <h1 className="text-2xl lg:text-3xl font-bold text-nanny-blue mb-6">{translateTitle(title)}</h1>}
          <div className="mx-auto h-full min-h-0 w-full max-w-6xl">{children}</div>
        </main>
      </div>
    </>
  );
}
