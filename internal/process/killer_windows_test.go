//go:build windows

package process

import (
	"context"
	"errors"
	"strings"
	"testing"

	"golang.org/x/sys/windows"
)

type fakeKillOperations struct {
	pids      []int32
	names     map[int32]string
	nameErr   error
	killErr   error
	killedPID int32
}

func (ops *fakeKillOperations) pidsWithContext(ctx context.Context) ([]int32, error) {
	return ops.pids, nil
}

func (ops *fakeKillOperations) nameWithContext(ctx context.Context, pid int32) (string, error) {
	if ops.nameErr != nil {
		return "", ops.nameErr
	}

	return ops.names[pid], nil
}

func (ops *fakeKillOperations) killWithContext(ctx context.Context, pid int32) error {
	ops.killedPID = pid
	return ops.killErr
}

func TestKillByPIDRejectsProtectedProcess(t *testing.T) {
	ops := &fakeKillOperations{
		pids:  []int32{4},
		names: map[int32]string{4: "System"},
	}

	result := killByPID(context.Background(), 4, ops)

	if result.Success {
		t.Fatalf("expected protected process kill to fail")
	}
	if result.PID != 4 {
		t.Fatalf("expected pid 4, got %d", result.PID)
	}
	if result.ProcessName != "System" {
		t.Fatalf("expected process name System, got %q", result.ProcessName)
	}
	if !strings.Contains(strings.ToLower(result.Message), "protected") {
		t.Fatalf("expected protected message, got %q", result.Message)
	}
	if ops.killedPID != 0 {
		t.Fatalf("protected process should not be killed")
	}
}

func TestKillByPIDReturnsMissingPID(t *testing.T) {
	ops := &fakeKillOperations{
		pids:  []int32{100},
		names: map[int32]string{100: "node.exe"},
	}

	result := killByPID(context.Background(), 99999, ops)

	if result.Success {
		t.Fatalf("expected missing pid kill to fail")
	}
	if result.PID != 99999 {
		t.Fatalf("expected missing pid in result, got %d", result.PID)
	}
	if !strings.Contains(strings.ToLower(result.Message), "does not exist") {
		t.Fatalf("expected missing pid message, got %q", result.Message)
	}
	if ops.killedPID != 0 {
		t.Fatalf("missing pid should not be killed")
	}
}

func TestKillByPIDReportsPermissionDenied(t *testing.T) {
	ops := &fakeKillOperations{
		pids:    []int32{100},
		names:   map[int32]string{100: "node.exe"},
		killErr: windows.ERROR_ACCESS_DENIED,
	}

	result := killByPID(context.Background(), 100, ops)

	if result.Success {
		t.Fatalf("expected permission denied kill to fail")
	}
	if result.ProcessName != "node.exe" {
		t.Fatalf("expected process name node.exe, got %q", result.ProcessName)
	}
	if !strings.Contains(strings.ToLower(result.Message), "permission") {
		t.Fatalf("expected permission message, got %q", result.Message)
	}
}

func TestKillByPIDReturnsSuccess(t *testing.T) {
	ops := &fakeKillOperations{
		pids:  []int32{100},
		names: map[int32]string{100: "node.exe"},
	}

	result := killByPID(context.Background(), 100, ops)

	if !result.Success {
		t.Fatalf("expected successful kill, got message %q", result.Message)
	}
	if result.PID != 100 {
		t.Fatalf("expected pid 100, got %d", result.PID)
	}
	if result.ProcessName != "node.exe" {
		t.Fatalf("expected process name node.exe, got %q", result.ProcessName)
	}
	if ops.killedPID != 100 {
		t.Fatalf("expected pid 100 to be killed, got %d", ops.killedPID)
	}
}

func TestKillByPIDDoesNotKillWhenProcessNameCannotBeRead(t *testing.T) {
	ops := &fakeKillOperations{
		pids:    []int32{100},
		names:   map[int32]string{},
		nameErr: errors.New("name denied"),
	}

	result := killByPID(context.Background(), 100, ops)

	if result.Success {
		t.Fatalf("expected name read failure to fail")
	}
	if !strings.Contains(strings.ToLower(result.Message), "inspect") {
		t.Fatalf("expected inspect failure message, got %q", result.Message)
	}
	if ops.killedPID != 0 {
		t.Fatalf("process should not be killed when name cannot be inspected")
	}
}
