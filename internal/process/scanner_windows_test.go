//go:build windows

package process

import (
	"context"
	"os"
	"testing"
)

func TestListReturnsCurrentProcessWithCoreFields(t *testing.T) {
	processes, err := List(context.Background())
	if err != nil {
		t.Fatalf("expected process list, got error: %v", err)
	}
	if len(processes) == 0 {
		t.Fatalf("expected at least one process")
	}

	currentPID := int32(os.Getpid())
	var current *Info
	for i := range processes {
		if processes[i].PID == currentPID {
			current = &processes[i]
			break
		}
	}

	if current == nil {
		t.Fatalf("expected current process pid %d in process list", currentPID)
	}
	if current.Name == "" {
		t.Fatalf("expected current process name")
	}
	if current.MemoryBytes == 0 {
		t.Fatalf("expected current process memory usage")
	}
}
