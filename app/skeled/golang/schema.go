package app

import "go.yorun.ai/vine/core/skel"

func init() {
	skel.RegisterDomainSchema(_DomainSchema)
}

var _DomainSchema = &skel.DomainSchema{
	Domain: "app",
	Hash:   "3809ccf9",
	Full:   true,
	Generated: &skel.GeneratedInfo{
		CompilerVersion: "v1.1.34",
	},
	Webs: []*skel.WebSchema{
		{
			Name:        "WebWeb",
			SkelName:    "app.WebWeb",
			Description: "WebWeb入口",
			Hash:        "f11b8fad",
			Allows: []*skel.ActorAllowSchema{
				{Name: "UserActor", SkelName: "base.UserActor", Via: skel.ActorViaClient},
			},
		},
	},
}
