import React from 'react';
import { Metadata } from 'next';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import KioskScreen from '@/components/kiosk/KioskScreen';
import { generateKioskToken } from '@/lib/totp';
import { Building2, AlertTriangle, ArrowLeft, ShieldAlert } from 'lucide-react';

export const dynamic = 'force-dynamic';

interface KioskParams {
  params: {
    companySlug: string;
  };
}

export async function generateMetadata({ params }: KioskParams): Promise<Metadata> {
  const supabase = createClient();
  const { data: company } = await supabase
    .from('companies')
    .select('name')
    .eq('slug', params.companySlug)
    .eq('subscription_status', 'active')
    .maybeSingle();

  if (company?.name) {
    return {
      title: `${company.name} | Anti-Cheat Kiosk`,
      description: `Dynamic TOTP QR Code screen for ${company.name} institutional attendance check-ins.`,
    };
  }

  return {
    title: 'Anti-Cheat Kiosk | Attendance Web App',
    description: 'Dynamic TOTP QR Code screen for institutional attendance check-ins.',
  };
}

export default async function DynamicKioskPage({ params }: KioskParams) {
  const { companySlug } = params;
  const supabase = createClient();

  // Fetch the company from public.companies where slug = params.companySlug and subscription_status = 'active'
  const { data: company, error } = await supabase
    .from('companies')
    .select('id, name, slug, subscription_status')
    .eq('slug', companySlug)
    .eq('subscription_status', 'active')
    .maybeSingle();

  if (error || !company) {
    return (
      <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col justify-between font-sans">
        {/* Navigation Header */}
        <header className="border-b bg-white px-6 py-3 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-600">
              <Building2 size={20} className="text-teal-600" />
            </div>
            <div>
              <span className="text-sm font-bold text-gray-900 tracking-tight">
                Attendance Hub
              </span>
              <p className="text-[11px] text-gray-500 font-normal">
                Multi-Tenant Kiosk Gateway
              </p>
            </div>
          </div>

          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-gray-900 px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-100 transition shadow-sm"
          >
            <ArrowLeft size={13} />
            <span>Return Home</span>
          </Link>
        </header>

        {/* Not Found / Inactive Card */}
        <main className="flex-1 max-w-md mx-auto w-full p-6 my-auto flex flex-col justify-center">
          <div className="bg-white border border-gray-200 rounded-xl p-8 shadow-sm text-center">
            <div className="w-14 h-14 bg-amber-50 border border-amber-200 rounded-full flex items-center justify-center mx-auto text-amber-600 mb-4 shadow-sm">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <h1 className="text-lg font-bold text-gray-900 mb-1.5">
              Organization Unavailable
            </h1>

            <p className="text-xs text-gray-600 mb-6 leading-relaxed">
              The organization <code className="bg-gray-100 px-1.5 py-0.5 rounded font-mono font-semibold text-gray-800">{companySlug}</code> could not be found or does not have an active subscription status.
            </p>

            <div className="flex flex-col gap-2.5">
              <Link
                href="/kiosk/default"
                className="w-full py-2.5 bg-black hover:bg-gray-800 text-white font-semibold text-xs rounded-lg transition shadow-sm text-center"
              >
                Go to Default Organization Kiosk
              </Link>
              <Link
                href="/"
                className="w-full py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium text-xs rounded-lg transition text-center"
              >
                Return to Landing Page
              </Link>
            </div>
          </div>
        </main>

        <footer className="p-4 text-center border-t border-gray-200 bg-white">
          <p className="text-[10px] text-gray-400 flex items-center justify-center gap-1">
            <ShieldAlert className="w-3 h-3 text-amber-600" />
            Tenant Isolation &bull; Active Subscription Enforced
          </p>
        </footer>
      </div>
    );
  }

  // Embed the company_id inside the generated TOTP payload or metadata
  const initialToken = generateKioskToken(company.id);

  return (
    <KioskScreen
      company={company}
      initialToken={initialToken}
    />
  );
}
