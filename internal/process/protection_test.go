package process

import "testing"

func TestIsProtectedNameRecognizesDefaultWindowsProcesses(t *testing.T) {
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
	if !IsProtectedName("SVCHOST.EXE") {
		t.Fatalf("expected uppercase svchost.exe to be protected")
	}
}

func TestIsProtectedNameAllowsDevelopmentProcesses(t *testing.T) {
	if IsProtectedName("node.exe") {
		t.Fatalf("expected node.exe to be terminable by default")
	}
}
