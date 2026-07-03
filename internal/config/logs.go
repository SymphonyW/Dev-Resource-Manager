package config

import (
	"context"
	"fmt"
	"strings"
	"time"
)

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
ORDER BY created_at DESC, id DESC;`)
	if err != nil {
		return nil, fmt.Errorf("list operation logs: %w", err)
	}
	defer rows.Close()

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
		return nil, fmt.Errorf("list operation logs: %w", err)
	}

	return logs, nil
}
