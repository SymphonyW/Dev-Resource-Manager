package process

import (
	"path/filepath"
	"strings"
)

var defaultProtectedNames = map[string]struct{}{
	"system":                    {},
	"registry":                  {},
	"smss.exe":                  {},
	"csrss.exe":                 {},
	"wininit.exe":               {},
	"winlogon.exe":              {},
	"services.exe":              {},
	"lsass.exe":                 {},
	"svchost.exe":               {},
	"explorer.exe":              {},
	"dwm.exe":                   {},
	"taskhostw.exe":             {},
	"runtimebroker.exe":         {},
	"securityhealthservice.exe": {},
	"msmpeng.exe":               {},
}

// IsProtectedName reports whether a process name is protected from termination by default.
func IsProtectedName(name string) bool {
	normalized := strings.ToLower(strings.TrimSpace(filepath.Base(name)))
	if normalized == "." || normalized == "" {
		return false
	}

	_, ok := defaultProtectedNames[normalized]
	return ok
}
