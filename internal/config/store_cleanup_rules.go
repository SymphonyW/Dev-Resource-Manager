package config

import (
	"context"
	"crypto/rand"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"fmt"
)

// GetCleanupRules returns built-in and user-managed cleanup matching rules.
func (s *Store) GetCleanupRules(ctx context.Context) ([]CleanupRule, error) {
	if ctx == nil {
		ctx = context.Background()
	}
	if err := s.validate(); err != nil {
		return nil, err
	}

	rows, err := s.db.QueryContext(ctx, `
SELECT id, name, enabled, is_builtin, match_process_names, match_command_keywords, match_ports, match_port_ranges
FROM cleanup_rules
ORDER BY sort_order ASC, is_builtin DESC, lower(name) ASC, id ASC;`)
	if err != nil {
		return nil, fmt.Errorf("list cleanup rules: %w", err)
	}
	defer rows.Close()

	rules := make([]CleanupRule, 0)
	for rows.Next() {
		rule, err := scanCleanupRule(rows)
		if err != nil {
			return nil, err
		}
		rules = append(rules, rule)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("list cleanup rules: %w", err)
	}

	return rules, nil
}

// AddCleanupRule persists a custom cleanup matching rule.
func (s *Store) AddCleanupRule(ctx context.Context, input CleanupRuleInput) ([]CleanupRule, error) {
	if ctx == nil {
		ctx = context.Background()
	}
	if err := s.validate(); err != nil {
		return nil, err
	}

	normalized, err := normalizeCleanupRuleInput(input)
	if err != nil {
		return nil, err
	}
	id, err := newCleanupRuleID()
	if err != nil {
		return nil, err
	}

	if err := s.insertCleanupRule(ctx, CleanupRule{
		ID:                   id,
		Name:                 normalized.Name,
		Enabled:              normalized.Enabled,
		IsBuiltin:            false,
		MatchProcessNames:    normalized.MatchProcessNames,
		MatchCommandKeywords: normalized.MatchCommandKeywords,
		MatchPorts:           normalized.MatchPorts,
		MatchPortRanges:      normalized.MatchPortRanges,
	}, 1000, false); err != nil {
		return nil, err
	}

	return s.GetCleanupRules(ctx)
}

// SetCleanupRuleEnabled enables or disables a built-in or custom cleanup rule.
func (s *Store) SetCleanupRuleEnabled(ctx context.Context, id string, enabled bool) ([]CleanupRule, error) {
	if ctx == nil {
		ctx = context.Background()
	}
	if err := s.validate(); err != nil {
		return nil, err
	}
	if id == "" {
		return nil, fmt.Errorf("cleanup rule id cannot be empty")
	}

	result, err := s.db.ExecContext(ctx, `
UPDATE cleanup_rules
SET enabled = ?, updated_at = CURRENT_TIMESTAMP
WHERE id = ?;`, boolToInt(enabled), id)
	if err != nil {
		return nil, fmt.Errorf("set cleanup rule %q enabled state: %w", id, err)
	}
	changed, err := result.RowsAffected()
	if err != nil {
		return nil, fmt.Errorf("read cleanup rule update result: %w", err)
	}
	if changed == 0 {
		return nil, fmt.Errorf("cleanup rule %q was not found", id)
	}

	return s.GetCleanupRules(ctx)
}

// DeleteCleanupRule removes a custom cleanup rule. Built-in rules can be disabled but not deleted.
func (s *Store) DeleteCleanupRule(ctx context.Context, id string) ([]CleanupRule, error) {
	if ctx == nil {
		ctx = context.Background()
	}
	if err := s.validate(); err != nil {
		return nil, err
	}
	if id == "" {
		return nil, fmt.Errorf("cleanup rule id cannot be empty")
	}

	var isBuiltin int
	err := s.db.QueryRowContext(ctx, `SELECT is_builtin FROM cleanup_rules WHERE id = ?;`, id).Scan(&isBuiltin)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("cleanup rule %q was not found", id)
		}
		return nil, fmt.Errorf("load cleanup rule %q: %w", id, err)
	}
	if isBuiltin == 1 {
		return nil, fmt.Errorf("built-in cleanup rule %q cannot be deleted; disable it instead", id)
	}

	if _, err := s.db.ExecContext(ctx, `DELETE FROM cleanup_rules WHERE id = ?;`, id); err != nil {
		return nil, fmt.Errorf("delete cleanup rule %q: %w", id, err)
	}

	return s.GetCleanupRules(ctx)
}

