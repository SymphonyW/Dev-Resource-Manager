import type {PageDefinition, PageId} from '../types/navigation';
import type {Translator} from '../services/i18n';

interface SidebarProps {
    activePageId: PageId;
    bridgeStatus: string;
    pages: PageDefinition[];
    t: Translator;
    onSelectPage: (pageId: PageId) => void;
}

function Sidebar({activePageId, bridgeStatus, pages, t, onSelectPage}: SidebarProps) {
    return (
        <aside className="sidebar" aria-label={t('sidebar.navigation')}>
            <nav className="nav-list">
                {pages.map((page) => (
                    <button
                        key={page.id}
                        className="nav-item"
                        type="button"
                        aria-current={activePageId === page.id ? 'page' : undefined}
                        onClick={() => onSelectPage(page.id)}
                    >
                        {page.label}
                    </button>
                ))}
            </nav>

            <div className="bridge-status">
                <span className="status-dot" aria-hidden="true"/>
                <span>{bridgeStatus}</span>
            </div>
        </aside>
    );
}

export default Sidebar;
