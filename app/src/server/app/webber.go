package app

import (
	vineapp "go.yorun.ai/vine/app"

	"go.cew.io/app/carbonnt/cyacle/server/app/impl"
)

type AppApp struct {
	vineapp.Application
	vineapp.WebberEnabled
}

func init() {
	vineapp.Register[*AppApp]()
}

func (*AppApp) Name() string {
	return "app"
}

func (*AppApp) WebberInitHandlers(addHandler vineapp.TypeAdder) {
	addHandler(vineapp.T[*impl.WebWebImpl]())
}
