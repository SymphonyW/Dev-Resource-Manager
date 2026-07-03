import type {PageDefinition} from '../types/navigation';
import CleanupPage from './CleanupPage';
import DashboardPage from './DashboardPage';
import LogsPage from './LogsPage';
import PortsPage from './PortsPage';
import ProcessesPage from './ProcessesPage';
import SettingsPage from './SettingsPage';

interface PagePanelProps {
    page: PageDefinition;
}

function PagePanel({page}: PagePanelProps) {
    if (page.id === 'dashboard') {
        return <DashboardPage page={page}/>;
    }

    if (page.id === 'processes') {
        return <ProcessesPage page={page}/>;
    }

    if (page.id === 'ports') {
        return <PortsPage page={page}/>;
    }

    if (page.id === 'cleanup') {
        return <CleanupPage page={page}/>;
    }

    if (page.id === 'logs') {
        return <LogsPage page={page}/>;
    }

    if (page.id === 'settings') {
        return <SettingsPage page={page}/>;
    }

    return (
        <section className="page-panel" aria-labelledby={`${page.id}-title`}>
            <p className="eyebrow">Dev Resource Manager</p>
            <h1 id={`${page.id}-title`}>{page.title}</h1>
            <p className="page-description">{page.description}</p>
            <div className="page-empty-state">
                <span>Ready for implementation</span>
                <p>Backend data and actions will be connected in later feature steps.</p>
            </div>
        </section>
    );
}

export default PagePanel;