func (s *Store) seedDefaultCleanupRules(ctx context.Context) error {
	for index, rule := range DefaultCleanupRules() {
		normalized, err := normalizeCleanupRuleInput(cleanupRuleInputFromRule(rule))
		if err != nil {
			return fmt.Errorf("normalize default cleanup rule %q: %w", rule.ID, err)
		}
		rule.Name = normalized.Name
		rule.Enabled = normalized.Enabled
		rule.IsBuiltin = true
		rule.MatchProcessNames = normalized.MatchProcessNames
		rule.MatchCommandKeywords = normalized.MatchCommandKeywords
		rule.MatchPorts = normalized.MatchPorts
		rule.MatchPortRanges = normalized.MatchPortRanges
		if err := s.insertCleanupRule(ctx, rule, index, true); err != nil {
			return fmt.Errorf("seed default cleanup rule %q: %w", rule.ID, err)
		}
	}

	return nil
}

func (s *Store) insertCleanupRule(ctx context.Context, rule CleanupRule, sortOrder int, ignoreConflict bool) error {
	matchProcessNames, err := marshalCleanupRuleJSON(rule.MatchProcessNames)
	if err != nil {
		return err
	}
	matchCommandKeywords, err := marshalCleanupRuleJSON(rule.MatchCommandKeywords)
	if err != nil {
		return err
	}
	matchPorts, err := marshalCleanupRuleJSON(rule.MatchPorts)
	if err != nil {
		return err
	}
	matchPortRanges, err := marshalCleanupRuleJSON(rule.MatchPortRanges)
	if err != nil {
		return err
	}

	conflictClause := ""
	if ignoreConflict {
		conflictClause = "ON CONFLICT(id) DO NOTHING"
	}
	_, err = s.db.ExecContext(ctx, fmt.Sprintf(`
INSERT INTO cleanup_rules (
	id,
	name,
	enabled,
	is_builtin,
	match_process_names,
	match_command_keywords,
	match_ports,
	match_port_ranges,
	sort_order
)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
%s;`, conflictClause),
		rule.ID,
		rule.Name,
		boolToInt(rule.Enabled),
		boolToInt(rule.IsBuiltin),
		matchProcessNames,
		matchCommandKeywords,
		matchPorts,
		matchPortRanges,
		sortOrder,
	)
	if err != nil {
		return fmt.Errorf("insert cleanup rule %q: %w", rule.Name, err)
	}

	return nil
}

func scanCleanupRule(rows *sql.Rows) (CleanupRule, error) {
	var rule CleanupRule
	var enabled int
	var isBuiltin int
	var matchProcessNamesJSON string
	var matchCommandKeywordsJSON string
	var matchPortsJSON string
	var matchPortRangesJSON string

	if err := rows.Scan(
		&rule.ID,
		&rule.Name,
		&enabled,
		&isBuiltin,
		&matchProcessNamesJSON,
		&matchCommandKeywordsJSON,
		&matchPortsJSON,
		&matchPortRangesJSON,
	); err != nil {
		return CleanupRule{}, fmt.Errorf("read cleanup rule: %w", err)
	}
	if err := unmarshalCleanupRuleJSON(matchProcessNamesJSON, &rule.MatchProcessNames); err != nil {
		return CleanupRule{}, fmt.Errorf("read cleanup process names for %q: %w", rule.ID, err)
	}
	if err := unmarshalCleanupRuleJSON(matchCommandKeywordsJSON, &rule.MatchCommandKeywords); err != nil {
		return CleanupRule{}, fmt.Errorf("read cleanup command keywords for %q: %w", rule.ID, err)
	}
	if err := unmarshalCleanupRuleJSON(matchPortsJSON, &rule.MatchPorts); err != nil {
		return CleanupRule{}, fmt.Errorf("read cleanup ports for %q: %w", rule.ID, err)
	}
	if err := unmarshalCleanupRuleJSON(matchPortRangesJSON, &rule.MatchPortRanges); err != nil {
		return CleanupRule{}, fmt.Errorf("read cleanup port ranges for %q: %w", rule.ID, err)
	}
	rule.Enabled = enabled == 1
	rule.IsBuiltin = isBuiltin == 1

	return rule, nil
}

func marshalCleanupRuleJSON(value interface{}) (string, error) {
	data, err := json.Marshal(value)
	if err != nil {
		return "", fmt.Errorf("encode cleanup rule matcher: %w", err)
	}

	return string(data), nil
}

func unmarshalCleanupRuleJSON(data string, target interface{}) error {
	if data == "" {
		data = "[]"
	}
	if err := json.Unmarshal([]byte(data), target); err != nil {
		return fmt.Errorf("decode cleanup rule matcher: %w", err)
	}

	return nil
}

func boolToInt(value bool) int {
	if value {
		return 1
	}

	return 0
}

func newCleanupRuleID() (string, error) {
	var bytes [8]byte
	if _, err := rand.Read(bytes[:]); err != nil {
		return "", fmt.Errorf("generate cleanup rule id: %w", err)
	}

	return "custom-" + hex.EncodeToString(bytes[:]), nil
}
