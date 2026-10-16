import { ArrowRight, Clock, Sparkles, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';

const sampleCategories = [
  { id: '1', name: 'Dairy, Bread & Eggs', icon: '🥛', color: 'bg-amber-50 text-amber-700' },
  { id: '2', name: 'Fresh Fruits & Veggies', icon: '🥑', color: 'bg-green-50 text-green-700' },
  { id: '3', name: 'Snacks & Munchies', icon: '🍿', color: 'bg-orange-50 text-orange-700' },
  { id: '4', name: 'Beverages & Juices', icon: '🧃', color: 'bg-blue-50 text-blue-700' },
  { id: '5', name: 'Atta, Rice & Dals', icon: '🌾', color: 'bg-yellow-50 text-yellow-800' },
  { id: '6', name: 'Instant & Frozen Food', icon: '🍜', color: 'bg-red-50 text-red-700' },
];

export const HomePage = () => {
  return (
    <div className="space-y-8">
      {/* Hero Delivery Banner */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-brand-600 to-brand-700 text-white p-6 sm:p-10 shadow-sm">
        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm text-xs font-bold uppercase tracking-wide">
            <Sparkles className="w-3.5 h-3.5 text-accent-500 fill-accent-500" />
            <span>Lightning Fast Delivery</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
            Groceries delivered in{' '}
            <span className="text-accent-500 underline decoration-white/40">10 minutes</span>
          </h1>

          <p className="text-brand-100 text-sm sm:text-base font-medium max-w-lg">
            Fresh vegetables, dairy essentials, snacks, and household staples picked with care and
            brought straight to your doorstep.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-4">
            <Link
              to="/categories"
              className="inline-flex items-center gap-2 bg-white text-brand-700 font-extrabold px-6 py-3 rounded-2xl text-sm shadow hover:bg-brand-50 transition-all focus:outline-none focus:ring-2 focus:ring-white"
            >
              <span>Explore Categories</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <div className="flex items-center gap-2 text-xs font-semibold text-brand-100">
              <Clock className="w-4 h-4 text-accent-500" />
              <span>Instant packing from nearest dark store</span>
            </div>
          </div>
        </div>

        {/* Decorative lightning background watermark */}
        <div className="absolute right-4 -bottom-10 opacity-10 pointer-events-none select-none">
          <Zap className="w-72 h-72" />
        </div>
      </section>

      {/* Categories Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black text-gray-900 tracking-tight">Shop by Category</h2>
            <p className="text-xs text-gray-500 font-medium">Everything your home needs today</p>
          </div>
          <Link
            to="/categories"
            className="text-xs font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1"
          >
            <span>See all</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 sm:gap-4">
          {sampleCategories.map((cat) => (
            <div
              key={cat.id}
              className="group p-4 bg-white rounded-2xl border border-gray-100 hover:border-brand-200 hover:shadow-sm transition-all text-center flex flex-col items-center justify-center cursor-pointer"
            >
              <div
                className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl mb-2.5 transition-transform group-hover:scale-110 ${cat.color}`}
              >
                {cat.icon}
              </div>
              <span className="text-xs font-bold text-gray-800 line-clamp-2 leading-tight">
                {cat.name}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Delivery Guarantee Card */}
      <section className="bg-brand-50 border border-brand-100 rounded-2xl p-4 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-600 text-white flex items-center justify-center shrink-0">
            <Zap className="w-5 h-5 fill-current" />
          </div>
          <div>
            <h3 className="text-sm font-black text-brand-900">Why choose Zippy?</h3>
            <p className="text-xs text-brand-700">
              No minimum order, guaranteed fresh expiry dates, and real-time live rider tracking.
            </p>
          </div>
        </div>
        <div className="text-xs font-bold text-brand-800 bg-white px-3 py-1.5 rounded-lg border border-brand-200">
          Dark-store direct
        </div>
      </section>
    </div>
  );
};

export default HomePage;
