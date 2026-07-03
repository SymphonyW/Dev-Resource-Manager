import type {ReactNode} from 'react';

type StatusMessageVariant = 'loading' | 'error' | 'empty' | 'success';

interface StatusMessageProps {
    children: ReactNode;
    variant: StatusMessageVariant;
}

function StatusMessage({children, variant}: StatusMessageProps) {
    return (
        <p className={`status-message ${variant}`} role={variant === 'error' ? 'alert' : undefined}>
            {children}
        </p>
    );
}

export default StatusMessage;
