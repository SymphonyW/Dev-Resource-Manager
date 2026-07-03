package config

import (
	"path/filepath"
	"strings"
)

var defaultProtectedProcessNames = []string{
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

var defaultProtectedProcessNameSet = buildNameSet(defaultProtectedProcessNames)

// ProtectionSettings is the protected process configuration returned to the frontend.
type ProtectionSettings struct {
	DefaultProcessNames []string `json:"defaultProcessNames"`
	CustomProcessNames  []string `json:"customProcessNames"`
}

// ProtectionRules combines default and user-managed protected process names.
type ProtectionRules struct {
	defaultNames map[string]struct{}
	customNames  map[string]struct{}
}

// DefaultProtectedProcessNames returns a copy of the default protected process names.
func DefaultProtectedProcessNames() []string {
	return append([]string(nil), defaultProtectedProcessNames...)
}

// NormalizeProcessName returns a stable, case-insensitive process key.
func NormalizeProcessName(name string) string {
	normalized := strings.ToLower(strings.TrimSpace(filepath.Base(strings.TrimSpace(name))))
	if normalized == "." {
		return ""
	}

	return normalized
}

// IsDefaultProtectedProcessName reports whether name is protected by the built-in rules.
func IsDefaultProtectedProcessName(name string) bool {
	_, ok := defaultProtectedProcessNameSet[NormalizeProcessName(name)]
	return ok
}

// DefaultProtectionRules returns protection rules containing only built-in names.
func DefaultProtectionRules() ProtectionRules {
	return NewProtectionRules(nil)
}

// NewProtectionRules builds protection rules from default names plus custom process names.
func NewProtectionRules(customNames []string) ProtectionRules {
	return ProtectionRules{
		defaultNames: buildNameSet(defaultProtectedProcessNames),
		customNames:  buildNameSet(customNames),
	}
}

// IsProtectedName reports whether name matches a default or custom protected process.
func (rules ProtectionRules) IsProtectedName(name string) bool {
	normalized := NormalizeProcessName(name)
	if normalized == "" {
		return false
	}

	if _, ok := rules.defaultNames[normalized]; ok {
		return true
	}
	_, ok := rules.customNames[normalized]
	return ok
}

func buildNameSet(names []string) map[string]struct{} {
	set := make(map[string]struct{}, len(names))
	for _, name := range names {
		normalized := NormalizeProcessName(name)
		if normalized == "" {
			continue
		}
		set[normalized] = struct{}{}
	}

	return set
}
