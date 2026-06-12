package apppub

import "go.yorun.ai/vine/core/skel"

func init() {
	skel.RegisterDomainSchema(_DomainSchema)
}

var _DomainSchema = &skel.DomainSchema{
	Domain: "app",
	Hash:   "f797c96f",
	Full:   false,
	Generated: &skel.GeneratedInfo{
		CompilerVersion: "v1.1.25",
	},
	Enums: []*skel.EnumSchema{
		{
			Name:        "ItemType",
			SkelName:    "app.ItemType",
			Description: "宏文本片段类型",
			Hash:        "361d34bf",
			Items: []*skel.EnumItemSchema{
				{
					Name:        "PLAIN",
					Description: "普通文本",
				},
				{
					Name:        "CTX_VAR",
					Description: "占位符",
				},
				{
					Name:        "UNIT",
					Description: "单位",
				},
			},
		},
	},
	Data: []*skel.DataSchema{
		{
			Name:        "Item",
			SkelName:    "app.Item",
			Description: "宏文本片段",
			Hash:        "48476f1a",
			Members: []*skel.MemberSchema{
				{
					Name:        "value",
					Description: "宏文本片段内容",
					Type: &skel.TypeSchema{
						Kind:     skel.TypeKindScalar,
						Scalar:   skel.ScalarString,
						Nullable: true,
					},
				},
				{
					Name:        "type",
					Description: "宏文本片段类型",
					Type: &skel.TypeSchema{
						Kind:     skel.TypeKindEnum,
						Name:     "ItemType",
						SkelName: "app.ItemType",
						Nullable: true,
					},
				},
			},
		},
		{
			Name:        "MMacroText",
			SkelName:    "app.MMacroText",
			Description: "多语言宏文本",
			Hash:        "cf54da24",
			Members: []*skel.MemberSchema{
				{
					Name:        "zh",
					Description: "中文",
					Type: &skel.TypeSchema{
						Kind:     skel.TypeKindData,
						Name:     "MStringItem",
						SkelName: "app.MStringItem",
						TypeArguments: []*skel.TypeSchema{
							{
								Kind:     skel.TypeKindData,
								Name:     "MacroText",
								SkelName: "app.MacroText",
							},
						},
						Nullable: true,
					},
				},
				{
					Name:        "en",
					Description: "英文",
					Type: &skel.TypeSchema{
						Kind:     skel.TypeKindData,
						Name:     "MStringItem",
						SkelName: "app.MStringItem",
						TypeArguments: []*skel.TypeSchema{
							{
								Kind:     skel.TypeKindData,
								Name:     "MacroText",
								SkelName: "app.MacroText",
							},
						},
						Nullable: true,
					},
				},
			},
		},
		{
			Name:        "MString",
			SkelName:    "app.MString",
			Description: "多语言普通文本",
			Hash:        "def6b786",
			Members: []*skel.MemberSchema{
				{
					Name:        "zh",
					Description: "中文",
					Type: &skel.TypeSchema{
						Kind:     skel.TypeKindData,
						Name:     "MStringItem",
						SkelName: "app.MStringItem",
						TypeArguments: []*skel.TypeSchema{
							{
								Kind:   skel.TypeKindScalar,
								Scalar: skel.ScalarString,
							},
						},
						Nullable: true,
					},
				},
				{
					Name:        "en",
					Description: "英文",
					Type: &skel.TypeSchema{
						Kind:     skel.TypeKindData,
						Name:     "MStringItem",
						SkelName: "app.MStringItem",
						TypeArguments: []*skel.TypeSchema{
							{
								Kind:   skel.TypeKindScalar,
								Scalar: skel.ScalarString,
							},
						},
						Nullable: true,
					},
				},
			},
		},
		{
			Name:        "MStringItem",
			SkelName:    "app.MStringItem",
			Description: "多语言中的单一语言内容",
			Hash:        "9a8b86c4",
			TypeParameters: []string{
				"TItem",
			},
			Members: []*skel.MemberSchema{
				{
					Name:        "value",
					Description: "内容",
					Type: &skel.TypeSchema{
						Kind:     skel.TypeKindTypeParameter,
						Name:     "TItem",
						Nullable: true,
					},
				},
				{
					Name:        "updatedAt",
					Description: "数据更新时间",
					Type: &skel.TypeSchema{
						Kind:     skel.TypeKindScalar,
						Scalar:   skel.ScalarTimestamp,
						Nullable: true,
					},
				},
				{
					Name:        "fromAI",
					Description: "是否来源于AI, 如翻译",
					Type: &skel.TypeSchema{
						Kind:   skel.TypeKindScalar,
						Scalar: skel.ScalarBool,
					},
				},
			},
		},
		{
			Name:        "MacroText",
			SkelName:    "app.MacroText",
			Description: "宏文本",
			Hash:        "a49d0fd4",
			Members: []*skel.MemberSchema{
				{
					Name:        "items",
					Description: "宏文片段列表",
					Type: &skel.TypeSchema{
						Kind: skel.TypeKindList,
						Element: &skel.TypeSchema{
							Kind:     skel.TypeKindData,
							Name:     "Item",
							SkelName: "app.Item",
						},
						Nullable: true,
					},
				},
			},
		},
		{
			Name:        "PageResp",
			SkelName:    "app.PageResp",
			Description: "分页结果",
			Hash:        "f1f4470d",
			TypeParameters: []string{
				"TItem",
			},
			Members: []*skel.MemberSchema{
				{
					Name:        "total",
					Description: "总数",
					Type: &skel.TypeSchema{
						Kind:   skel.TypeKindScalar,
						Scalar: skel.ScalarInt,
					},
				},
				{
					Name:        "data",
					Description: "数据",
					Type: &skel.TypeSchema{
						Kind: skel.TypeKindList,
						Element: &skel.TypeSchema{
							Kind: skel.TypeKindTypeParameter,
							Name: "TItem",
						},
						Nullable: true,
					},
				},
			},
		},
		{
			Name:        "UnitValue",
			SkelName:    "app.UnitValue",
			Description: "数值带单位",
			Hash:        "f8dd2449",
			Members: []*skel.MemberSchema{
				{
					Name:        "value",
					Description: "数值",
					Type: &skel.TypeSchema{
						Kind:     skel.TypeKindScalar,
						Scalar:   skel.ScalarDecimal,
						Nullable: true,
					},
				},
				{
					Name:        "unitId",
					Description: "单位id",
					Type: &skel.TypeSchema{
						Kind:     skel.TypeKindScalar,
						Scalar:   skel.ScalarString,
						Nullable: true,
					},
				},
			},
		},
	},
	Actors: []*skel.ActorSchema{
		{
			Name:        "UserActor",
			SkelName:    "app.UserActor",
			Description: "user",
			Hash:        "f301f4ab",
			Vias: []skel.ActorVia{
				skel.ActorViaClient,
			},
			AuthEnabled: true,
			AuthCredential: &skel.DataSchema{
				Name:     "UserActorCredential",
				SkelName: "app.UserActorCredential",
				Hash:     "31f4b931",
				Members: []*skel.MemberSchema{
					{
						Name: "session",
						Type: &skel.TypeSchema{
							Kind:   skel.TypeKindScalar,
							Scalar: skel.ScalarString,
						},
					},
					{
						Name: "scope",
						Type: &skel.TypeSchema{
							Kind:   skel.TypeKindScalar,
							Scalar: skel.ScalarString,
						},
					},
				},
			},
			AuthInfo: &skel.DataSchema{
				Name:     "UserActorInfo",
				SkelName: "app.UserActorInfo",
				Hash:     "f83f0c12",
				Members: []*skel.MemberSchema{
					{
						Name: "userId",
						Type: &skel.TypeSchema{
							Kind:   skel.TypeKindScalar,
							Scalar: skel.ScalarInt,
						},
					},
					{
						Name: "workspaceId",
						Type: &skel.TypeSchema{
							Kind:   skel.TypeKindScalar,
							Scalar: skel.ScalarString,
						},
					},
				},
			},
			AuthService: &skel.ServiceSchema{
				Name:     "UserActorAuthService",
				SkelName: "app.UserActorAuthService",
				Hash:     "2fb2007b",
				Pub:      false,
				AuthMode: skel.AuthModeUnset,
				Methods: []*skel.MethodSchema{
					{
						Name:     "auth",
						SkelName: "auth",
						Hash:     "75210953",
						AuthMode: skel.AuthModeAuth,
						Arguments: []*skel.MemberSchema{
							{
								Name: "credential",
								Type: &skel.TypeSchema{
									Kind:     skel.TypeKindData,
									Name:     "UserActorCredential",
									SkelName: "app.UserActorCredential",
								},
							},
						},
						ResultType: &skel.TypeSchema{
							Kind:     skel.TypeKindData,
							Name:     "UserActorInfo",
							SkelName: "app.UserActorInfo",
						},
					},
				},
			},
			AuthMethod: &skel.MethodSchema{
				Name:     "auth",
				SkelName: "auth",
				Hash:     "75210953",
				AuthMode: skel.AuthModeAuth,
				Arguments: []*skel.MemberSchema{
					{
						Name: "credential",
						Type: &skel.TypeSchema{
							Kind:     skel.TypeKindData,
							Name:     "UserActorCredential",
							SkelName: "app.UserActorCredential",
						},
					},
				},
				ResultType: &skel.TypeSchema{
					Kind:     skel.TypeKindData,
					Name:     "UserActorInfo",
					SkelName: "app.UserActorInfo",
				},
			},
			PermEnabled: false,
		},
	},
}
