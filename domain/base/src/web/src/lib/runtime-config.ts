declare const __YORUN_VRPC_CLIENT_VERSION__: string;

export type RuntimeConfig = Readonly<{
  vrpcInvokeUrl: string;
  vrpcClientVersion: string;
}>;

type RuntimeConfigInput = Readonly<{
  vrpcInvokeUrl?: unknown;
}>;

const DEFAULT_VRPC_INVOKE_URL = '/api/invoke';
const VRPC_INVOKE_URL_META_NAME = 'vrpc:invoke-url';
const VRPC_INVOKE_URL_PLACEHOLDER = '__VRPC_INVOKE_URL__';

export const runtimeConfig = resolveRuntimeConfig();

export function resolveRuntimeConfig(
  input: RuntimeConfigInput | undefined = readDocumentRuntimeConfig()
): RuntimeConfig {
  return Object.freeze({
    vrpcInvokeUrl: resolveString(input?.vrpcInvokeUrl, DEFAULT_VRPC_INVOKE_URL),
    vrpcClientVersion: __YORUN_VRPC_CLIENT_VERSION__,
  });
}

function readDocumentRuntimeConfig(): RuntimeConfigInput | undefined {
  if (typeof document === 'undefined') {
    return undefined;
  }

  return {
    vrpcInvokeUrl: document.querySelector<HTMLMetaElement>(
      `meta[name="${VRPC_INVOKE_URL_META_NAME}"]`
    )?.content,
  };
}

function resolveString(value: unknown, fallback: string) {
  if (typeof value !== 'string' || !value || value === VRPC_INVOKE_URL_PLACEHOLDER) {
    return fallback;
  }

  return value;
}
