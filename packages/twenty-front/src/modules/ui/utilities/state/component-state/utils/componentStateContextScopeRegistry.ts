const scopeCleanupRegistry = new Map<string, Set<() => void>>();

export const registerAtomCleanupForInstance = (
  instanceId: string,
  cleanup: () => void,
): void => {
  const existing = scopeCleanupRegistry.get(instanceId);
  if (existing !== undefined) {
    existing.add(cleanup);
  } else {
    scopeCleanupRegistry.set(instanceId, new Set([cleanup]));
  }
};

export const destroyComponentStateContextScope = (
  instanceId: string,
): void => {
  const cleanups = scopeCleanupRegistry.get(instanceId);
  if (cleanups === undefined) {
    return;
  }
  for (const cleanup of cleanups) {
    cleanup();
  }
  scopeCleanupRegistry.delete(instanceId);
};

export const getRegisteredAtomCountForInstance = (
  instanceId: string,
): number => {
  return scopeCleanupRegistry.get(instanceId)?.size ?? 0;
};

export const getTotalRegisteredAtomCount = (): number => {
  let total = 0;
  for (const cleanups of scopeCleanupRegistry.values()) {
    total += cleanups.size;
  }
  return total;
};

export const getAllRegisteredInstanceIds = (): string[] => {
  return Array.from(scopeCleanupRegistry.keys());
};
