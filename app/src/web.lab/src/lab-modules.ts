// lab 自有模块清单：从 app/src/web/src/generated/modules.gen.ts 同步。
// 同步命令：node scripts/lab/sync-modules.mjs
// 不要手改——main 新增 domain 时跑一次同步即可。


import { webDomain as AccountingWebModule } from "@carbonnt-cyacle/web-accounting"
import { webDomain as CarbonAssetsWebModule } from "@carbonnt-cyacle/web-carbon-assets"
import { webDomain as CarbonReductionWebModule } from "@carbonnt-cyacle/web-carbon-reduction"
import { webDomain as CbamWebModule } from "@carbonnt-cyacle/web-cbam"
import { webDomain as CfoWebModule } from "@carbonnt-cyacle/web-cfo"
import { webDomain as CfoReportWebModule } from "@carbonnt-cyacle/web-cfo-report"
import { webDomain as DashboardWebModule } from "@carbonnt-cyacle/web-dashboard"
import { webDomain as LcaWebModule } from "@carbonnt-cyacle/web-lca"
import { webDomain as MarketCarbonWebModule } from "@carbonnt-cyacle/web-market-carbon"
import { webDomain as MaterialWebModule } from "@carbonnt-cyacle/web-material"
import { webDomain as MetaWebModule } from "@carbonnt-cyacle/web-meta"
import { webDomain as PcfFactorApiWebModule } from "@carbonnt-cyacle/web-pcf-factor-api"
import { webDomain as PolicyWebModule } from "@carbonnt-cyacle/web-policy"
import { webDomain as ProjectWebModule } from "@carbonnt-cyacle/web-project"
import { webDomain as ProjectDataWebModule } from "@carbonnt-cyacle/web-project-data"
import { webDomain as RecordWebModule } from "@carbonnt-cyacle/web-record"
import { webDomain as ReportWebModule } from "@carbonnt-cyacle/web-report"
import { webDomain as SupplyChainWebModule } from "@carbonnt-cyacle/web-supply-chain"
import { webDomain as UicWebModule } from "@carbonnt-cyacle/web-uic"
import { webDomain as WorkSupervisionWebModule } from "@carbonnt-cyacle/web-work-supervision"

export const webModules = [
  AccountingWebModule,
  CarbonAssetsWebModule,
  CarbonReductionWebModule,
  CbamWebModule,
  CfoWebModule,
  CfoReportWebModule,
  DashboardWebModule,
  LcaWebModule,
  MarketCarbonWebModule,
  MaterialWebModule,
  MetaWebModule,
  PcfFactorApiWebModule,
  PolicyWebModule,
  ProjectWebModule,
  ProjectDataWebModule,
  RecordWebModule,
  ReportWebModule,
  SupplyChainWebModule,
  UicWebModule,
  WorkSupervisionWebModule,
] as const

export const webModulesById = {
  "accounting": AccountingWebModule,
  "carbon.assets": CarbonAssetsWebModule,
  "carbon.reduction": CarbonReductionWebModule,
  "cbam": CbamWebModule,
  "cfo": CfoWebModule,
  "cfo.report": CfoReportWebModule,
  "dashboard": DashboardWebModule,
  "lca": LcaWebModule,
  "market.carbon": MarketCarbonWebModule,
  "material": MaterialWebModule,
  "meta": MetaWebModule,
  "pcf.factor.api": PcfFactorApiWebModule,
  "policy": PolicyWebModule,
  "project": ProjectWebModule,
  "project.data": ProjectDataWebModule,
  "record": RecordWebModule,
  "report": ReportWebModule,
  "supply.chain": SupplyChainWebModule,
  "uic": UicWebModule,
  "work.supervision": WorkSupervisionWebModule,
} as const
