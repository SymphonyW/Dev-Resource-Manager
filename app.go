package main

import "context"

// App struct
type App struct {
	ctx context.Context
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{}
}

// startup is called when the app starts. The context is saved
// so we can call the runtime methods
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
}

// AppName returns the desktop application name through the Wails binding.
func (a *App) AppName() string {
	return "Dev Resource Manager"
}
