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

const appName = import.meta.env.VITE_APP_NAME || 'CheckITSE';

/**
 * Inertia envuelve la página en el layout recibido como `children`, por lo que el
 * layout no es un `ComponentType<{}>` sino una función que recibe el árbol de la
 * página ya resuelto.
 */
type PageLayout = (page: React.ReactNode) => React.ReactElement;

/**
 * Evita títulos redundantes: si la página no aporta título, si ya coincide con el
 * nombre de la aplicación, o si el nombre ya está incluido, no se vuelve a anexar.
 */
function buildTitle(title?: string): string {
    if (!title) {
        return appName;
    }

    return title === appName || title.includes(appName) ? title : `${title} - ${appName}`;
}

createInertiaApp({
    title: buildTitle,
    resolve: async (name) => {
        const pageModule = await resolvePageComponent(`./pages/${name}.tsx`, import.meta.glob('./pages/**/*.tsx'));
        const page = pageModule as { default: { layout?: PageLayout } };

        if (name !== 'Evaluacion/InformePreventivo') {
            page.default.layout = page.default.layout ?? ((children: React.ReactNode) => <AppLayout>{children}</AppLayout>);
        }

        return pageModule;
    },
    setup({ el, App, props }) {
        const root = createRoot(el);

        root.render(<App {...props} />);
    },
    progress: {
        color: 'var(--color-danger-900)',
    },
});

// This will set light / dark mode on load...
initializeTheme();
