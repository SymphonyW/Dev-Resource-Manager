export interface ProtectionSettings {
    defaultProcessNames: string[];
    customProcessNames: string[];
}

export interface CleanupPortRange {
    start: number;
    end: number;
}

export interface CleanupRuleInput {
    name: string;
    enabled: boolean;
    matchProcessNames: string[];
    matchCommandKeywords: string[];
    matchPorts: number[];
    matchPortRanges: CleanupPortRange[];
}

export interface CleanupRule extends CleanupRuleInput {
    id: string;
    isBuiltin: boolean;
}
