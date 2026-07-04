import {FormEvent, useCallback, useEffect, useState} from 'react';
import StatusMessage from '../components/StatusMessage';
import {
    addCustomProtectedProcessName,
    deleteCustomProtectedProcessName,
    loadProtectionSettings,
} from '../services/settings';
import {languages, type LanguageCode, type Translator} from '../services/i18n';
import type {PageDefinition} from '../types/navigation';
import type {ProtectionSettings} from '../types/settings';

const settingsRefreshIntervalMs = 10000;

interface SettingsPageProps {
    language: LanguageCode;
    page: PageDefinition;
    t: Translator;
    onLanguageChange: (language: LanguageCode) => void;
}

const emptyProtectionSettings: ProtectionSettings = {
    defaultProcessNames: [],
    customProcessNames: [],
};

function SettingsPage({language, page, t, onLanguageChange}: SettingsPageProps) {
    const [settings, setSettings] = useState<ProtectionSettings>(emptyProtectionSettings);
    const [customName, setCustomName] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [operationMessage, setOperationMessage] = useState('');

    const loadSettings = useCallback(async (showLoading = true) => {
        if (showLoading) {
            setIsLoading(true);
        }
        setErrorMessage('');

        try {
            const nextSettings = await loadProtectionSettings();
            setSettings(nextSettings);
        } catch {
            setSettings(emptyProtectionSettings);
            setErrorMessage(t('settings.errorLoad'));
        } finally {
            if (showLoading) {
                setIsLoading(false);
            }
        }
    }, [t]);

    useEffect(() => {
        void loadSettings(true);
        const intervalId = window.setInterval(() => {
            void loadSettings(false);
        }, settingsRefreshIntervalMs);

        return () => window.clearInterval(intervalId);
    }, [loadSettings]);

    const handleAddCustomProcess = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        const nextName = customName.trim();
        if (nextName === '') {
            setErrorMessage(t('settings.customNameEmpty'));
            return;
        }

        setIsSaving(true);
        setErrorMessage('');
        setOperationMessage('');

        try {
            const nextSettings = await addCustomProtectedProcessName(nextName);
            setSettings(nextSettings);
            setCustomName('');
            setOperationMessage(t('settings.operationAdded'));
        } catch {
            setErrorMessage(t('settings.errorAdd'));
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteCustomProcess = async (name: string) => {
        setIsSaving(true);
        setErrorMessage('');
        setOperationMessage('');

        try {
            const nextSettings = await deleteCustomProtectedProcessName(name);
            setSettings(nextSettings);
            setOperationMessage(t('settings.operationRemoved'));
        } catch {
            setErrorMessage(t('settings.errorDelete'));
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <section className="page-panel settings-page" aria-labelledby={`${page.id}-title`}>
            <div className="page-header compact-page-header">
                <div>
                    <p className="eyebrow">{page.eyebrow}</p>
                    <h1 id={`${page.id}-title`}>{page.title}</h1>
                    <p className="page-description">{page.description}</p>
                </div>
            </div>

            <div className="settings-preferences-row">
                <section className="settings-section settings-preferences" aria-labelledby="settings-preferences-title">
                    <div className="settings-section-header">
                        <h2 id="settings-preferences-title">{t('settings.preferences.title')}</h2>
                    </div>
                    <div className="settings-preference-body">
                        <label className="filter-field">
                            <span>{t('settings.language.label')}</span>
                            <select
                                aria-label={t('settings.language.label')}
                                value={language}
                                onChange={(event) => onLanguageChange(event.target.value as LanguageCode)}
                            >
                                {languages.map((option) => (
                                    <option key={option.code} value={option.code}>{option.label}</option>
                                ))}
                            </select>
                        </label>
                        <p>{t('settings.language.help')}</p>
                    </div>
                </section>
            </div>

            <form className="settings-add-form" onSubmit={handleAddCustomProcess}>
                <label className="filter-field">
                    <span>{t('settings.customProcessName')}</span>
                    <input
                        aria-label={t('settings.customProcessName')}
                        value={customName}
                        onChange={(event) => setCustomName(event.target.value)}
                        placeholder="node.exe"
                        disabled={isSaving}
                    />
                </label>
                <button
                    aria-label={t('settings.addCustom')}
                    className="primary-action-button"
                    type="submit"
                    disabled={isSaving}
                >
                    {t('common.add')}
                </button>
            </form>

            {errorMessage && <StatusMessage variant="error">{errorMessage}</StatusMessage>}
            {operationMessage && <StatusMessage variant="success">{operationMessage}</StatusMessage>}
            {isLoading && <StatusMessage variant="loading">{t('settings.loading')}</StatusMessage>}

            {!isLoading && (
                <div className="settings-grid">
                    <section className="settings-section" aria-labelledby="default-protection-title">
                        <div className="settings-section-header">
                            <h2 id="default-protection-title">{t('settings.defaultProcesses')}</h2>
                            <span className="settings-count">{settings.defaultProcessNames.length}</span>
                        </div>
                        <ul className="protection-list" aria-label={t('settings.defaultProcesses')}>
                            {settings.defaultProcessNames.map((name) => (
                                <li className="protection-list-row" key={name}>
                                    <span className="mono">{name}</span>
                                    <span className="protected-badge">{t('badge.default')}</span>
                                </li>
                            ))}
                        </ul>
                    </section>

                    <section className="settings-section" aria-labelledby="custom-protection-title">
                        <div className="settings-section-header">
                            <h2 id="custom-protection-title">{t('settings.customProcesses')}</h2>
                            <span className="settings-count">{settings.customProcessNames.length}</span>
                        </div>
                        {settings.customProcessNames.length === 0 ? (
                            <StatusMessage variant="empty">{t('settings.customEmpty')}</StatusMessage>
                        ) : (
                            <ul className="protection-list" aria-label={t('settings.customProcesses')}>
                                {settings.customProcessNames.map((name) => (
                                    <li className="protection-list-row" key={name}>
                                        <span className="mono">{name}</span>
                                        <button
                                            aria-label={`${t('settings.deleteCustom')} ${name}`}
                                            className="danger-button table-action-button"
                                            type="button"
                                            onClick={() => void handleDeleteCustomProcess(name)}
                                            disabled={isSaving}
                                        >
                                            {t('common.delete')}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>
                </div>
            )}
        </section>
    );
}

export default SettingsPage;
