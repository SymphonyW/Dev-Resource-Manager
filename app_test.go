package main

import "testing"

func TestGetSystemResourceInfoReturnsResourceSnapshot(t *testing.T) {
	app := NewApp()

	info := app.GetSystemResourceInfo()

	if info.CPUPercent < 0 {
		t.Fatalf("CPUPercent should not be negative: %f", info.CPUPercent)
	}
	if info.TotalMemoryBytes < info.UsedMemoryBytes {
		t.Fatalf("total memory should be greater than or equal to used memory")
	}
	if info.ProcessCount < 0 {
		t.Fatalf("ProcessCount should not be negative: %d", info.ProcessCount)
	}
	if info.PortCount < 0 {
		t.Fatalf("PortCount should not be negative: %d", info.PortCount)
	}
}

func TestGetProcessListReturnsCurrentProcesses(t *testing.T) {
	app := NewApp()

	processes, err := app.GetProcessList()
	if err != nil {
		t.Fatalf("expected process list, got error: %v", err)
	}
	if len(processes) == 0 {
		t.Fatalf("expected at least one process")
	}

	hasNonZeroPID := false
	for _, process := range processes {
		if process.PID > 0 {
			hasNonZeroPID = true
			break
		}
	}
	if !hasNonZeroPID {
		t.Fatalf("expected at least one non-zero process pid")
	}
}
