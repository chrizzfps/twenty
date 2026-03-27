const subscriberCounts = new Map<string, number>();

const buildSubscriberKey = (stateKey: string, instanceId: string): string =>
  `${stateKey}__${instanceId}`;

export const incrementComponentStateSubscriberCount = (
  stateKey: string,
  instanceId: string,
): number => {
  const key = buildSubscriberKey(stateKey, instanceId);
  const current = subscriberCounts.get(key) ?? 0;
  const next = current + 1;
  subscriberCounts.set(key, next);
  return next;
};

export const decrementComponentStateSubscriberCount = (
  stateKey: string,
  instanceId: string,
): number => {
  const key = buildSubscriberKey(stateKey, instanceId);
  const current = subscriberCounts.get(key) ?? 0;
  const next = Math.max(0, current - 1);
  if (next === 0) {
    subscriberCounts.delete(key);
  } else {
    subscriberCounts.set(key, next);
  }
  return next;
};

export const getComponentStateSubscriberCount = (
  stateKey: string,
  instanceId: string,
): number => {
  return subscriberCounts.get(buildSubscriberKey(stateKey, instanceId)) ?? 0;
};

export const getTotalSubscriberCountForInstance = (
  instanceId: string,
): number => {
  const suffix = `__${instanceId}`;
  let total = 0;
  for (const [key, count] of subscriberCounts) {
    if (key.endsWith(suffix)) {
      total += count;
    }
  }
  return total;
};

export const clearSubscriberCountsForInstance = (instanceId: string): void => {
  const suffix = `__${instanceId}`;
  for (const key of subscriberCounts.keys()) {
    if (key.endsWith(suffix)) {
      subscriberCounts.delete(key);
    }
  }
};
