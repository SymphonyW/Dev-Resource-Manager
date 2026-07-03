import type {ProcessInfo} from './processes';

export interface CleanupCandidate extends ProcessInfo {
    ports: number[];
    match: string;
}
