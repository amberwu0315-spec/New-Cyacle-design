package basepub

import "go.yorun.ai/vine/core/skel"

func init() {
	skel.RegisterDomainSchema(_DomainSchema)
}

var _DomainSchema = &skel.DomainSchema{
	Domain: "base",
	Hash:   "dce78875",
	Full:   false,
	Generated: &skel.GeneratedInfo{
		CompilerVersion: "v0.9.2",
	},

	Enums: []*skel.EnumSchema{
		{
			Name:        "ItemType",
			SkelName:    "base.ItemType",
			Description: "宏文本片段类型",
			Hash:        "c7abbf72",
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
			SkelName:    "base.Item",
			Description: "宏文本片段",
			Hash:        "afc08aec",
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
						SkelName: "base.ItemType",
						Nullable: true,
					},
				},
			},
		},
		{
			Name:        "MMacroText",
			SkelName:    "base.MMacroText",
			Description: "多语言宏文本",
			Hash:        "092327ae",
			Members: []*skel.MemberSchema{
				{
					Name:        "zh",
					Description: "中文",
					Type: &skel.TypeSchema{
						Kind:     skel.TypeKindData,
						Name:     "MStringItem",
						SkelName: "base.MStringItem",
						TypeArguments: []*skel.TypeSchema{
							{
								Kind:     skel.TypeKindData,
								Name:     "MacroText",
								SkelName: "base.MacroText",
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
						SkelName: "base.MStringItem",
						TypeArguments: []*skel.TypeSchema{
							{
								Kind:     skel.TypeKindData,
								Name:     "MacroText",
								SkelName: "base.MacroText",
							},
						},
						Nullable: true,
					},
				},
			},
		},
		{
			Name:        "MString",
			SkelName:    "base.MString",
			Description: "多语言普通文本",
			Hash:        "9f79b9e0",
			Members: []*skel.MemberSchema{
				{
					Name:        "zh",
					Description: "中文",
					Type: &skel.TypeSchema{
						Kind:     skel.TypeKindData,
						Name:     "MStringItem",
						SkelName: "base.MStringItem",
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
						SkelName: "base.MStringItem",
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
			SkelName:    "base.MStringItem",
			Description: "多语言中的单一语言内容",
			Hash:        "ad48046e",
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
			SkelName:    "base.MacroText",
			Description: "宏文本",
			Hash:        "266c0ea1",
			Members: []*skel.MemberSchema{
				{
					Name:        "items",
					Description: "宏文片段列表",
					Type: &skel.TypeSchema{
						Kind: skel.TypeKindList,
						Element: &skel.TypeSchema{
							Kind:     skel.TypeKindData,
							Name:     "Item",
							SkelName: "base.Item",
						},
						Nullable: true,
					},
				},
			},
		},
		{
			Name:        "PageResp",
			SkelName:    "base.PageResp",
			Description: "分页结果",
			Hash:        "f67b8d77",
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
			SkelName:    "base.UnitValue",
			Description: "数值带单位",
			Hash:        "e2c54182",
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
			SkelName:    "base.UserActor",
			Description: "用户参与者",
			Hash:        "023d183d",
			Vias: []skel.ActorVia{
				skel.ActorViaClient,
			},
			AuthEnabled: true,
			AuthCredential: &skel.DataSchema{
				Name:     "UserActorCredential",
				SkelName: "base.UserActorCredential",
				Hash:     "3e83beeb",
				Members: []*skel.MemberSchema{
					{
						Name:        "session",
						Description: "会话",
						Type: &skel.TypeSchema{
							Kind:   skel.TypeKindScalar,
							Scalar: skel.ScalarString,
						},
					},
					{
						Name:        "scope",
						Description: "应用权限范围 多个用,隔开",
						Type: &skel.TypeSchema{
							Kind:   skel.TypeKindScalar,
							Scalar: skel.ScalarString,
						},
					},
				},
			},
			AuthInfo: &skel.DataSchema{
				Name:     "UserActorInfo",
				SkelName: "base.UserActorInfo",
				Hash:     "cb58a5c7",
				Members: []*skel.MemberSchema{
					{
						Name:        "userId",
						Description: "接收人用户ID",
						Type: &skel.TypeSchema{
							Kind:   skel.TypeKindScalar,
							Scalar: skel.ScalarInt,
						},
					},
					{
						Name:        "username",
						Description: "用户名字段名称",
						Type: &skel.TypeSchema{
							Kind:   skel.TypeKindScalar,
							Scalar: skel.ScalarString,
						},
					},
					{
						Name:        "workspaceId",
						Description: "工作空间ID",
						Type: &skel.TypeSchema{
							Kind:   skel.TypeKindScalar,
							Scalar: skel.ScalarString,
						},
					},
				},
			},
			AuthService: &skel.ServiceSchema{
				Name:     "UserActorAuthService",
				SkelName: "base.UserActorAuthService",
				Hash:     "b4095500",
				Pub:      false,
				AuthMode: skel.AuthModeUnset,
				Methods: []*skel.MethodSchema{
					{
						Name:     "auth",
						SkelName: "auth",
						Hash:     "8f139ac1",
						AuthMode: skel.AuthModeAuth,
						Arguments: []*skel.MemberSchema{
							{
								Name: "credential",
								Type: &skel.TypeSchema{
									Kind:     skel.TypeKindData,
									Name:     "UserActorCredential",
									SkelName: "base.UserActorCredential",
								},
							},
						},
						ResultType: &skel.TypeSchema{
							Kind:     skel.TypeKindData,
							Name:     "UserActorInfo",
							SkelName: "base.UserActorInfo",
						},
					},
				},
			},
			AuthMethod: &skel.MethodSchema{
				Name:     "auth",
				SkelName: "auth",
				Hash:     "8f139ac1",
				AuthMode: skel.AuthModeAuth,
				Arguments: []*skel.MemberSchema{
					{
						Name: "credential",
						Type: &skel.TypeSchema{
							Kind:     skel.TypeKindData,
							Name:     "UserActorCredential",
							SkelName: "base.UserActorCredential",
						},
					},
				},
				ResultType: &skel.TypeSchema{
					Kind:     skel.TypeKindData,
					Name:     "UserActorInfo",
					SkelName: "base.UserActorInfo",
				},
			},
			PermEnabled: false,
		},
	},
}
