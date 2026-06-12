//go:build production

package impl

import (
	"embed"

	"github.com/gin-gonic/gin"
	skeled "go.cew.io/app/carbonnt/cyacle/skeled/app"
	"go.yorun.ai/vine/core/web"
)

//go:embed all:assets/*
var embedAssetsFS embed.FS

var WebWebImplAssetsAccessor = web.NewEmbedAssetsAccessor(embedAssetsFS, "assets/web")

type WebWebImpl struct {
	skeled.DefaultWebWebServer

	GinCtx *gin.Context `inject:""`

	embedAssetsServer web.AssetsServer
}

func (h *WebWebImpl) DIInit() {
	h.embedAssetsServer.SetContext(h.GinCtx)
	h.embedAssetsServer.SetAccessor(WebWebImplAssetsAccessor)
}

func (h *WebWebImpl) Routes(r *web.Router) {
	h.embedAssetsServer.Routes(r)
}
