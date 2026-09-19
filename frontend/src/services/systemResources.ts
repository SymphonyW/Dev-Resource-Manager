import {GetSystemResourceInfo} from '../../wailsjs/go/main/App';
import type {SystemResourceInfo} from '../types/systemResources';

const bytesPerMegabyte = 1024 * 1024;
const bytesPerGigabyte = bytesPerMegabyte * 1024;

export function loadSystemResourceInfo(): Promise<SystemResourceInfo> {
    return GetSystemResourceInfo();
}

export function formatMemorySize(bytes: number): string {
    if (bytes <= 0) {
        return '0 MB';
    }

    if (bytes >= bytesPerGigabyte) {
        return `${(bytes / bytesPerGigabyte).toFixed(1)} GB`;
    }

    if (bytes < bytesPerMegabyte) {
        return `${Math.max(1, Math.round(bytes / 1024))} KB`;
    }

    return `${(bytes / bytesPerMegabyte).toFixed(1)} MB`;
}

export function formatPercent(value: number): string {
    return `${value.toFixed(1)}%`;
}

export function isHighMemoryUsage(bytes: number): boolean {
    return bytes >= bytesPerGigabyte;
}
