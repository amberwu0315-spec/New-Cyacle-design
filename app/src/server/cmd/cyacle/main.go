package main

import (
	_ "go.cew.io/app/carbonnt/cyacle/skeled/basepub"
	appapp "go.cew.io/app/carbonnt/cyacle/server/app/app"
	fileapp "go.cew.io/app/carbonnt/cyacle/server/file/app"
	uicapp "go.cew.io/app/carbonnt/cyacle/server/uic/app"
	"go.yorun.ai/vine/app"
)

func main() {
	app.NewBundledStandalone(
		app.NewStandalone[*fileapp.FileApp](),
		app.NewStandalone[*uicapp.UicApp](),
		app.NewStandalone[*appapp.AppApp](),
	).StartAndWait()
}
