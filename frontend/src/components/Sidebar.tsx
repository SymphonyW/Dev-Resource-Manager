import {useState} from 'react';
import Icon from './Icon';
import type {PageDefinition, PageId} from '../types/navigation';
import type {Translator} from '../services/i18n';

interface SidebarProps {
    activePageId: PageId;
    pages: PageDefinition[];
    t: Translator;
    onSelectPage: (pageId: PageId) => void;
}

function Sidebar({activePageId, pages, t, onSelectPage}: SidebarProps) {
    const [collapsed, setCollapsed] = useState(false);
    return (
        <aside className={collapsed ? 'sidebar is-collapsed' : 'sidebar'} aria-label={t('sidebar.navigation')}>
            <div className="sidebar-brand">
                <span className="app-mark"><Icon name="app" size={22}/></span>
                <span className="brand-label">OpenEnd</span>
            </div>
            <button className="nav-toggle" type="button" aria-label={t('sidebar.toggle')} aria-expanded={!collapsed} onClick={() => setCollapsed(!collapsed)}>
                <Icon name="menu" size={18}/>
            </button>
            <nav className="nav-list">
                {pages.map((page) => (
                    <button
                        key={page.id}
                        className={page.id === 'settings' ? 'nav-item nav-settings' : 'nav-item'}
                        type="button"
                        title={page.label}
                        aria-label={page.label}
                        aria-current={activePageId === page.id ? 'page' : undefined}
                        onClick={() => onSelectPage(page.id)}
                    >
                        <Icon name={page.id}/>
                        <span className="nav-label">{page.label}</span>
                    </button>
                ))}
            </nav>
        </aside>
    );
}

export default Sidebar;
