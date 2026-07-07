# Dev Resource Manager

A Wails desktop application scaffolded with Go, React, TypeScript, and Vite.

## Run

Run the desktop app with live reload:

```bash
wails dev
```

## Build / Release

Build the Windows executable:

```powershell
.\scripts\build-windows.ps1
```

Build the unsigned Windows installer:

```powershell
.\scripts\package-windows.ps1
```

GitHub Actions provides a manual **Windows Release Build** workflow that uploads the unsigned Windows build as an artifact.

See [docs/release-windows.md](docs/release-windows.md) for environment setup, artifact locations, installer verification, unsigned-app notes, signing placeholders, and the GitHub Release flow.
