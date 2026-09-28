import { Navbar } from '@/components/Navbar';
import { FooterLegal } from '@/components/FooterLegal';

interface AppLayoutProps {
    children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
    return (
        <div className="flex min-h-screen flex-col bg-[#FAFAFA] text-neutral-900 font-sans antialiased print:bg-white">
            <a
                href="#main-content"
                className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-xl focus:bg-primary-700 focus:px-4 focus:py-2.5 focus:text-xs focus:font-bold focus:text-white focus:shadow-lg focus:ring-2 focus:ring-primary-500 focus:outline-none"
            >
                Saltar al contenido principal
            </a>

            <div className="print:hidden">
                <Navbar />
            </div>

            <main
                id="main-content"
                tabIndex={-1}
                className="mx-auto w-full max-w-7xl flex-1 px-6 py-10 print:max-w-none print:p-0"
            >
                {children}
            </main>

            <div className="print:hidden">
                <FooterLegal />
            </div>
        </div>
    );
}
