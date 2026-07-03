import {GetOperationLogs} from '../../wailsjs/go/main/App';
import type {OperationLog} from '../types/logs';

export function loadOperationLogs(): Promise<OperationLog[]> {
    return GetOperationLogs();
}
