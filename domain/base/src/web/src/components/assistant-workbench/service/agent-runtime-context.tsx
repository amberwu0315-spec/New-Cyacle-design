import * as React from 'react'

export interface AssistantAgentUserContext {
  operatorId?: string | null
  organizationId?: string | null
  workspaceId?: string | null
}

const AssistantAgentUserContext =
  React.createContext<AssistantAgentUserContext>({})

export interface AssistantAgentUserContextProviderProps {
  children: React.ReactNode
  value?: AssistantAgentUserContext | null
}

export function AssistantAgentUserContextProvider({
  children,
  value,
}: AssistantAgentUserContextProviderProps) {
  const contextValue = React.useMemo(
    () => ({
      operatorId: value?.operatorId ?? null,
      organizationId: value?.organizationId ?? null,
      workspaceId: value?.workspaceId ?? null,
    }),
    [value?.operatorId, value?.organizationId, value?.workspaceId],
  )

  return (
    <AssistantAgentUserContext.Provider value={contextValue}>
      {children}
    </AssistantAgentUserContext.Provider>
  )
}

export function useAssistantAgentUserContext() {
  return React.useContext(AssistantAgentUserContext)
}
