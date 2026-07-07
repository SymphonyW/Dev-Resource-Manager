import type {OperationLog} from './logs';

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

export interface ProcessDetailPort {
    port: number;
    protocol: string;
    status: string;
}

export interface ProcessDetail {
    pid: number;
    processName: string;
    executablePath: string;
    executablePathError: string;
    commandLine: string;
    commandLineError: string;
    cpuPercent: number;
    memoryBytes: number;
    isProtected: boolean;
    isDeveloperRelated: boolean;
    ports: ProcessDetailPort[];
    portsError: string;
    recentLogs: OperationLog[];
    logsError: string;
}

export interface OperationResult {
    success: boolean;
    message: string;
    pid: number;
    processName: string;
}

export type ProcessSortKey = 'memory' | 'cpu';
