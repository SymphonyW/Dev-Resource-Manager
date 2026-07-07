interface ProcessNameCellProps {
    iconDataURL: string;
    name: string;
    fallbackName: string;
}

function ProcessNameCell({iconDataURL, name, fallbackName}: ProcessNameCellProps) {
    const displayName = name.trim() || fallbackName;
    const iconLabel = `${displayName} icon`;

    return (
        <span className="process-name-cell" title={displayName}>
            <span className="process-icon" role="img" aria-label={iconLabel}>
                {iconDataURL.trim() !== '' ? (
                    <img src={iconDataURL} alt="" aria-hidden="true"/>
                ) : (
                    <span className="process-icon-fallback" aria-hidden="true">{processInitial(displayName)}</span>
                )}
            </span>
            <span className="process-name-text">{displayName}</span>
        </span>
    );
}

function processInitial(name: string): string {
    const trimmedName = name.trim();
    if (trimmedName === '') {
        return '?';
    }

    return trimmedName.slice(0, 1).toUpperCase();
}

export default ProcessNameCell;
