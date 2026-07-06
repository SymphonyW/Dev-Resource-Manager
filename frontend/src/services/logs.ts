import {GetOperationLogs, GetRecentOperationLogsForResource} from '../../wailsjs/go/main/App';
import type {OperationLog} from '../types/logs';

export interface OperationLogResourceTarget {
    pid: number;
    processName: string;
    ports: number[];
}

export function loadOperationLogs(): Promise<OperationLog[]> {
    return GetOperationLogs();
}

export function loadRecentOperationLogsForResource(target: OperationLogResourceTarget): Promise<OperationLog[]> {
    return GetRecentOperationLogsForResource(target.pid, target.processName, target.ports);
}
