import {GetProcessList} from '../../wailsjs/go/main/App';
import type {ProcessInfo} from '../types/processes';

export function loadProcessList(): Promise<ProcessInfo[]> {
    return GetProcessList();
}
