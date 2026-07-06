package config

import (
	"context"
	"database/sql"
	"fmt"
	"strings"
	"time"
)

const defaultOperationLogListLimit = 200

// OperationLog is a persisted process operation log row.
type OperationLog struct {
	ID          int64  `json:"id"`
	Action      string `json:"action"`
	PID         int    `json:"pid"`
	ProcessName string `json:"processName"`
	Port        int    `json:"port"`
	Result      string `json:"result"`
	Message     string `json:"message"`
	CreatedAt   string `json:"createdAt"`
}

// OperationLogInput is the data required to persist a process operation log.
type OperationLogInput struct {
	Action      string
	PID         int
	ProcessName string
	Port        int
	Result      string
	Message     string
}

// AddOperationLog stores a process operation log entry.
func (s *Store) AddOperationLog(ctx context.Context, input OperationLogInput) error {
	if ctx == nil {
		ctx = context.Background()
	}
	if err := s.validate(); err != nil {
		return err
	}

	action := strings.TrimSpace(input.Action)
	result := strings.TrimSpace(input.Result)
	if action == "" {
		return fmt.Errorf("operation log action cannot be empty")
	}
	if result == "" {
		return fmt.Errorf("operation log result cannot be empty")
	}

	_, err := s.db.ExecContext(ctx, `
INSERT INTO operation_logs (action, pid, process_name, port, result, message, created_at)
VALUES (?, ?, ?, ?, ?, ?, ?);`,
		action,
		input.PID,
		strings.TrimSpace(input.ProcessName),
		input.Port,
		result,
		strings.TrimSpace(input.Message),
		time.Now().UTC().Format(time.RFC3339Nano),
	)
	if err != nil {
		return fmt.Errorf("add operation log: %w", err)
	}

	return nil
}

// GetOperationLogs returns operation logs ordered by newest first.
func (s *Store) GetOperationLogs(ctx context.Context) ([]OperationLog, error) {
	if ctx == nil {
		ctx = context.Background()
	}
	if err := s.validate(); err != nil {
		return nil, err
	}

	rows, err := s.db.QueryContext(ctx, `
SELECT id, action, pid, process_name, port, result, message, created_at
FROM operation_logs
ORDER BY created_at DESC, id DESC
LIMIT ?;`, defaultOperationLogListLimit)
	if err != nil {
		return nil, fmt.Errorf("list operation logs: %w", err)
	}
	defer rows.Close()

	return readOperationLogs(rows, "list operation logs")
}

// GetRecentOperationLogsForProcess returns recent logs related to a process PID or process name.
func (s *Store) GetRecentOperationLogsForProcess(ctx context.Context, pid int, processName string, limit int) ([]OperationLog, error) {
	if ctx == nil {
		ctx = context.Background()
	}
	if err := s.validate(); err != nil {
		return nil, err
	}

	normalizedName := strings.TrimSpace(processName)
	if limit <= 0 {
		limit = 8
	}

	rows, err := s.db.QueryContext(ctx, `
SELECT id, action, pid, process_name, port, result, message, created_at
FROM operation_logs
WHERE pid = ? OR (? <> '' AND lower(process_name) = lower(?))
ORDER BY created_at DESC, id DESC
LIMIT ?;`, pid, normalizedName, normalizedName, limit)
	if err != nil {
		return nil, fmt.Errorf("list process operation logs: %w", err)
	}
	defer rows.Close()

	return readOperationLogs(rows, "list process operation logs")
}

// GetRecentOperationLogsForResource returns recent logs related to a PID, process name, or ports.
func (s *Store) GetRecentOperationLogsForResource(ctx context.Context, pid int, processName string, ports []int, limit int) ([]OperationLog, error) {
	if ctx == nil {
		ctx = context.Background()
	}
	if err := s.validate(); err != nil {
		return nil, err
	}

	normalizedName := strings.TrimSpace(processName)
	normalizedPorts := normalizeLogPorts(ports)
	if limit <= 0 {
		limit = 8
	}

	conditions := make([]string, 0, 3)
	args := make([]any, 0, 4+len(normalizedPorts))
	if pid > 0 {
		conditions = append(conditions, "pid = ?")
		args = append(args, pid)
	}
	if normalizedName != "" {
		conditions = append(conditions, "lower(process_name) = lower(?)")
		args = append(args, normalizedName)
	}
	if len(normalizedPorts) > 0 {
		portPlaceholders := make([]string, 0, len(normalizedPorts))
		for _, port := range normalizedPorts {
			portPlaceholders = append(portPlaceholders, "?")
			args = append(args, port)
		}
		conditions = append(conditions, "port IN ("+strings.Join(portPlaceholders, ", ")+")")
	}
	if len(conditions) == 0 {
		return []OperationLog{}, nil
	}

	query := `
SELECT id, action, pid, process_name, port, result, message, created_at
FROM operation_logs
WHERE ` + strings.Join(conditions, " OR ") + `
ORDER BY created_at DESC, id DESC
LIMIT ?;`
	args = append(args, limit)

	rows, err := s.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("list resource operation logs: %w", err)
	}
	defer rows.Close()

	return readOperationLogs(rows, "list resource operation logs")
}

func readOperationLogs(rows *sql.Rows, listErrorContext string) ([]OperationLog, error) {
	logs := make([]OperationLog, 0)
	for rows.Next() {
		var log OperationLog
		if err := rows.Scan(
			&log.ID,
			&log.Action,
			&log.PID,
			&log.ProcessName,
			&log.Port,
			&log.Result,
			&log.Message,
			&log.CreatedAt,
		); err != nil {
			return nil, fmt.Errorf("read operation log: %w", err)
		}
		logs = append(logs, log)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("%s: %w", listErrorContext, err)
	}

	return logs, nil
}

func normalizeLogPorts(ports []int) []int {
	seen := make(map[int]struct{}, len(ports))
	normalized := make([]int, 0, len(ports))
	for _, port := range ports {
		if port <= 0 {
			continue
		}
		if _, exists := seen[port]; exists {
			continue
		}
		seen[port] = struct{}{}
		normalized = append(normalized, port)
	}

	return normalized
}
