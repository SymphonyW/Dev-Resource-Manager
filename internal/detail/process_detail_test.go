package detail

import (
	"testing"

	"dev-resource-manager/internal/config"
	portscanner "dev-resource-manager/internal/port"
)

func TestBuildProcessDetailAggregatesPortsLogsAndAccessWarnings(t *testing.T) {
	detail := BuildProcessDetail(
		ProcessSnapshot{
			PID:                 100,
			ProcessName:         "node.exe",
			ExecutablePathError: "Unable to read executable path. Try running as administrator.",
			CommandLineError:    "Unable to read command line. Try running as administrator.",
			CPUPercent:          12.3,
			MemoryBytes:         512 * 1024 * 1024,
			IsProtected:         false,
		},
		[]portscanner.Info{
			{Port: 5432, Protocol: "TCP", Status: "LISTEN", PID: 200, ProcessName: "postgres.exe"},
			{Port: 3000, Protocol: "TCP", Status: "LISTEN", PID: 100, ProcessName: "node.exe"},
			{Port: 5173, Protocol: "TCP", Status: "LISTEN", PID: 100, ProcessName: "node.exe"},
		},
		[]config.OperationLog{
			{ID: 7, Action: "kill_process_by_pid", PID: 100, ProcessName: "node.exe", Result: "failure"},
		},
		"",
		"",
	)

	if detail.PID != 100 {
		t.Fatalf("expected PID 100, got %d", detail.PID)
	}
	if detail.ProcessName != "node.exe" {
		t.Fatalf("expected node.exe, got %q", detail.ProcessName)
	}
	if detail.ExecutablePath != "" || detail.ExecutablePathError == "" {
		t.Fatalf("expected explicit executable path error, got path=%q error=%q", detail.ExecutablePath, detail.ExecutablePathError)
	}
	if detail.CommandLine != "" || detail.CommandLineError == "" {
		t.Fatalf("expected explicit command line error, got command=%q error=%q", detail.CommandLine, detail.CommandLineError)
	}
	if !detail.IsDeveloperRelated {
		t.Fatalf("expected node.exe to be developer-related")
	}
	if len(detail.Ports) != 2 {
		t.Fatalf("expected two related ports, got %+v", detail.Ports)
	}
	if detail.Ports[0].Port != 3000 || detail.Ports[1].Port != 5173 {
		t.Fatalf("expected sorted PID ports, got %+v", detail.Ports)
	}
	if len(detail.RecentLogs) != 1 || detail.RecentLogs[0].ID != 7 {
		t.Fatalf("expected recent log to be preserved, got %+v", detail.RecentLogs)
	}
}

func TestBuildProcessDetailDetectsDeveloperRelatedProcessesFromCommandLine(t *testing.T) {
	detail := BuildProcessDetail(
		ProcessSnapshot{
			PID:            300,
			ProcessName:    "python.exe",
			ExecutablePath: `C:\Python312\python.exe`,
			CommandLine:    `python -m uvicorn app:server --port 8000`,
		},
		nil,
		nil,
		"",
		"",
	)

	if !detail.IsDeveloperRelated {
		t.Fatalf("expected uvicorn command line to mark process as developer-related")
	}
}
