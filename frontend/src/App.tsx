import {useEffect, useState} from 'react';
import './App.css';
import Sidebar from './components/Sidebar';
import PagePanel from './pages/PagePanel';
import {defaultPageId, getPageById, pages} from './services/pages';
import type {PageId} from './types/navigation';
import {AppName} from '../wailsjs/go/main/App';

function App() {
    const [appName, setAppName] = useState('Dev Resource Manager');
    const [bridgeStatus, setBridgeStatus] = useState('Connecting');
    const [activePageId, setActivePageId] = useState<PageId>(defaultPageId);

    useEffect(() => {
        AppName()
            .then((name) => {
                setAppName(name);
                setBridgeStatus('Connected');
            })
            .catch(() => setBridgeStatus('Unavailable'));
    }, []);

    const activePage = getPageById(activePageId);

    return (
        <div className="app-shell">
            <Sidebar
                appName={appName}
                activePageId={activePageId}
                bridgeStatus={bridgeStatus}
                pages={pages}
                onSelectPage={setActivePageId}
            />
            <main className="main-content">
                <PagePanel page={activePage}/>
            </main>
        </div>
    );
}

export default App;
