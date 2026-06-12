package app

import (
	vineapp "go.yorun.ai/vine/app"
	"go.yorun.ai/vine/core/di"

	"go.cew.io/app/carbonnt/cyacle/server/app/impl"
)

func (*AppApp) WebberBind(*di.Binder) {}

func (*AppApp) WebberInitFilters(vineapp.TypeAdder) {}

func (*AppApp) WebberInitHandlers(addHandler vineapp.TypeAdder) {
	addHandler(vineapp.T[*impl.WebWebImpl]())
}
