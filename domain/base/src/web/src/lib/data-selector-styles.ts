/**
 * 数据选择弹框的搜索框只保留焦点边框，不显示 Crew UI 默认的 3px ring。
 *
 * DataView / SearchBox 使用 `classNames`，旧式 Input 搜索框使用 `className`。
 */
export const DATA_SELECTOR_SEARCH_BOX_CLASS_NAMES = {
  inputGroup:
    'focus-within:ring-0! has-[[data-slot=input-group-control]:focus-visible]:ring-0!',
} as const

export const DATA_SELECTOR_SEARCH_INPUT_CLASS_NAME = 'focus-visible:ring-0!'
