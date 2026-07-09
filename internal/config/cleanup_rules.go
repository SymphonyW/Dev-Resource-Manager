package config

import (
	"fmt"
	"sort"
	"strings"
)

const (
	BuiltinCleanupRuleNodeVite = "builtin-node-vite"
	BuiltinCleanupRulePython   = "builtin-python"
	BuiltinCleanupRuleGo       = "builtin-go"
	BuiltinCleanupRuleDatabase = "builtin-database"
)

// CleanupPortRange matches an inclusive local port range.
type CleanupPortRange struct {
	Start int `json:"start"`
	End   int `json:"end"`
}

// CleanupRule is a user-configurable rule for Cleanup candidate discovery.
type CleanupRule struct {
	ID                   string             `json:"id"`
	Name                 string             `json:"name"`
	Enabled              bool               `json:"enabled"`
	IsBuiltin            bool               `json:"isBuiltin"`
	MatchProcessNames    []string           `json:"matchProcessNames"`
	MatchCommandKeywords []string           `json:"matchCommandKeywords"`
	MatchPorts           []int              `json:"matchPorts"`
	MatchPortRanges      []CleanupPortRange `json:"matchPortRanges"`
}

// CleanupRuleInput is the payload accepted from the frontend for custom rules.
type CleanupRuleInput struct {
	Name                 string             `json:"name"`
	Enabled              bool               `json:"enabled"`
	MatchProcessNames    []string           `json:"matchProcessNames"`
	MatchCommandKeywords []string           `json:"matchCommandKeywords"`
	MatchPorts           []int              `json:"matchPorts"`
	MatchPortRanges      []CleanupPortRange `json:"matchPortRanges"`
}

var defaultCleanupRules = []CleanupRule{
	{
		ID:                BuiltinCleanupRuleNodeVite,
		Name:              "Node/Vite",
		Enabled:           true,
		IsBuiltin:         true,
		MatchProcessNames: []string{"node.exe", "npm", "pnpm", "yarn", "vite"},
		MatchPorts:        []int{3000, 5173, 5174},
	},
	{
		ID:                BuiltinCleanupRulePython,
		Name:              "Python",
		Enabled:           true,
		IsBuiltin:         true,
		MatchProcessNames: []string{"python.exe", "uvicorn"},
		MatchPorts:        []int{5000, 8000},
	},
	{
		ID:                BuiltinCleanupRuleGo,
		Name:              "Go",
		Enabled:           true,
		IsBuiltin:         true,
		MatchProcessNames: []string{"go.exe"},
		MatchPorts:        []int{8080},
	},
	{
		ID:                BuiltinCleanupRuleDatabase,
		Name:              "Database",
		Enabled:           true,
		IsBuiltin:         true,
		MatchProcessNames: []string{"redis-server", "postgres", "mysql"},
		MatchPorts:        []int{6379, 5432, 3306},
	},
}

// DefaultCleanupRules returns copies of the built-in cleanup rules.
func DefaultCleanupRules() []CleanupRule {
	rules := make([]CleanupRule, 0, len(defaultCleanupRules))
	for _, rule := range defaultCleanupRules {
		rules = append(rules, copyCleanupRule(rule))
	}

	return rules
}

func normalizeCleanupRuleInput(input CleanupRuleInput) (CleanupRuleInput, error) {
	normalized := CleanupRuleInput{
		Name:                 strings.TrimSpace(input.Name),
		Enabled:              input.Enabled,
		MatchProcessNames:    normalizeCleanupProcessNames(input.MatchProcessNames),
		MatchCommandKeywords: normalizeCleanupKeywords(input.MatchCommandKeywords),
	}
	if normalized.Name == "" {
		return CleanupRuleInput{}, fmt.Errorf("cleanup rule name cannot be empty")
	}

	ports, err := normalizeCleanupPorts(input.MatchPorts)
	if err != nil {
		return CleanupRuleInput{}, err
	}
	normalized.MatchPorts = ports

	ranges, err := normalizeCleanupPortRanges(input.MatchPortRanges)
	if err != nil {
		return CleanupRuleInput{}, err
	}
	normalized.MatchPortRanges = ranges

	if len(normalized.MatchProcessNames) == 0 &&
		len(normalized.MatchCommandKeywords) == 0 &&
		len(normalized.MatchPorts) == 0 &&
		len(normalized.MatchPortRanges) == 0 {
		return CleanupRuleInput{}, fmt.Errorf("cleanup rule must include at least one matcher")
	}

	return normalized, nil
}

