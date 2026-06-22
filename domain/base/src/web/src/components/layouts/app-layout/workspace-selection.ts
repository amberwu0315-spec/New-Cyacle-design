export type WorkspaceSelectionItem = {
  id: string
  scope: string
  belongType?: string | null
  belongId?: string | null
  belongDisplayName?: string | null
  belongName?: string | null
  name: string
  describe?: string | null
  iconUrl?: string | null
}

export type WorkspaceSelectionResult = {
  workspaceId: string
  scope: string
}

export type WorkspaceAutoSelectionResolver = (
  workspaces: Array<WorkspaceSelectionItem>,
) => WorkspaceSelectionItem | null
