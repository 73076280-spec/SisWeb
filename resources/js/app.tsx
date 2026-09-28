import '../css/app.css';

import React from 'react';
import { createInertiaApp } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { createRoot } from 'react-dom/client';
import { route as routeFn } from 'ziggy-js';
import { initializeTheme } from './hooks/use-appearance';
import AppLayout from './layouts/AppLayout';

declare global {
    const route: typeof routeFn;
}

const appName = import.meta.env.VITE_APP_NAME || 'Laravel';

createInertiaApp({
    title: (title) => `${title} - ${appName}`,
    resolve: (name) =>
        resolvePageComponent(`./pages/${name}.tsx`, import.meta.glob('./pages/**/*.tsx')).then((pageModule) => {
            const page = pageModule as { default: { layout?: React.ComponentType } };

            if (name !== 'Evaluacion/InformePreventivo') {
                page.default.layout = page.default.layout ?? ((page: React.ReactNode) => <AppLayout>{page}</AppLayout>);
            }

            return pageModule;
        }),
    setup({ el, App, props }) {
        const root = createRoot(el);

        root.render(<App {...props} />);
    },
    progress: {
        color: '#2563eb',
    },
});

// This will set light / dark mode on load...
initializeTheme();
