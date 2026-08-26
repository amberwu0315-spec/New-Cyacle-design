declare const permissionCodeBrand: unique symbol

/**
 * 权限编码的基础类型。
 *
 * Base 与各 edition 都通过 `definePermissionCodeDictionary` 创建权限字典，
 * 避免将普通业务字符串误传给权限查询或权限守卫。
 */
export type PermissionCode<TCode extends string = string> = TCode & {
  readonly [permissionCodeBrand]: 'PermissionCode'
}

export interface PermissionCodeDefinition<
  TCode extends string = string,
> {
  readonly code: PermissionCode<TCode>
  readonly description: string
}

type PermissionCodeDefinitionInput = {
  readonly code: string
  readonly description: string
}

export type PermissionCodeDictionary<
  TDictionary extends Record<string, PermissionCodeDefinitionInput>,
> = {
  readonly [TKey in keyof TDictionary]: Omit<TDictionary[TKey], 'code'> & {
    readonly code: PermissionCode<TDictionary[TKey]['code']>
  }
}

/**
 * 创建类型安全的权限字典。
 *
 * edition 可以使用同一个 helper 定义自己的权限编码，但专属编码仍保留在
 * edition 内部，不进入 Base 的通用业务权限字典。
 */
export function definePermissionCodeDictionary<
  const TDictionary extends Record<string, PermissionCodeDefinitionInput>,
>(dictionary: TDictionary): PermissionCodeDictionary<TDictionary> {
  return dictionary as unknown as PermissionCodeDictionary<TDictionary>
}

export function getPermissionCodeList<
  const TDictionary extends Record<
    string,
    PermissionCodeDefinition<string>
  >,
>(dictionary: TDictionary): Array<TDictionary[keyof TDictionary]['code']> {
  return Object.values(dictionary).map(
    (definition) => definition.code,
  ) as Array<TDictionary[keyof TDictionary]['code']>
}

/**
 * 标准版业务和管理后台共用的权限数据字典。
 *
 * 这里只登记当前仍会进入 `checkPermissions` 的通用权限。药明等 edition 的
 * 专属权限由 edition 自己维护；已废弃的场景权限 `carbon_footprint`、`CFO`
 * 不得重新加入。
 */
