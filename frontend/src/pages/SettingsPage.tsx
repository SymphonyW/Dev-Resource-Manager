import {FormEvent, useCallback, useEffect, useState} from 'react';
import StatusMessage from '../components/StatusMessage';
import {
    addCustomProtectedProcessName,
    deleteCustomProtectedProcessName,
    loadProtectionSettings,
} from '../services/settings';
import type {PageDefinition} from '../types/navigation';
import type {ProtectionSettings} from '../types/settings';

interface SettingsPageProps {
    page: PageDefinition;
}

const emptyProtectionSettings: ProtectionSettings = {
    defaultProcessNames: [],
    customProcessNames: [],
};

function SettingsPage({page}: SettingsPageProps) {
    const [settings, setSettings] = useState<ProtectionSettings>(emptyProtectionSettings);
    const [customName, setCustomName] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [operationMessage, setOperationMessage] = useState('');

    const loadSettings = useCallback(async () => {
        setIsLoading(true);
        setErrorMessage('');

        try {
            const nextSettings = await loadProtectionSettings();
            setSettings(nextSettings);
        } catch {
            setSettings(emptyProtectionSettings);
            setErrorMessage('Unable to load protection settings.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        void loadSettings();
    }, [loadSettings]);

    const handleAddCustomProcess = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        const nextName = customName.trim();
        if (nextName === '') {
            setErrorMessage('Custom protected process name cannot be empty.');
            return;
        }

        setIsSaving(true);
        setErrorMessage('');
        setOperationMessage('');

        try {
            const nextSettings = await addCustomProtectedProcessName(nextName);
            setSettings(nextSettings);
            setCustomName('');
            setOperationMessage('Custom protected process added.');
        } catch {
            setErrorMessage('Unable to add custom protected process.');
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
            setOperationMessage('Custom protected process removed.');
        } catch {
            setErrorMessage('Unable to remove custom protected process.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <section className="page-panel settings-page" aria-labelledby={`${page.id}-title`}>
            <div className="page-header">
                <div>
                    <p className="eyebrow">Protection settings</p>
                    <h1 id={`${page.id}-title`}>{page.title}</h1>
                    <p className="page-description">{page.description}</p>
                </div>
                <button
                    aria-label="Refresh Settings"
                    className="refresh-button"
                    type="button"
                    onClick={loadSettings}
                    disabled={isLoading || isSaving}
                >
                    Refresh
                </button>
            </div>

            <form className="settings-add-form" onSubmit={handleAddCustomProcess}>
                <label className="filter-field">
                    <span>Custom protected process name</span>
                    <input
                        aria-label="Custom protected process name"
                        value={customName}
                        onChange={(event) => setCustomName(event.target.value)}
                        placeholder="node.exe"
                        disabled={isSaving}
                    />
                </label>
                <button
                    aria-label="Add protected process"
                    className="refresh-button"
                    type="submit"
                    disabled={isSaving}
                >
                    Add
                </button>
            </form>

            {errorMessage && <StatusMessage variant="error">{errorMessage}</StatusMessage>}
            {operationMessage && <StatusMessage variant="success">{operationMessage}</StatusMessage>}
            {isLoading && <StatusMessage variant="loading">Loading protection settings...</StatusMessage>}

            {!isLoading && (
                <div className="settings-grid">
                    <section className="settings-section" aria-labelledby="default-protection-title">
                        <div className="settings-section-header">
                            <h2 id="default-protection-title">Default protected processes</h2>
                            <span className="settings-count">{settings.defaultProcessNames.length}</span>
                        </div>
                        <ul className="protection-list" aria-label="Default protected process list">
                            {settings.defaultProcessNames.map((name) => (
                                <li className="protection-list-row" key={name}>
                                    <span className="mono">{name}</span>
                                    <span className="protected-badge">Default</span>
                                </li>
                            ))}
                        </ul>
                    </section>

                    <section className="settings-section" aria-labelledby="custom-protection-title">
                        <div className="settings-section-header">
                            <h2 id="custom-protection-title">Custom protected processes</h2>
                            <span className="settings-count">{settings.customProcessNames.length}</span>
                        </div>
                        {settings.customProcessNames.length === 0 ? (
                            <StatusMessage variant="empty">No custom protected processes yet.</StatusMessage>
                        ) : (
                            <ul className="protection-list" aria-label="Custom protected process list">
                                {settings.customProcessNames.map((name) => (
                                    <li className="protection-list-row" key={name}>
                                        <span className="mono">{name}</span>
                                        <button
                                            aria-label={`Delete ${name}`}
                                            className="danger-button table-action-button"
                                            type="button"
                                            onClick={() => void handleDeleteCustomProcess(name)}
                                            disabled={isSaving}
                                        >
                                            Delete
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
