package main

import (
	_ "go.cew.io/app/carbonnt/cyacle/skeled/basepub"
	appapp "go.cew.io/app/carbonnt/cyacle/server/app/app"
	factorapp "go.cew.io/app/carbonnt/cyacle/server/factor/app"
	fileapp "go.cew.io/app/carbonnt/cyacle/server/file/app"
	projectdataapp "go.cew.io/app/carbonnt/cyacle/server/project/data/app"
	uicapp "go.cew.io/app/carbonnt/cyacle/server/uic/app"
	unitapp "go.cew.io/app/carbonnt/cyacle/server/unit/app"
	metaapp "go.cew.io/app/carbonnt/cyacle/server/meta/app"
	categoryapp "go.cew.io/app/carbonnt/cyacle/server/category/app"
	formulaapp "go.cew.io/app/carbonnt/cyacle/server/formula/app"
	lcacoreapp "go.cew.io/app/carbonnt/cyacle/server/lca/core/app"
	"go.yorun.ai/vine/app"
)

func main() {
	app.NewBundledStandalone(
		app.NewStandalone[*factorapp.FactorApp](),
		app.NewStandalone[*fileapp.FileApp](),
		app.NewStandalone[*projectdataapp.ProjectDataApp](),
		app.NewStandalone[*uicapp.UicApp](),
		app.NewStandalone[*unitapp.UnitApp](),
		app.NewStandalone[*metaapp.MetaApp](),
		app.NewStandalone[*categoryapp.CategoryApp](),
		app.NewStandalone[*formulaapp.FormulaApp](),
		app.NewStandalone[*lcacoreapp.LcaCoreApp](),
		app.NewStandalone[*appapp.AppApp](),
	).StartAndWait()
}
