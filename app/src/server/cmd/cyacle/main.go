package main

import (
	_ "go.cew.io/app/carbonnt/cyacle/skeled/basepub"
	appapp "go.cew.io/app/carbonnt/cyacle/server/app/app"
	unitapp "go.cew.io/app/carbonnt/cyacle/server/unit/app"
	categoryapp "go.cew.io/app/carbonnt/cyacle/server/category/app"
	formulaapp "go.cew.io/app/carbonnt/cyacle/server/formula/app"
	"go.yorun.ai/vine/app"
)

func main() {
	app.NewBundledStandalone(
		app.NewStandalone[*unitapp.UnitApp](),
		app.NewStandalone[*categoryapp.CategoryApp](),
		app.NewStandalone[*formulaapp.FormulaApp](),
		app.NewStandalone[*appapp.AppApp](),
	).StartAndWait()
}
