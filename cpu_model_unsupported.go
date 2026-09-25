//go:build !windows

package main

func collectCPUModelNameFallback() string {
	return ""
}
