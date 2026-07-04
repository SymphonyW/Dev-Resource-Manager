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
import {AppName} from '../wailsjs/go/main/App';

type BridgeStatus = 'connecting' | 'connected' | 'unavailable';

function App() {
    const [bridgeStatus, setBridgeStatus] = useState<BridgeStatus>('connecting');
    const [activePageId, setActivePageId] = useState<PageId>(defaultPageId);
    const [language, setLanguage] = useState<LanguageCode>(() => resolveInitialLanguage());

    const t = useMemo(() => createTranslator(language), [language]);
    const pages = useMemo(() => getPages(t), [t]);

    useEffect(() => {
        AppName()
            .then(() => {
                setBridgeStatus('connected');
            })
            .catch(() => setBridgeStatus('unavailable'));
    }, []);

    const activePage = getPageById(activePageId, pages);
    const bridgeStatusLabel = bridgeStatus === 'connected'
        ? t('bridge.connected')
        : bridgeStatus === 'unavailable'
            ? t('bridge.unavailable')
            : t('bridge.connecting');

    const handleLanguageChange = (nextLanguage: LanguageCode) => {
        setLanguage(nextLanguage);
        window.localStorage.setItem(languageStorageKey, nextLanguage);
    };

    return (
        <div className="app-shell">
            <Sidebar
                activePageId={activePageId}
                bridgeStatus={bridgeStatusLabel}
                pages={pages}
                t={t}
                onSelectPage={setActivePageId}
            />
            <main className="main-content">
                <PagePanel
                    language={language}
                    page={activePage}
                    t={t}
                    onLanguageChange={handleLanguageChange}
                />
            </main>
        </div>
    );
}

export default App;
