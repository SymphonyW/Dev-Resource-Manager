package process

import (
	"context"

	"dev-resource-manager/internal/config"
)

// Protector checks whether a process name should be protected from termination.
type Protector interface {
	IsProtectedName(name string) bool
}

// IsProtectedName reports whether a process name is protected by current default or custom rules.
func IsProtectedName(name string) bool {
	rules, err := config.LoadDefaultProtectionRules(context.Background())
	if err != nil {
		return config.IsDefaultProtectedProcessName(name)
	}

	return rules.IsProtectedName(name)
}