export const COMMON_PERMISSION_CODES = definePermissionCodeDictionary({
  // 账户与组织设置
  account: { code: 'account', description: '访问个人账户、空间和安全设置' },
  order: { code: 'order', description: '访问个人付款订单' },
  ticket: { code: 'ticket', description: '访问个人工单' },
  orgProfileManagement: {
    code: 'org_profile_mgt',
    description: '访问和管理企业资料',
  },
  orgStructureManagement: {
    code: 'org_structure_mgt',
    description: '访问和管理组织架构',
  },
  employeeManagement: {
    code: 'employee_mgt',
    description: '访问员工管理',
  },
  roleManagement: { code: 'role', description: '访问角色和权限管理' },
  ssoOauth: { code: 'SSO_oauth', description: '访问 SSO/OAuth 配置' },
  auditLog: { code: 'audit_log', description: '访问操作日志' },
  editOrgProfile: {
    code: 'profile_org_edit',
    description: '编辑企业资料',
  },
  editEmployee: { code: 'edit_employee', description: '编辑员工信息' },
  disableEmployee: {
    code: 'disable_employee',
    description: '启用或禁用员工',
  },
  updateEmployeeRole: {
    code: 'update_employee_role',
    description: '调整员工关联角色',
  },
  createRole: { code: 'create_role', description: '创建角色' },
  editRole: { code: 'edit_role', description: '编辑角色及角色权限' },
  deleteRole: { code: 'delete_role', description: '删除角色' },

  // 服务商基础数据
  serviceProvider: {
    code: 'service_provider',
    description: '访问服务商基础数据场景',
  },
  database: { code: 'database', description: '访问因子数据库' },
  elementManagement: { code: 'element_mgt', description: '访问元素管理' },
  elementCreate: { code: 'element_new', description: '新建元素' },
  elementEdit: { code: 'element_edit', description: '编辑元素' },
  elementDelete: { code: 'element_delete', description: '删除元素' },
  documentFactor: { code: 'document_factor', description: '访问文献因子' },
  documentFactorCreate: {
    code: 'document_factor_new',
    description: '新建文献因子',
  },
  documentFactorEdit: {
    code: 'document_factor_edit',
    description: '编辑文献因子',
  },
  documentFactorDelete: {
    code: 'document_factor_delete',
    description: '删除文献因子',
  },
  baseFlowFactor: {
    code: 'base_flow_factor',
    description: '访问基础流因子',
  },
  compositeFactor: {
    code: 'composite_factor',
    description: '访问复合因子',
  },
  compositeFactorCreate: {
    code: 'composite_factor_new',
    description: '新建复合因子',
  },
  compositeFactorEdit: {
    code: 'composite_factor_edit',
    description: '编辑复合因子',
  },
  compositeFactorDelete: {
    code: 'composite_factor_delete',
    description: '删除复合因子',
  },
  formulaManagement: { code: 'formula_mgt', description: '访问公式管理' },
  referenceManagement: {
    code: 'reference_mgt',
    description: '访问参考文献管理',
  },
  enterpriseServed: {
    code: 'enterprise_served',
    description: '访问服务企业和研究对象',
  },

  // 核算、项目与组织数据
  accounting: { code: 'accounting', description: '访问 CFP/LCA 核算' },
  cfoAccounting: { code: 'cfo_accounting', description: '访问 CFO 核算' },
  commonEmission: {
    code: 'common_emission',
    description: '访问 CFO 常用排放源',
  },
  projectCreate: { code: 'project_create', description: '创建核算项目' },
  projectExecution: {
    code: 'project_execution',
    description: '访问项目执行功能',
  },
  projectModelEdit: {
    code: 'project_model_edit',
    description: '编辑项目模型和项目执行数据',
  },
  dataRecord: { code: 'data_record', description: '访问数据记录' },
  dataRecordCreate: {
    code: 'data_record_new',
    description: '新建数据记录',
  },
  dataRecordEdit: {
    code: 'data_record_edit',
    description: '编辑数据记录',
  },
  dataRecordDelete: {
    code: 'data_record_delete',
    description: '删除数据记录',
  },
  dataSource: { code: 'data_source', description: '访问数据源' },
  productManagement: {
    code: 'product_management',
    description: '访问产品管理',
  },
  productCreate: { code: 'product_new', description: '新建产品' },
  productEdit: { code: 'product_edit', description: '编辑产品' },
  productDelete: { code: 'product_delete', description: '删除产品' },
  locationManagement: { code: 'location_mgt', description: '访问地点管理' },
  files: { code: 'files', description: '访问文件管理' },

  // 通用管理后台
  organizationMatrix: {
    code: 'organization_matrix',
    description: '管理后台组织管理',
  },
  userListMatrix: {
    code: 'user_list_matrix',
    description: '管理后台用户列表',
  },
  userRoleAppMatrix: {
    code: 'user_role_app_matrix',
    description: '管理后台应用角色管理',
  },
  permissionAppMatrix: {
    code: 'permission_app_matrix',
    description: '管理后台应用权限管理',
  },
  ticketMatrix: {
    code: 'cyacle_ticket_matrix',
    description: '管理后台工单管理',
  },
  dataDictionaryMatrix: {
    code: 'data_dictionary_matrix',
    description: '管理后台数据字典',
  },
  operationRecordsMatrix: {
    code: 'operation_records_matrix',
    description: '管理后台操作记录',
  },
  workspaceMatrix: {
    code: 'cyacle_workspace_matrix',
    description: '管理后台工作空间管理',
  },
  workspaceProjectCopyMatrix: {
    code: 'workspace_project_copy_matrix',
    description: '在工作空间之间复制项目',
  },
  subscriptionPlanManagementMatrix: {
    code: 'subscription_plan_mgt_matrix',
    description: '管理后台订阅计划管理',
  },
  subscriptionPlanDeleteMatrix: {
    code: 'subscription_plan_delete_matrix',
    description: '管理后台删除订阅计划',
  },
  featureManagementMatrix: {
    code: 'cyacle_feature_mgt_matrix',
    description: '管理后台功能管理',
  },
  userCreateMatrix: {
    code: 'user_create_matrix',
    description: '管理后台创建用户',
  },
  userEditMatrix: {
    code: 'user_edit_matrix',
    description: '管理后台编辑用户',
  },
  userBanMatrix: {
    code: 'user_ban_matrix',
    description: '管理后台启用或禁用用户',
  },
  appRoleCreateMatrix: {
    code: 'app_role_create_matrix',
    description: '管理后台创建应用角色',
  },
  appRoleDeleteMatrix: {
    code: 'app_role_delete_matrix',
    description: '管理后台删除应用角色',
  },
  appPermissionCreateMatrix: {
    code: 'app_permission_create_matrix',
    description: '管理后台创建应用权限',
  },

  // 因子与单位管理后台
  referenceMatrix: {
    code: 'reference_matrix',
    description: '管理后台参考文献管理',
  },
  rawFactorMatrix: {
    code: 'raw_factor_matrix',
    description: '管理后台原始因子管理',
  },
  sitedFactorMatrix: {
    code: 'sited_factor_matrix',
    description: '管理后台本地化因子管理',
  },
  elementMatrix: {
    code: 'element_matrix',
    description: '管理后台元素管理',
  },
  categoryMatrix: {
    code: 'category_matrix',
    description: '管理后台分类管理',
  },
  unitMatrix: { code: 'unit_matrix', description: '管理后台单位管理' },
  createUnitMatrix: {
    code: 'create_unit_matrix',
    description: '管理后台创建单位',
  },
  updateUnit: { code: 'update_unit', description: '管理后台编辑单位' },
  databaseMatrix: {
    code: 'database_matrix',
    description: '管理后台因子数据库管理',
  },
  officialMethodologyMatrix: {
    code: 'official_methodology_matrix',
    description: '管理后台官方方法学管理',
  },
  productrualFactorMatrix: {
    // 后端现有编码包含 `productrual` 拼写，迁移时必须保持原值。
    code: 'productrual_factor_matrix',
    description: '管理后台产品因子管理',
  },
  projectDownload: {
    code: 'project_download',
    description: '管理后台项目下载',
  },
})

export type CommonPermissionCode =
  (typeof COMMON_PERMISSION_CODES)[keyof typeof COMMON_PERMISSION_CODES]['code']

export const COMMON_PERMISSION_CODE_LIST = getPermissionCodeList(
  COMMON_PERMISSION_CODES,
)
