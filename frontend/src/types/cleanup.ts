import type {ProcessInfo} from './processes';

export interface CleanupRuleMatch {
    ruleId: string;
    ruleName: string;
    reasons: string[];
}

export interface CleanupCandidate extends ProcessInfo {
    ports: number[];
    matchedRules: CleanupRuleMatch[];
}
