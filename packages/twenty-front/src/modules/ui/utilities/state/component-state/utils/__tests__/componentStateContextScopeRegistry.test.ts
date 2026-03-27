import {
  destroyComponentStateContextScope,
  getAllRegisteredInstanceIds,
  getRegisteredAtomCountForInstance,
  getTotalRegisteredAtomCount,
  registerAtomCleanupForInstance,
} from '../componentStateContextScopeRegistry';

const INSTANCE_ID = 'instance-1';
const OTHER_INSTANCE_ID = 'instance-2';

afterEach(() => {
  destroyComponentStateContextScope(INSTANCE_ID);
  destroyComponentStateContextScope(OTHER_INSTANCE_ID);
});

describe('registerAtomCleanupForInstance', () => {
  it('registers a cleanup function for an instanceId', () => {
    registerAtomCleanupForInstance(INSTANCE_ID, () => {});
    expect(getRegisteredAtomCountForInstance(INSTANCE_ID)).toBe(1);
  });

  it('registers multiple cleanup functions for the same instanceId', () => {
    registerAtomCleanupForInstance(INSTANCE_ID, () => {});
    registerAtomCleanupForInstance(INSTANCE_ID, () => {});
    registerAtomCleanupForInstance(INSTANCE_ID, () => {});
    expect(getRegisteredAtomCountForInstance(INSTANCE_ID)).toBe(3);
  });
});

describe('destroyComponentStateContextScope', () => {
  it('calls all registered cleanup functions', () => {
    const cleanupA = jest.fn();
    const cleanupB = jest.fn();
    registerAtomCleanupForInstance(INSTANCE_ID, cleanupA);
    registerAtomCleanupForInstance(INSTANCE_ID, cleanupB);

    destroyComponentStateContextScope(INSTANCE_ID);

    expect(cleanupA).toHaveBeenCalledTimes(1);
    expect(cleanupB).toHaveBeenCalledTimes(1);
  });

  it('removes the instanceId from the registry after destruction', () => {
    registerAtomCleanupForInstance(INSTANCE_ID, () => {});
    destroyComponentStateContextScope(INSTANCE_ID);
    expect(getRegisteredAtomCountForInstance(INSTANCE_ID)).toBe(0);
    expect(getAllRegisteredInstanceIds()).not.toContain(INSTANCE_ID);
  });

  it('does nothing if instanceId was never registered', () => {
    expect(() =>
      destroyComponentStateContextScope('never-registered'),
    ).not.toThrow();
  });

  it('does not affect other instanceIds', () => {
    const cleanupOther = jest.fn();
    registerAtomCleanupForInstance(INSTANCE_ID, () => {});
    registerAtomCleanupForInstance(OTHER_INSTANCE_ID, cleanupOther);

    destroyComponentStateContextScope(INSTANCE_ID);

    expect(cleanupOther).not.toHaveBeenCalled();
    expect(getRegisteredAtomCountForInstance(OTHER_INSTANCE_ID)).toBe(1);
  });
});

describe('getRegisteredAtomCountForInstance', () => {
  it('returns 0 for unknown instanceId', () => {
    expect(getRegisteredAtomCountForInstance('unknown')).toBe(0);
  });

  it('returns correct count', () => {
    registerAtomCleanupForInstance(INSTANCE_ID, () => {});
    registerAtomCleanupForInstance(INSTANCE_ID, () => {});
    expect(getRegisteredAtomCountForInstance(INSTANCE_ID)).toBe(2);
  });
});

describe('getTotalRegisteredAtomCount', () => {
  it('returns 0 when no instances are registered', () => {
    expect(getTotalRegisteredAtomCount()).toBe(0);
  });

  it('sums atom counts across all instances', () => {
    registerAtomCleanupForInstance(INSTANCE_ID, () => {});
    registerAtomCleanupForInstance(INSTANCE_ID, () => {});
    registerAtomCleanupForInstance(OTHER_INSTANCE_ID, () => {});
    expect(getTotalRegisteredAtomCount()).toBe(3);
  });

  it('decreases after destroyComponentStateContextScope', () => {
    registerAtomCleanupForInstance(INSTANCE_ID, () => {});
    registerAtomCleanupForInstance(OTHER_INSTANCE_ID, () => {});
    destroyComponentStateContextScope(INSTANCE_ID);
    expect(getTotalRegisteredAtomCount()).toBe(1);
  });
});

describe('getAllRegisteredInstanceIds', () => {
  it('returns empty array when no instances registered', () => {
    expect(getAllRegisteredInstanceIds()).toEqual([]);
  });

  it('returns all registered instanceIds', () => {
    registerAtomCleanupForInstance(INSTANCE_ID, () => {});
    registerAtomCleanupForInstance(OTHER_INSTANCE_ID, () => {});
    const ids = getAllRegisteredInstanceIds();
    expect(ids).toContain(INSTANCE_ID);
    expect(ids).toContain(OTHER_INSTANCE_ID);
  });

  it('does not include destroyed instanceIds', () => {
    registerAtomCleanupForInstance(INSTANCE_ID, () => {});
    destroyComponentStateContextScope(INSTANCE_ID);
    expect(getAllRegisteredInstanceIds()).not.toContain(INSTANCE_ID);
  });
});

describe('factory cleanup integration', () => {
  it('cleanup function removes atom from cache when called via destroyComponentStateContextScope', () => {
    const mockAtomCache = new Map<string, object>();
    const atomRef = {};
    mockAtomCache.set(INSTANCE_ID, atomRef);

    registerAtomCleanupForInstance(INSTANCE_ID, () => {
      mockAtomCache.delete(INSTANCE_ID);
    });

    expect(mockAtomCache.has(INSTANCE_ID)).toBe(true);
    destroyComponentStateContextScope(INSTANCE_ID);
    expect(mockAtomCache.has(INSTANCE_ID)).toBe(false);
  });
});
