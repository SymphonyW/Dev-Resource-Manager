import {GetProcessList, KillProcessByPID} from '../../wailsjs/go/main/App';
import type {OperationResult, ProcessInfo} from '../types/processes';

export function loadProcessList(): Promise<ProcessInfo[]> {
    return GetProcessList();
}

export function killProcessByPID(pid: number): Promise<OperationResult> {
    return KillProcessByPID(pid);
}
