//go:build windows

package process

import (
	"bytes"
	"encoding/base64"
	"fmt"
	"image"
	"image/png"
	"path/filepath"
	"strings"
	"sync"
	"unsafe"

	"golang.org/x/sys/windows"
)

const (
	maxProcessIconCacheEntries = 256

	shgfiIcon      = 0x000000100
	shgfiSmallIcon = 0x000000001

	biRGB        = 0
	dibRGBColors = 0
)

var (
	processIconCacheMu sync.Mutex
	processIconCache   = make(map[string]string)

	shell32DLL         = windows.NewLazySystemDLL("shell32.dll")
	user32DLL          = windows.NewLazySystemDLL("user32.dll")
	gdi32DLL           = windows.NewLazySystemDLL("gdi32.dll")
	procSHGetFileInfoW = shell32DLL.NewProc("SHGetFileInfoW")
	procDestroyIcon    = user32DLL.NewProc("DestroyIcon")
	procGetIconInfo    = user32DLL.NewProc("GetIconInfo")
	procGetDC          = user32DLL.NewProc("GetDC")
	procReleaseDC      = user32DLL.NewProc("ReleaseDC")
	procDeleteObject   = gdi32DLL.NewProc("DeleteObject")
	procGetObjectW     = gdi32DLL.NewProc("GetObjectW")
	procGetDIBits      = gdi32DLL.NewProc("GetDIBits")
)

type shFileInfo struct {
	hIcon         windows.Handle
	iIcon         int32
	dwAttributes  uint32
	szDisplayName [windows.MAX_PATH]uint16
	szTypeName    [80]uint16
}

type iconInfo struct {
	fIcon    int32
	xHotspot uint32
	yHotspot uint32
	hbmMask  windows.Handle
	hbmColor windows.Handle
}

type bitmap struct {
	bmType       int32
	bmWidth      int32
	bmHeight     int32
	bmWidthBytes int32
	bmPlanes     uint16
	bmBitsPixel  uint16
	bmBits       uintptr
}

type bitmapInfoHeader struct {
	biSize          uint32
	biWidth         int32
	biHeight        int32
	biPlanes        uint16
	biBitCount      uint16
	biCompression   uint32
	biSizeImage     uint32
	biXPelsPerMeter int32
	biYPelsPerMeter int32
	biClrUsed       uint32
	biClrImportant  uint32
}

type rgbQuad struct {
	rgbBlue     byte
	rgbGreen    byte
	rgbRed      byte
	rgbReserved byte
}

type bitmapInfo struct {
	bmiHeader bitmapInfoHeader
	bmiColors [1]rgbQuad
}

// IconDataURLForPath returns a cached small executable icon encoded as a PNG data URL.
func IconDataURLForPath(path string) string {
	normalizedPath := normalizeIconPath(path)
	if normalizedPath == "" {
		return ""
	}

	processIconCacheMu.Lock()
	if cachedIcon, ok := processIconCache[normalizedPath]; ok {
		processIconCacheMu.Unlock()
		return cachedIcon
	}
	processIconCacheMu.Unlock()

	iconDataURL, err := extractIconDataURL(normalizedPath)
	if err != nil {
		iconDataURL = ""
	}

	processIconCacheMu.Lock()
	if len(processIconCache) >= maxProcessIconCacheEntries {
		processIconCache = make(map[string]string)
	}
	processIconCache[normalizedPath] = iconDataURL
	processIconCacheMu.Unlock()

	return iconDataURL
}

func normalizeIconPath(path string) string {
	trimmedPath := strings.TrimSpace(path)
	if trimmedPath == "" {
		return ""
	}

	return strings.ToLower(filepath.Clean(trimmedPath))
}

func extractIconDataURL(path string) (string, error) {
	pathPtr, err := windows.UTF16PtrFromString(path)
	if err != nil {
		return "", fmt.Errorf("prepare icon path: %w", err)
	}

	var fileInfo shFileInfo
	result, _, callErr := procSHGetFileInfoW.Call(
		uintptr(unsafe.Pointer(pathPtr)),
		0,
		uintptr(unsafe.Pointer(&fileInfo)),
		unsafe.Sizeof(fileInfo),
		uintptr(shgfiIcon|shgfiSmallIcon),
	)
	if result == 0 || fileInfo.hIcon == 0 {
		if callErr != windows.ERROR_SUCCESS {
			return "", fmt.Errorf("read shell icon: %w", callErr)
		}
		return "", fmt.Errorf("read shell icon: no icon returned")
	}
	defer procDestroyIcon.Call(uintptr(fileInfo.hIcon))

	return iconToDataURL(fileInfo.hIcon)
}

