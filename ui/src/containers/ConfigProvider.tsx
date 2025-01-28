import { useShellHooks } from '@scality/module-federation';

export function useLinkOpener() {
  const { useLinkOpener } = useShellHooks();
  return useLinkOpener();
}
export function useDiscoveredViews() {
  const { useDiscoveredViews } = useShellHooks();
  return useDiscoveredViews();
}
