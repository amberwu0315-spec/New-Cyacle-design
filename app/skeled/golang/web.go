package app

import (
	"reflect"

	"go.yorun.ai/vine/core/web"
)

func init() {
	web.Register(_WebWebSpec)
}

var _WebWebSpec = &web.WebSpec{
	Name:              "WebWeb",
	SkelName:          "app.WebWeb",
	Hash:              "f11b8fad",
	ServerType:        reflect.TypeFor[WebWebServer](),
	DefaultServerType: reflect.TypeFor[*DefaultWebWebServer](),
}

// WebWebServer WebWeb入口
type WebWebServer interface {
	web.Handler

	mustBeWebWebServer()
}

type DefaultWebWebServer struct {
}

func (*DefaultWebWebServer) Routes(*web.Router) {
	panic("method routes is not implemented")
}

func (*DefaultWebWebServer) mustBeWebWebServer() {}
