import { ShieldCheck, Truck, Zap } from 'lucide-react';

export const Footer = () => {
  return (
    <footer className="bg-white dark:bg-slate-900 border-t border-gray-100 dark:border-slate-800 mt-12 pb-20 sm:pb-8 text-gray-600 dark:text-slate-400 text-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Value Propositions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pb-8 border-b border-gray-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-950/60 flex items-center justify-center text-brand-600 dark:text-brand-400 shrink-0">
              <Zap className="w-5 h-5 fill-current" />
            </div>
            <div>
              <h4 className="font-bold text-gray-900 dark:text-slate-100">10-Minute Delivery</h4>
              <p className="text-xs text-gray-500 dark:text-slate-400">
                Superfast delivery straight to your doorstep.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-950/60 flex items-center justify-center text-brand-600 dark:text-brand-400 shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-gray-900 dark:text-slate-100">Best Quality & Prices</h4>
              <p className="text-xs text-gray-500 dark:text-slate-400">
                Fresh vegetables, fruits, and dairy at supermarket rates.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-950/60 flex items-center justify-center text-brand-600 dark:text-brand-400 shrink-0">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-gray-900 dark:text-slate-100">Free & Safe Shipping</h4>
              <p className="text-xs text-gray-500 dark:text-slate-400">
                Zero contact delivery options available anytime.
              </p>
            </div>
          </div>
        </div>

        {/* Copyright and Brand Footer */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-400 dark:text-slate-500">
          <p>© {new Date().getFullYear()} Zippy Commerce Technologies. All rights reserved.</p>
          {/* <p className="flex items-center gap-1">
            Engineered with{' '}
            <span className="text-brand-600 dark:text-brand-400 font-bold">
              React 18 + Vite + Tailwind
            </span>
          </p> */}
        </div>
      </div>
    </footer>
  );
};
