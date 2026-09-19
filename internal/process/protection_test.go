package process

import (
	"context"
	"testing"

	"dev-resource-manager/internal/config"
)

func TestIsProtectedNameRecognizesDefaultWindowsProcesses(t *testing.T) {
	isolateProtectionConfig(t)

	protectedNames := []string{
		"System",
		"Registry",
		"smss.exe",
		"csrss.exe",
		"wininit.exe",
		"winlogon.exe",
		"services.exe",
		"lsass.exe",
		"svchost.exe",
		"explorer.exe",
		"dwm.exe",
		"taskhostw.exe",
		"RuntimeBroker.exe",
		"SecurityHealthService.exe",
		"MsMpEng.exe",
	}

	for _, name := range protectedNames {
		if !IsProtectedName(name) {
			t.Fatalf("expected %s to be protected", name)
		}
	}
}

func TestIsProtectedNameIsCaseInsensitive(t *testing.T) {
	isolateProtectionConfig(t)

	if !IsProtectedName("SVCHOST.EXE") {
		t.Fatalf("expected uppercase svchost.exe to be protected")
	}
}

func TestIsProtectedNameAllowsDevelopmentProcesses(t *testing.T) {
	isolateProtectionConfig(t)

	if IsProtectedName("node.exe") {
		t.Fatalf("expected node.exe to be terminable by default")
	}
}

func TestIsProtectedNameRecognizesCustomProcesses(t *testing.T) {
	isolateProtectionConfig(t)

	store, err := config.NewDefaultStore()
	if err != nil {
		t.Fatalf("new default store: %v", err)
	}
	t.Cleanup(func() {
		if err := store.Close(); err != nil {
			t.Fatalf("close store: %v", err)
		}
	})
	if _, err := store.AddCustomProtectedProcessName(context.Background(), "node.exe"); err != nil {
		t.Fatalf("add custom protected process: %v", err)
	}

	if !IsProtectedName("NODE.EXE") {
		t.Fatalf("expected custom node.exe to be protected")
	}
}

func isolateProtectionConfig(t *testing.T) {
	t.Helper()

	configDir := t.TempDir()
	t.Setenv("APPDATA", configDir)
	t.Setenv("XDG_CONFIG_HOME", configDir)
}
