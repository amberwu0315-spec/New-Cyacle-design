package base

import "go.cew.io/app/carbonnt/cyacle/skeled/basepub"

type ItemType = basepub.ItemType

const (
	ItemTypeUnspecified = basepub.ItemTypeUnspecified
	ItemTypePlain       = basepub.ItemTypePlain
	ItemTypeCtxVar      = basepub.ItemTypeCtxVar
	ItemTypeUnit        = basepub.ItemTypeUnit
)

type Item = basepub.Item
type MMacroText = basepub.MMacroText
type MString = basepub.MString
type MStringItem[TItem any] = basepub.MStringItem[TItem]
type MacroText = basepub.MacroText
type PageResp[TItem any] = basepub.PageResp[TItem]
type UnitValue = basepub.UnitValue

type UserActor = basepub.UserActor
type UserActorCredential = basepub.UserActorCredential
type UserActorInfo = basepub.UserActorInfo
type UserActorAuthServiceServer = basepub.UserActorAuthServiceServer
type UserActorAuthServiceServerER = basepub.UserActorAuthServiceServerER
type DefaultUserActorAuthServiceServer = basepub.DefaultUserActorAuthServiceServer
type DefaultUserActorAuthServiceServerER = basepub.DefaultUserActorAuthServiceServerER
