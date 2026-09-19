import {useEffect, useMemo, useState} from 'react';
import './App.css';
import Sidebar from './components/Sidebar';
import PagePanel from './pages/PagePanel';
import {
    createTranslator,
    languageStorageKey,
    resolveInitialLanguage,
    type LanguageCode,
} from './services/i18n';
import {defaultPageId, getPageById, getPages} from './services/pages';
import type {PageId} from './types/navigation';

function App() {
    const [activePageId, setActivePageId] = useState<PageId>(defaultPageId);
    const [language, setLanguage] = useState<LanguageCode>(() => resolveInitialLanguage());

    const t = useMemo(() => createTranslator(language), [language]);
    const pages = useMemo(() => getPages(t), [t]);

    useEffect(() => {
        document.documentElement.lang = language === 'zh' ? 'zh-CN' : 'en';
    }, [language]);

    const activePage = getPageById(activePageId, pages);

    const handleLanguageChange = (nextLanguage: LanguageCode) => {
        setLanguage(nextLanguage);
        window.localStorage.setItem(languageStorageKey, nextLanguage);
    };

    return (
        <div className="app-shell">
            <Sidebar
                activePageId={activePageId}
                pages={pages}
                t={t}
                onSelectPage={setActivePageId}
            />
            <main className="main-content">
                <header className="workspace-header">
                    <h1>{activePage.label}</h1>
                </header>
                <div className="workspace-body" key={activePageId}>
                    <PagePanel
                        language={language}
                        page={activePage}
                        t={t}
                        onLanguageChange={handleLanguageChange}
                    />
                </div>
            </main>
        </div>
    );
}

export default App;
