package config

import (
	"context"
	"path/filepath"
	"testing"
)

func TestProtectionStoreReturnsDefaultAndCustomProtectionSettings(t *testing.T) {
	ctx := context.Background()
	store := newTestStore(t)

	settings, err := store.GetProtectionSettings(ctx)
	if err != nil {
		t.Fatalf("get initial protection settings: %v", err)
	}
	if len(settings.DefaultProcessNames) == 0 {
		t.Fatalf("expected default protected processes")
	}
	if len(settings.CustomProcessNames) != 0 {
		t.Fatalf("expected no custom protected processes, got %v", settings.CustomProcessNames)
	}

	settings, err = store.AddCustomProtectedProcessName(ctx, "Node.EXE")
	if err != nil {
		t.Fatalf("add custom protected process: %v", err)
	}
	if !containsString(settings.CustomProcessNames, "node.exe") {
		t.Fatalf("expected normalized custom process node.exe, got %v", settings.CustomProcessNames)
	}

	rules, err := store.LoadProtectionRules(ctx)
	if err != nil {
		t.Fatalf("load protection rules: %v", err)
	}
	if !rules.IsProtectedName("NODE.EXE") {
		t.Fatalf("expected custom protected process lookup to be case-insensitive")
	}
	if !rules.IsProtectedName("System") {
		t.Fatalf("expected default protected process lookup to be included")
	}
}

func TestProtectionStoreDeletesCustomProtectionOnly(t *testing.T) {
	ctx := context.Background()
	store := newTestStore(t)

	if _, err := store.AddCustomProtectedProcessName(ctx, "vite.exe"); err != nil {
		t.Fatalf("add custom protected process: %v", err)
	}

	settings, err := store.DeleteCustomProtectedProcessName(ctx, "VITE.EXE")
	if err != nil {
		t.Fatalf("delete custom protected process: %v", err)
	}
	if containsString(settings.CustomProcessNames, "vite.exe") {
		t.Fatalf("expected vite.exe to be removed, got %v", settings.CustomProcessNames)
	}

	if _, err := store.DeleteCustomProtectedProcessName(ctx, "System"); err == nil {
		t.Fatalf("expected deleting a default protected process to fail")
	}
	settings, err = store.GetProtectionSettings(ctx)
	if err != nil {
		t.Fatalf("get protection settings after default delete attempt: %v", err)
	}
	if !containsString(settings.DefaultProcessNames, "System") {
		t.Fatalf("expected System to remain in default protected processes")
	}
}

func TestProtectionStoreRejectsEmptyAndDuplicateCustomNames(t *testing.T) {
	ctx := context.Background()
	store := newTestStore(t)

	if _, err := store.AddCustomProtectedProcessName(ctx, " "); err == nil {
		t.Fatalf("expected empty custom protected process name to fail")
	}

	if _, err := store.AddCustomProtectedProcessName(ctx, "worker.exe"); err != nil {
		t.Fatalf("add custom protected process: %v", err)
	}
	settings, err := store.AddCustomProtectedProcessName(ctx, "WORKER.EXE")
	if err != nil {
		t.Fatalf("duplicate custom protected process should be idempotent: %v", err)
	}

	count := 0
	for _, name := range settings.CustomProcessNames {
		if name == "worker.exe" {
			count++
		}
	}
	if count != 1 {
		t.Fatalf("expected one normalized worker.exe entry, got %v", settings.CustomProcessNames)
	}
}

func TestOperationLogsAreStoredNewestFirst(t *testing.T) {
	ctx := context.Background()
	store := newTestStore(t)

	if err := store.AddOperationLog(ctx, OperationLogInput{
		Action:      "kill_process_by_pid",
		PID:         101,
		ProcessName: "node.exe",
		Result:      "success",
		Message:     "Process node.exe (PID 101) ended.",
	}); err != nil {
		t.Fatalf("add first operation log: %v", err)
	}
	if err := store.AddOperationLog(ctx, OperationLogInput{
		Action:      "kill_process_by_port",
		PID:         202,
		ProcessName: "postgres.exe",
		Port:        5432,
		Result:      "failure",
		Message:     "Permission denied.",
	}); err != nil {
		t.Fatalf("add second operation log: %v", err)
	}

	logs, err := store.GetOperationLogs(ctx)
	if err != nil {
		t.Fatalf("get operation logs: %v", err)
	}
	if len(logs) != 2 {
		t.Fatalf("expected 2 operation logs, got %d", len(logs))
	}
	if logs[0].Action != "kill_process_by_port" {
		t.Fatalf("expected newest log first, got %+v", logs)
	}
	if logs[0].PID != 202 || logs[0].Port != 5432 || logs[0].Result != "failure" {
		t.Fatalf("unexpected newest log contents: %+v", logs[0])
	}
	if logs[0].CreatedAt == "" {
		t.Fatalf("expected createdAt to be set")
	}
}

