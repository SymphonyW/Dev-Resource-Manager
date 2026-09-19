package main

import (
	"dev-resource-manager/internal/resource"
	"net"
	"sync/atomic"
	"testing"
	"time"
)

func TestGetSystemResourceInfoReturnsResourceSnapshot(t *testing.T) {
	app := newTestApp(t)

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

func TestCollectSystemResourceInfoRunsCollectorsConcurrently(t *testing.T) {
	var started atomic.Int32
	allStarted := make(chan struct{})
	release := make(chan struct{})
	released := false
	defer func() {
		if !released {
			close(release)
		}
	}()

	markStarted := func() {
		if started.Add(1) == 5 {
			close(allStarted)
		}
		<-release
	}

	result := make(chan SystemResourceInfo, 1)
	go func() {
		result <- collectSystemResourceInfo(systemResourceCollectors{
			CPUPercent: func() float64 {
				markStarted()
				return 12.3
			},
			Memory: func() memoryResourceInfo {
				markStarted()
				return memoryResourceInfo{
					TotalBytes: 100,
					UsedBytes:  40,
					FreeBytes:  60,
				}
			},
			GPU: func() resource.GPUInfo {
				markStarted()
				return resource.GPUInfo{
					GPUPercent:     21.5,
					TotalVRAMBytes: 80,
					UsedVRAMBytes:  20,
					FreeVRAMBytes:  60,
				}
			},
			ProcessCount: func() int {
				markStarted()
				return 7
			},
			PortCount: func() int {
				markStarted()
				return 3
			},
		})
	}()

	select {
	case <-allStarted:
	case <-time.After(150 * time.Millisecond):
		t.Fatalf("expected resource collectors to start concurrently, got %d started", started.Load())
	}

	close(release)
	released = true

	select {
	case info := <-result:
		if info.CPUPercent != 12.3 || info.TotalMemoryBytes != 100 || info.GPUPercent != 21.5 || info.ProcessCount != 7 || info.PortCount != 3 {
			t.Fatalf("unexpected resource info: %+v", info)
		}
	case <-time.After(150 * time.Millisecond):
		t.Fatalf("expected resource info after releasing collectors")
	}
}

func TestGetProcessListReturnsCurrentProcesses(t *testing.T) {
	app := newTestApp(t)

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

func TestGetPortListReturnsCurrentTCPListener(t *testing.T) {
	listener, port := listenOnLocalTCPPortForAppTest(t)
	defer listener.Close()

	app := newTestApp(t)
	deadline := time.Now().Add(3 * time.Second)

	for {
		ports, err := app.GetPortList()
		if err != nil {
			t.Fatalf("expected port list, got error: %v", err)
		}

		for _, portInfo := range ports {
			if portInfo.Port == port && portInfo.Protocol == "TCP" {
				return
			}
		}

		if time.Now().After(deadline) {
			t.Fatalf("expected TCP port %d in app port list", port)
		}

		time.Sleep(100 * time.Millisecond)
	}
}

func TestKillProcessByPIDReturnsFailureForInvalidPID(t *testing.T) {
	app := newTestApp(t)

	result := app.KillProcessByPID(-1)

	if result.Success {
		t.Fatalf("expected invalid pid kill to fail")
	}
	if result.PID != -1 {
		t.Fatalf("expected pid -1, got %d", result.PID)
	}
	if result.Message == "" {
		t.Fatalf("expected failure message")
	}

	logs, err := app.GetOperationLogs()
	if err != nil {
		t.Fatalf("get operation logs: %v", err)
	}
	if len(logs) != 1 {
		t.Fatalf("expected one operation log, got %d", len(logs))
	}
	if logs[0].Action != "kill_process_by_pid" || logs[0].PID != -1 || logs[0].Result != "failure" {
		t.Fatalf("unexpected operation log: %+v", logs[0])
	}
	if logs[0].Message == "" {
		t.Fatalf("expected operation log message")
	}
}

func TestKillProcessByPortLogsFailureForUnsupportedProtocol(t *testing.T) {
	app := newTestApp(t)

	result := app.KillProcessByPort(3000, "ICMP")

	if result.Success {
		t.Fatalf("expected unsupported protocol kill to fail")
	}

	logs, err := app.GetOperationLogs()
	if err != nil {
		t.Fatalf("get operation logs: %v", err)
	}
	if len(logs) != 1 {
		t.Fatalf("expected one operation log, got %d", len(logs))
	}
	if logs[0].Action != "kill_process_by_port" || logs[0].Port != 3000 || logs[0].Result != "failure" {
		t.Fatalf("unexpected operation log: %+v", logs[0])
	}
}

func TestProtectionSettingsManageCustomProtectedProcesses(t *testing.T) {
	app := newTestApp(t)

	settings, err := app.GetProtectionSettings()
	if err != nil {
		t.Fatalf("get protection settings: %v", err)
	}
	if len(settings.DefaultProcessNames) == 0 {
		t.Fatalf("expected default protected processes")
	}
	if len(settings.CustomProcessNames) != 0 {
		t.Fatalf("expected no custom protected processes, got %v", settings.CustomProcessNames)
	}

	settings, err = app.AddCustomProtectedProcessName("worker.exe")
	if err != nil {
		t.Fatalf("add custom protected process: %v", err)
	}
	if !containsAppTestString(settings.CustomProcessNames, "worker.exe") {
		t.Fatalf("expected worker.exe in custom protected processes, got %v", settings.CustomProcessNames)
	}

	settings, err = app.DeleteCustomProtectedProcessName("WORKER.EXE")
	if err != nil {
		t.Fatalf("delete custom protected process: %v", err)
	}
	if containsAppTestString(settings.CustomProcessNames, "worker.exe") {
		t.Fatalf("expected worker.exe to be removed, got %v", settings.CustomProcessNames)
	}
}

func newTestApp(t *testing.T) *App {
	t.Helper()

	configDir := t.TempDir()
	t.Setenv("APPDATA", configDir)
	t.Setenv("XDG_CONFIG_HOME", configDir)

	return NewApp()
}

func containsAppTestString(values []string, expected string) bool {
	for _, value := range values {
		if value == expected {
			return true
		}
	}

	return false
}

func listenOnLocalTCPPortForAppTest(t *testing.T) (net.Listener, int) {
	t.Helper()

	listener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatalf("listen on local TCP port: %v", err)
	}

	addr, ok := listener.Addr().(*net.TCPAddr)
	if !ok {
		listener.Close()
		t.Fatalf("expected TCP listener address, got %T", listener.Addr())
	}

	return listener, addr.Port
}
