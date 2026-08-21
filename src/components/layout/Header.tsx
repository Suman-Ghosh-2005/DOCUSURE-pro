import Link from 'next/link';
import { ShieldCheck, FileSearch, UserCheck, LayoutDashboard } from 'lucide-react';

export function Header() {
  return (
    <header className="sticky top-0 z-50 bg-slate-900 text-white border-b border-slate-800 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo & Name */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-md group-hover:bg-blue-500 transition-colors">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xl font-bold tracking-tight text-white flex items-center gap-1.5">
              DOCUSURE
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-400/30">
                MVP
              </span>
            </span>
            <p className="text-xs text-slate-400 font-normal">
              Intelligent Government Document Verification
            </p>
          </div>
        </Link>

        {/* Navigation Links */}
        <nav className="flex items-center gap-1 sm:gap-2">
          <Link
            href="/"
            className="px-3 py-2 text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800 rounded-md transition-colors flex items-center gap-1.5"
          >
            <FileSearch className="w-4 h-4 text-slate-400" />
            <span>Overview</span>
          </Link>

          <Link
            href="/apply"
            className="px-3 py-2 text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800 rounded-md transition-colors flex items-center gap-1.5"
          >
            <UserCheck className="w-4 h-4 text-slate-400" />
            <span>New Application</span>
          </Link>

          <Link
            href="/officer/dashboard"
            className="ml-2 px-3.5 py-1.5 text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white rounded-md transition-colors shadow-sm flex items-center gap-1.5"
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Officer Portal</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}