func cleanupRuleInputFromRule(rule CleanupRule) CleanupRuleInput {
	return CleanupRuleInput{
		Name:                 rule.Name,
		Enabled:              rule.Enabled,
		MatchProcessNames:    append([]string(nil), rule.MatchProcessNames...),
		MatchCommandKeywords: append([]string(nil), rule.MatchCommandKeywords...),
		MatchPorts:           append([]int(nil), rule.MatchPorts...),
		MatchPortRanges:      append([]CleanupPortRange(nil), rule.MatchPortRanges...),
	}
}

func copyCleanupRule(rule CleanupRule) CleanupRule {
	rule.MatchProcessNames = append([]string(nil), rule.MatchProcessNames...)
	rule.MatchCommandKeywords = append([]string(nil), rule.MatchCommandKeywords...)
	rule.MatchPorts = append([]int(nil), rule.MatchPorts...)
	rule.MatchPortRanges = append([]CleanupPortRange(nil), rule.MatchPortRanges...)
	return rule
}

func normalizeCleanupProcessNames(values []string) []string {
	return normalizeCleanupStrings(values, NormalizeProcessName)
}

func normalizeCleanupKeywords(values []string) []string {
	return normalizeCleanupStrings(values, func(value string) string {
		return strings.ToLower(strings.TrimSpace(value))
	})
}

func normalizeCleanupStrings(values []string, normalize func(string) string) []string {
	seen := make(map[string]struct{}, len(values))
	normalized := make([]string, 0, len(values))
	for _, value := range values {
		nextValue := normalize(value)
		if nextValue == "" {
			continue
		}
		if _, ok := seen[nextValue]; ok {
			continue
		}
		seen[nextValue] = struct{}{}
		normalized = append(normalized, nextValue)
	}
	sort.Strings(normalized)

	return normalized
}

func normalizeCleanupPorts(values []int) ([]int, error) {
	seen := make(map[int]struct{}, len(values))
	normalized := make([]int, 0, len(values))
	for _, port := range values {
		if err := validateCleanupPort(port); err != nil {
			return nil, err
		}
		if _, ok := seen[port]; ok {
			continue
		}
		seen[port] = struct{}{}
		normalized = append(normalized, port)
	}
	sort.Ints(normalized)

	return normalized, nil
}

func normalizeCleanupPortRanges(values []CleanupPortRange) ([]CleanupPortRange, error) {
	type rangeKey struct {
		start int
		end   int
	}

	seen := make(map[rangeKey]struct{}, len(values))
	normalized := make([]CleanupPortRange, 0, len(values))
	for _, portRange := range values {
		if err := validateCleanupPort(portRange.Start); err != nil {
			return nil, err
		}
		if err := validateCleanupPort(portRange.End); err != nil {
			return nil, err
		}
		if portRange.Start > portRange.End {
			return nil, fmt.Errorf("cleanup port range start %d is greater than end %d", portRange.Start, portRange.End)
		}
		key := rangeKey{start: portRange.Start, end: portRange.End}
		if _, ok := seen[key]; ok {
			continue
		}
		seen[key] = struct{}{}
		normalized = append(normalized, CleanupPortRange{
			Start: portRange.Start,
			End:   portRange.End,
		})
	}
	sort.Slice(normalized, func(i, j int) bool {
		if normalized[i].Start == normalized[j].Start {
			return normalized[i].End < normalized[j].End
		}
		return normalized[i].Start < normalized[j].Start
	})

	return normalized, nil
}

func validateCleanupPort(port int) error {
	if port < 1 || port > 65535 {
		return fmt.Errorf("cleanup port %d is outside 1-65535", port)
	}

	return nil
}
