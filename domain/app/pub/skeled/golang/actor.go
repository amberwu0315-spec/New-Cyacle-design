package apppub

import (
	"go.yorun.ai/vine/core/meta"
	"go.yorun.ai/vine/core/skel"
)

func init() {
	meta.RegisterActor(meta.ActorSpec{
		Name:     "UserActor",
		SkelName: "app.UserActor",
		Hash:     "cdf51931",
	})
}

// UserActor user
type UserActor struct {
	skel.ActorBase
}

func (UserActor) Name() string {
	return "UserActor"
}

func (UserActor) SkelName() string {
	return "app.UserActor"
}

func (UserActor) Vias() []skel.ActorVia {
	return []skel.ActorVia{
		skel.ActorViaClient,
	}
}