func iconToDataURL(icon windows.Handle) (string, error) {
	var info iconInfo
	result, _, callErr := procGetIconInfo.Call(
		uintptr(icon),
		uintptr(unsafe.Pointer(&info)),
	)
	if result == 0 {
		return "", fmt.Errorf("read icon bitmap handles: %w", callErr)
	}
	if info.hbmColor != 0 {
		defer procDeleteObject.Call(uintptr(info.hbmColor))
	}
	if info.hbmMask != 0 {
		defer procDeleteObject.Call(uintptr(info.hbmMask))
	}
	if info.hbmColor == 0 {
		return "", fmt.Errorf("read icon bitmap handles: missing color bitmap")
	}

	var bm bitmap
	result, _, callErr = procGetObjectW.Call(
		uintptr(info.hbmColor),
		unsafe.Sizeof(bm),
		uintptr(unsafe.Pointer(&bm)),
	)
	if result == 0 {
		return "", fmt.Errorf("read icon bitmap metadata: %w", callErr)
	}
	if bm.bmWidth <= 0 || bm.bmHeight <= 0 {
		return "", fmt.Errorf("read icon bitmap metadata: invalid size %dx%d", bm.bmWidth, bm.bmHeight)
	}

	imageBytes, width, height, err := bitmapPixels(info.hbmColor, int(bm.bmWidth), int(bm.bmHeight))
	if err != nil {
		return "", err
	}

	img := image.NewNRGBA(image.Rect(0, 0, width, height))
	hasAlpha := false
	for sourceIndex, targetIndex := 0, 0; sourceIndex < len(imageBytes); sourceIndex, targetIndex = sourceIndex+4, targetIndex+4 {
		blue := imageBytes[sourceIndex]
		green := imageBytes[sourceIndex+1]
		red := imageBytes[sourceIndex+2]
		alpha := imageBytes[sourceIndex+3]
		if alpha != 0 {
			hasAlpha = true
		}

		img.Pix[targetIndex] = red
		img.Pix[targetIndex+1] = green
		img.Pix[targetIndex+2] = blue
		img.Pix[targetIndex+3] = alpha
	}
	if !hasAlpha {
		for index := 3; index < len(img.Pix); index += 4 {
			img.Pix[index] = 255
		}
	}

	var pngBuffer bytes.Buffer
	if err := png.Encode(&pngBuffer, img); err != nil {
		return "", fmt.Errorf("encode icon PNG: %w", err)
	}

	return "data:image/png;base64," + base64.StdEncoding.EncodeToString(pngBuffer.Bytes()), nil
}

func bitmapPixels(handle windows.Handle, width int, height int) ([]byte, int, int, error) {
	deviceContext, _, callErr := procGetDC.Call(0)
	if deviceContext == 0 {
		return nil, 0, 0, fmt.Errorf("read icon bitmap pixels: get device context: %w", callErr)
	}
	defer procReleaseDC.Call(0, deviceContext)

	pixels := make([]byte, width*height*4)
	header := bitmapInfoHeader{
		biSize:        uint32(unsafe.Sizeof(bitmapInfoHeader{})),
		biWidth:       int32(width),
		biHeight:      -int32(height),
		biPlanes:      1,
		biBitCount:    32,
		biCompression: biRGB,
	}
	info := bitmapInfo{bmiHeader: header}

	result, _, callErr := procGetDIBits.Call(
		deviceContext,
		uintptr(handle),
		0,
		uintptr(height),
		uintptr(unsafe.Pointer(&pixels[0])),
		uintptr(unsafe.Pointer(&info)),
		dibRGBColors,
	)
	if result == 0 {
		return nil, 0, 0, fmt.Errorf("read icon bitmap pixels: %w", callErr)
	}

	return pixels, width, height, nil
}
