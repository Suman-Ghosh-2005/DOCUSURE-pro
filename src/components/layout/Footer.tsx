import { AlertCircle } from 'lucide-react';

export function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-400 border-t border-slate-800 py-8 px-4 sm:px-6 lg:px-8 mt-auto">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-2 text-slate-400">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
          <span>
            <strong>Synthetic Data Disclaimer:</strong> All identities, document values, and scheme information are simulated for hackathon demonstration. No real citizen data or government APIs are connected.
          </span>
        </div>

        <div className="text-slate-500 whitespace-nowrap">
          DOCUSURE Platform &copy; 2026 — Smart India Hackathon Prep
        </div>
      </div>
    </footer>
  );
}
