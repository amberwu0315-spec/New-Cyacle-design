package apppub

import "go.yorun.ai/vine/core/skel"

// Item 宏文本片段
type Item struct {
	// Value 宏文本片段内容
	Value *string `json:"value"`
	// Type 宏文本片段类型
	Type *ItemType `json:"type"`
}

// MMacroText 多语言宏文本
type MMacroText struct {
	// Zh 中文
	Zh *MStringItem[MacroText] `json:"zh"`
	// En 英文
	En *MStringItem[MacroText] `json:"en"`
}

// MString 多语言普通文本
type MString struct {
	// Zh 中文
	Zh *MStringItem[string] `json:"zh"`
	// En 英文
	En *MStringItem[string] `json:"en"`
}

// MStringItem 多语言中的单一语言内容
type MStringItem[TItem any] struct {
	// Value 内容
	Value TItem `json:"value"`
	// UpdatedAt 数据更新时间
	UpdatedAt *skel.Timestamp `json:"updatedAt"`
	// FromAi 是否来源于AI, 如翻译
	FromAi bool `json:"fromAI"`
}

// MacroText 宏文本
type MacroText struct {
	// Items 宏文片段列表
	Items []Item `json:"items"`
}

// PageResp 分页结果
type PageResp[TItem any] struct {
	// Total 总数
	Total int `json:"total"`
	// Data 数据
	Data []TItem `json:"data"`
}

// UnitValue 数值带单位
type UnitValue struct {
	// Value 数值
	Value *skel.Decimal `json:"value"`
	// UnitId 单位id
	UnitId *string `json:"unitId"`
}
