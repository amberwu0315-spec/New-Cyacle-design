package basepub

import (
	"reflect"

	"go.yorun.ai/vine/core/ex"
	"go.yorun.ai/vine/core/meta"
	"go.yorun.ai/vine/core/rpc"
	"go.yorun.ai/vine/core/skel"
)

func init() {
	meta.RegisterActor(meta.ActorSpec{
		Name:         "UserActor",
		SkelName:     "base.UserActor",
		Hash:         "023d183d",
		InfoSkelName: "base.UserActorInfo",
		InfoType:     reflect.TypeFor[*UserActorInfo](),
	})
	rpc.Register(_UserActorAuthServiceSpec)
}

// UserActor 用户参与者
type UserActor struct {
	skel.ActorBase
}

func (UserActor) Name() string {
	return "UserActor"
}

func (UserActor) SkelName() string {
	return "base.UserActor"
}

func (UserActor) Vias() []skel.ActorVia {
	return []skel.ActorVia{
		skel.ActorViaClient,
	}
}

type UserActorCredential struct {
	// Session 会话
	Session string `json:"session"`
	// Scope 应用权限范围 多个用,隔开
	Scope string `json:"scope"`
}

type UserActorInfo struct {
	// UserId 接收人用户ID
	UserId int `json:"userId"`
	// Username 用户名字段名称
	Username string `json:"username"`
	// WorkspaceId 工作空间ID
	WorkspaceId string `json:"workspaceId"`
}

// UserActorAuthServiceServer

// UserActorAuthService / Spec

var (
	_UserActorAuthServiceSpec = &rpc.ServiceSpec{
		Type:              rpc.ServiceSpecTypeServer,
		Name:              "UserActorAuthService",
		SkelName:          "base.UserActorAuthService",
		Hash:              "b4095500",
		ServerType:        reflect.TypeFor[UserActorAuthServiceServer](),
		DefaultServerType: reflect.TypeFor[*DefaultUserActorAuthServiceServer](),

		ERServerType:        reflect.TypeFor[UserActorAuthServiceServerER](),
		WrapperERServerCtor: _NewWrapperUserActorAuthServiceServerER,
		DefaultERServerType: reflect.TypeFor[*DefaultUserActorAuthServiceServerER](),
		Methods: []*rpc.MethodSpec{
			_UserActorAuthServiceAuthSpec,
		},
	}
	_UserActorAuthServiceAuthSpec = &rpc.MethodSpec{
		Name:                        "Auth",
		SkelName:                    "auth",
		ArgumentsType:               reflect.TypeFor[_UserActorAuthServiceAuthArguments](),
		ValidateArguments:           nil,
		ResultType:                  reflect.TypeFor[UserActorInfo](),
		ValidateResult:              nil,
		ArgumentsContainsBinaryType: false,
		ResultContainsBinaryType:    false,
		MethodFuncs: []any{
			UserActorAuthServiceServer.Auth,
			UserActorAuthServiceServerER.Auth,
		},
	}
)

// UserActorAuthService / Arguments

type _UserActorAuthServiceAuthArguments struct {
	Credential UserActorCredential `json:"credential" arg:"0"`
}

// UserActorAuthService / Server

type UserActorAuthServiceServer interface {
	// Auth。
	Auth(credential UserActorCredential) UserActorInfo

	mustBeUserActorAuthServiceServer()
}

// UserActorAuthService / Server / DefaultServer

type DefaultUserActorAuthServiceServer struct{}

func (*DefaultUserActorAuthServiceServer) Auth(UserActorCredential) UserActorInfo {
	ex.PanicNew(ex.InvalidRequest, "method auth is not implemented")
	return UserActorInfo{}
}

func (*DefaultUserActorAuthServiceServer) mustBeUserActorAuthServiceServer() {}

// UserActorAuthService / ERServer

type UserActorAuthServiceServerER interface {
	Auth(credential UserActorCredential) (UserActorInfo, ex.Error)

	mustBeUserActorAuthServiceServerER()
}

// UserActorAuthService / ERServer / WrapperERServer

type _WrapperUserActorAuthServiceServerER struct {
	DefaultUserActorAuthServiceServer
	serverImpl UserActorAuthServiceServer
}

func _NewWrapperUserActorAuthServiceServerER(serverImpl UserActorAuthServiceServer) UserActorAuthServiceServerER {
	return &_WrapperUserActorAuthServiceServerER{
		serverImpl: serverImpl,
	}
}

func (service *_WrapperUserActorAuthServiceServerER) server() UserActorAuthServiceServer {
	if service.serverImpl == nil {
		return &service.DefaultUserActorAuthServiceServer
	}
	return service.serverImpl
}

func (service *_WrapperUserActorAuthServiceServerER) Auth(credential UserActorCredential) (ret UserActorInfo, err ex.Error) {
	defer func() { err = ex.Recover(recover()) }()
	ret = service.server().Auth(credential)
	return
}

func (*_WrapperUserActorAuthServiceServerER) mustBeUserActorAuthServiceServerER() {}

// UserActorAuthService / ERServer / DefaultERServer

type DefaultUserActorAuthServiceServerER struct {
	_WrapperUserActorAuthServiceServerER
}
