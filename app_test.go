package main

import (
	"net"
	"testing"
	"time"
)

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

func TestGetPortListReturnsCurrentTCPListener(t *testing.T) {
	listener, port := listenOnLocalTCPPortForAppTest(t)
	defer listener.Close()

	app := NewApp()
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
