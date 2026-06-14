//go:build !production

package impl

import (
	"encoding/json"
	"fmt"
	"net"
	"net/http"
	"net/url"
	"os"
	"strconv"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	skeled "go.cew.io/app/carbonnt/cyacle/skeled/app"
	"go.yorun.ai/vine/core/web"
)

type _DevState struct {
	Host string `json:"host"`
	Port int `json:"port"`
}

const devReverseProxyWatchInterval = time.Second

type _DevReverseProxy struct {
	stateFilePath string
	mutex         sync.RWMutex
	port          int
	proxy         *web.ReverseProxy
	err           error
}

const WebWebDevStateFilePath = "/Users/kapta/Desktop/carbonnt/cyacle/.cache/web/dev-state.json"

var WebWebImplDevProxy = newDevReverseProxy(WebWebDevStateFilePath)

type WebWebImpl struct {
	skeled.DefaultWebWebServer

	GinCtx *gin.Context `inject:""`
}

func (h *WebWebImpl) Routes(r *web.Router) {
	r.ANY("/*path", h.ProxyDevServer)
}

func (h *WebWebImpl) ProxyDevServer() {
	if !WebWebImplDevProxy.Serve(h.GinCtx) {
		h.GinCtx.AbortWithStatus(http.StatusBadGateway)
	}
}

func newDevReverseProxy(stateFilePath string) *_DevReverseProxy {
	proxy := &_DevReverseProxy{
		stateFilePath: stateFilePath,
	}
	proxy.reload()
	go proxy.watch()
	return proxy
}

func (p *_DevReverseProxy) Serve(ginCtx *gin.Context) bool {
	p.mutex.RLock()
	proxy := p.proxy
	err := p.err
	p.mutex.RUnlock()

	if err != nil {
		ginCtx.String(http.StatusBadGateway, err.Error())
		return true
	}
	if proxy == nil {
		ginCtx.String(http.StatusBadGateway, "dev server proxy is not initialized")
		return true
	}
	return proxy.Serve(ginCtx)
}

func (p *_DevReverseProxy) watch() {
	ticker := time.NewTicker(devReverseProxyWatchInterval)
	for range ticker.C {
		p.reload()
	}
}

func (p *_DevReverseProxy) reload() {
	proxy, port, err := readDevReverseProxy(p.stateFilePath)

	p.mutex.Lock()
	defer p.mutex.Unlock()
	if err != nil {
		p.err = err
		return
	}
	if p.port == port {
		p.err = nil
		return
	}
	p.port = port
	p.proxy = proxy
	p.err = nil
}

func readDevReverseProxy(stateFilePath string) (*web.ReverseProxy, int, error) {
	state := &_DevState{}
	content, err := os.ReadFile(stateFilePath)
	if err != nil {
		return nil, 0, fmt.Errorf("read dev state %s: %w", stateFilePath, err)
	}
	err = json.Unmarshal(content, state)
	if err != nil {
		return nil, 0, fmt.Errorf("parse dev state %s: %w", stateFilePath, err)
	}
	if state.Port <= 0 {
		return nil, 0, fmt.Errorf("invalid dev server port %d in %s", state.Port, stateFilePath)
	}

	return web.NewReverseProxy(web.ProxyOption{Target: &url.URL{
		Scheme: "http",
		Host:   devReverseProxyHost(state.Host, state.Port),
	}}), state.Port, nil
}

func devReverseProxyHost(host string, port int) string {
	if host == "" {
		host = "127.0.0.1"
	}
	return net.JoinHostPort(host, strconv.Itoa(port))
}
