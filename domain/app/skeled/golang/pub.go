package app

import "go.cew.io/app/carbonnt/cyacle/skeled/apppub"

type ItemType = apppub.ItemType

const (
	ItemTypeUnspecified = apppub.ItemTypeUnspecified
	ItemTypePlain       = apppub.ItemTypePlain
	ItemTypeCtxVar      = apppub.ItemTypeCtxVar
	ItemTypeUnit        = apppub.ItemTypeUnit
)

type Item = apppub.Item
type MMacroText = apppub.MMacroText
type MString = apppub.MString
type MStringItem[TItem any] = apppub.MStringItem[TItem]
type MacroText = apppub.MacroText
type PageResp[TItem any] = apppub.PageResp[TItem]
type UnitValue = apppub.UnitValue

type UserActor = apppub.UserActor
type UserActorCredential = apppub.UserActorCredential
type UserActorInfo = apppub.UserActorInfo
type UserActorAuthServiceServer = apppub.UserActorAuthServiceServer
type UserActorAuthServiceServerER = apppub.UserActorAuthServiceServerER
type DefaultUserActorAuthServiceServer = apppub.DefaultUserActorAuthServiceServer
type DefaultUserActorAuthServiceServerER = apppub.DefaultUserActorAuthServiceServerER
