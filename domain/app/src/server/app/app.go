package app

import "go.yorun.ai/vine/app"

type AppApp struct {
	app.Application
}

func init() {
	app.Register[*AppApp]()
}

func (*AppApp) Name() string {
	return "app"
}
