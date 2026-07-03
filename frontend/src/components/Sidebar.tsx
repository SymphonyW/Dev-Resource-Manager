import type {PageDefinition, PageId} from '../types/navigation';

interface SidebarProps {
    appName: string;
    activePageId: PageId;
    bridgeStatus: string;
    pages: PageDefinition[];
    onSelectPage: (pageId: PageId) => void;
}

function Sidebar({appName, activePageId, bridgeStatus, pages, onSelectPage}: SidebarProps) {
    return (
        <aside className="sidebar" aria-label="Primary navigation">
            <div className="brand">
                <span className="brand-mark">DR</span>
                <div>
                    <p className="brand-kicker">Desktop</p>
                    <strong>{appName}</strong>
                </div>
            </div>

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
