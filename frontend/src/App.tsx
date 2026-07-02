import {useEffect, useState} from 'react';
import './App.css';
import {AppName} from '../wailsjs/go/main/App';

function App() {
    const [appName, setAppName] = useState('Dev Resource Manager');
    const [bridgeStatus, setBridgeStatus] = useState('Connecting');

    useEffect(() => {
        AppName()
            .then((name) => {
                setAppName(name);
                setBridgeStatus('Connected');
            })
            .catch(() => setBridgeStatus('Unavailable'));
    }, []);

    return (
        <main className="app-shell">
            <section className="workspace">
                <header className="topbar">
                    <div>
                        <p className="eyebrow">Desktop resource console</p>
                        <h1>{appName}</h1>
                    </div>
                    <span className="status">{bridgeStatus}</span>
                </header>
            </section>
        </main>
    );
}

export default App;
