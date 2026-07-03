//go:build windows

package port

import (
	"context"
	"net"
	"testing"
	"time"
)

func TestListIncludesLocalTCPListener(t *testing.T) {
	listener, port := listenOnLocalTCPPort(t)
	defer listener.Close()

	ports := waitForPortList(t, port, "TCP")
	match := findPort(ports, port, "TCP")
	if match == nil {
		t.Fatalf("expected TCP port %d in port list", port)
	}
	if match.Status == "" {
		t.Fatalf("expected TCP port %d status", port)
	}
	if match.PID < 0 {
		t.Fatalf("expected TCP port %d pid to be non-negative, got %d", port, match.PID)
	}
}

func TestListIncludesLocalUDPListener(t *testing.T) {
	listener, port := listenOnLocalUDPPort(t)
	defer listener.Close()

	ports := waitForPortList(t, port, "UDP")
	match := findPort(ports, port, "UDP")
	if match == nil {
		t.Fatalf("expected UDP port %d in port list", port)
	}
	if match.Status == "" {
		t.Fatalf("expected UDP port %d status", port)
	}
	if match.PID < 0 {
		t.Fatalf("expected UDP port %d pid to be non-negative, got %d", port, match.PID)
	}
}

func listenOnLocalTCPPort(t *testing.T) (net.Listener, int) {
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

func listenOnLocalUDPPort(t *testing.T) (net.PacketConn, int) {
	t.Helper()

	listener, err := net.ListenPacket("udp", "127.0.0.1:0")
	if err != nil {
		t.Fatalf("listen on local UDP port: %v", err)
	}

	addr, ok := listener.LocalAddr().(*net.UDPAddr)
	if !ok {
		listener.Close()
		t.Fatalf("expected UDP listener address, got %T", listener.LocalAddr())
	}

	return listener, addr.Port
}

func waitForPortList(t *testing.T, port int, protocol string) []Info {
	t.Helper()

	deadline := time.Now().Add(3 * time.Second)
	var last []Info

	for {
		ports, err := List(context.Background())
		if err != nil {
			t.Fatalf("expected port list, got error: %v", err)
		}
		last = ports

		if findPort(ports, port, protocol) != nil {
			return ports
		}
		if time.Now().After(deadline) {
			return last
		}

		time.Sleep(100 * time.Millisecond)
	}
}

func findPort(ports []Info, port int, protocol string) *Info {
	for i := range ports {
		if ports[i].Port == port && ports[i].Protocol == protocol {
			return &ports[i]
		}
	}

	return nil
}
