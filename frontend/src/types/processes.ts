export interface ProcessInfo {
    pid: number;
    name: string;
    path: string;
    commandLine: string;
    user: string;
    cpuPercent: number;
    memoryBytes: number;
    isProtected: boolean;
}

export interface OperationResult {
    success: boolean;
    message: string;
    pid: number;
    processName: string;
}

export type ProcessSortKey = 'memory' | 'cpu';