func TestOperationLogsReturnsMostRecentEntriesOnly(t *testing.T) {
	ctx := context.Background()
	store := newTestStore(t)

	for i := 0; i < 205; i++ {
		if err := store.AddOperationLog(ctx, OperationLogInput{
			Action:      "kill_process_by_pid",
			PID:         1000 + i,
			ProcessName: "node.exe",
			Result:      "success",
			Message:     "Process node.exe ended.",
		}); err != nil {
			t.Fatalf("add operation log %d: %v", i, err)
		}
	}

	logs, err := store.GetOperationLogs(ctx)
	if err != nil {
		t.Fatalf("get operation logs: %v", err)
	}
	if len(logs) != 200 {
		t.Fatalf("expected 200 most recent logs, got %d", len(logs))
	}
	if logs[0].PID != 1204 {
		t.Fatalf("expected newest log first, got PID %d", logs[0].PID)
	}
	if logs[len(logs)-1].PID != 1005 {
		t.Fatalf("expected oldest returned log to be PID 1005, got %d", logs[len(logs)-1].PID)
	}
}

func TestRecentOperationLogsForProcessFiltersByPIDOrProcessName(t *testing.T) {
	ctx := context.Background()
	store := newTestStore(t)

	inputs := []OperationLogInput{
		{
			Action:      "kill_process_by_pid",
			PID:         100,
			ProcessName: "node.exe",
			Result:      "success",
			Message:     "Process node.exe ended.",
		},
		{
			Action:      "kill_process_by_port",
			PID:         0,
			ProcessName: "NODE.EXE",
			Port:        3000,
			Result:      "failure",
			Message:     "Permission denied.",
		},
		{
			Action:      "kill_process_by_pid",
			PID:         200,
			ProcessName: "postgres.exe",
			Result:      "success",
			Message:     "Process postgres.exe ended.",
		},
	}
	for _, input := range inputs {
		if err := store.AddOperationLog(ctx, input); err != nil {
			t.Fatalf("add operation log: %v", err)
		}
	}

	logs, err := store.GetRecentOperationLogsForProcess(ctx, 100, "node.exe", 5)
	if err != nil {
		t.Fatalf("get process operation logs: %v", err)
	}
	if len(logs) != 2 {
		t.Fatalf("expected 2 related logs, got %d: %+v", len(logs), logs)
	}
	if logs[0].ProcessName != "NODE.EXE" || logs[1].PID != 100 {
		t.Fatalf("expected newest related PID/name logs first, got %+v", logs)
	}
}

func TestRecentOperationLogsForResourceFiltersByPIDProcessNameOrPortsAndLimits(t *testing.T) {
	ctx := context.Background()
	store := newTestStore(t)

	inputs := []OperationLogInput{
		{
			Action:      "kill_process_by_pid",
			PID:         100,
			ProcessName: "node.exe",
			Result:      "success",
			Message:     "Process node.exe ended.",
		},
		{
			Action:      "kill_process_by_port",
			PID:         900,
			ProcessName: "redis-server.exe",
			Port:        6379,
			Result:      "success",
			Message:     "Unrelated port ended.",
		},
		{
			Action:      "kill_process_by_pid",
			PID:         700,
			ProcessName: "NODE.EXE",
			Result:      "failure",
			Message:     "Matched by process name.",
		},
		{
			Action:      "kill_process_by_port",
			PID:         0,
			ProcessName: "",
			Port:        3000,
			Result:      "success",
			Message:     "Matched by port.",
		},
	}
	for _, input := range inputs {
		if err := store.AddOperationLog(ctx, input); err != nil {
			t.Fatalf("add operation log: %v", err)
		}
	}

	logs, err := store.GetRecentOperationLogsForResource(ctx, 100, "node.exe", []int{3000}, 2)
	if err != nil {
		t.Fatalf("get resource operation logs: %v", err)
	}
	if len(logs) != 2 {
		t.Fatalf("expected 2 limited resource logs, got %d: %+v", len(logs), logs)
	}
	if logs[0].Port != 3000 || logs[1].ProcessName != "NODE.EXE" {
		t.Fatalf("expected newest port/name logs first, got %+v", logs)
	}
}

func newTestStore(t *testing.T) *Store {
	t.Helper()

	store, err := NewStore(filepath.Join(t.TempDir(), "settings.sqlite3"))
	if err != nil {
		t.Fatalf("new store: %v", err)
	}
	t.Cleanup(func() {
		if err := store.Close(); err != nil {
			t.Fatalf("close store: %v", err)
		}
	})

	return store
}

func containsString(values []string, expected string) bool {
	for _, value := range values {
		if value == expected {
			return true
		}
	}

	return false
}
