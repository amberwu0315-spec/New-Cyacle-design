package app

import "go.yorun.ai/vine/core/skel"

func init() {
	skel.RegisterDomainSchema(_DomainSchema)
}

var _DomainSchema = &skel.DomainSchema{
	Domain: "app",
	Hash:   "99468fe4",
	Full:   true,
	Generated: &skel.GeneratedInfo{
		CompilerVersion: "v1.1.32",
	},
	Webs: []*skel.WebSchema{
		{
			Name:     "WebWeb",
			SkelName: "app.WebWeb",
			Hash:     "12e0f763",
			Allows: []*skel.ActorAllowSchema{
				{Name: "UserActor", SkelName: "base.UserActor", Via: skel.ActorViaClient},
			},
		},
	},
}
