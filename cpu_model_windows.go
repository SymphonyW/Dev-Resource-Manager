//go:build windows

package main

import (
	"strings"

	"golang.org/x/sys/windows/registry"
)

const processorNameRegistryPath = `HARDWARE\DESCRIPTION\System\CentralProcessor\0`

func collectCPUModelNameFallback() string {
	key, err := registry.OpenKey(registry.LOCAL_MACHINE, processorNameRegistryPath, registry.QUERY_VALUE)
	if err != nil {
		return ""
	}
	defer key.Close()

	modelName, _, err := key.GetStringValue("ProcessorNameString")
	if err != nil {
		return ""
	}

	return strings.TrimSpace(modelName)
}
