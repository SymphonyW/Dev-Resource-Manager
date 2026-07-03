import type {PageDefinition} from '../types/navigation';
import DashboardPage from './DashboardPage';

interface PagePanelProps {
    page: PageDefinition;
}

function PagePanel({page}: PagePanelProps) {
    if (page.id === 'dashboard') {
        return <DashboardPage page={page}/>;
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
