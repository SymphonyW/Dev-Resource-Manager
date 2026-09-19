//go:build !windows

package process

// IconDataURLForPath is only implemented on Windows.
func IconDataURLForPath(path string) string {
	return ""
}
