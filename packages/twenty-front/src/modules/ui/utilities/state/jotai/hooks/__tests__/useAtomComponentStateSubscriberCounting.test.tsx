import { renderHook } from '@testing-library/react';
import { Provider as JotaiProvider } from 'jotai';
import { type ReactNode } from 'react';

import { createComponentInstanceContext } from '@/ui/utilities/state/component-state/utils/createComponentInstanceContext';
import { destroyComponentStateContextScope } from '@/ui/utilities/state/component-state/utils/componentStateContextScopeRegistry';
import {
  clearSubscriberCountsForInstance,
  getTotalSubscriberCountForInstance,
} from '@/ui/utilities/state/component-state/utils/componentStateSubscriberRegistry';
import { createAtomComponentState } from '@/ui/utilities/state/jotai/utils/createAtomComponentState';
import { createAtomComponentFamilyState } from '@/ui/utilities/state/jotai/utils/createAtomComponentFamilyState';
import { useAtomComponentState } from '../useAtomComponentState';
import { useAtomComponentStateValue } from '../useAtomComponentStateValue';
import { useSetAtomComponentState } from '../useSetAtomComponentState';
import { useAtomComponentStateCallbackState } from '../useAtomComponentStateCallbackState';
import { useAtomComponentFamilyState } from '../useAtomComponentFamilyState';
import { useAtomComponentFamilyStateValue } from '../useAtomComponentFamilyStateValue';
import { useSetAtomComponentFamilyState } from '../useSetAtomComponentFamilyState';
import { useAtomComponentFamilyStateCallbackState } from '../useAtomComponentFamilyStateCallbackState';
import { jotaiStore, resetJotaiStore } from '@/ui/utilities/state/jotai/jotaiStore';

const TestContext = createComponentInstanceContext();

const INSTANCE_ID = 'test-instance-gc';

const testBooleanState = createAtomComponentState<boolean>({
  key: 'testBooleanStateForGCTest',
  defaultValue: false,
  componentInstanceContext: TestContext,
});

const testFamilyState = createAtomComponentFamilyState<string, { id: string }>({
  key: 'testFamilyStateForGCTest',
  defaultValue: '',
  componentInstanceContext: TestContext,
});

const createWrapper = (instanceId: string) => {
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <JotaiProvider store={jotaiStore}>
      <TestContext.Provider value={{ instanceId }}>
        {children}
      </TestContext.Provider>
    </JotaiProvider>
  );
  return Wrapper;
};

beforeEach(() => {
  resetJotaiStore();
  clearSubscriberCountsForInstance(INSTANCE_ID);
  destroyComponentStateContextScope(INSTANCE_ID);
});

describe('useAtomComponentStateValue — subscriber counting', () => {
  it('increments subscriber count on mount and decrements on unmount', () => {
    const { unmount } = renderHook(
      () => useAtomComponentStateValue(testBooleanState),
      { wrapper: createWrapper(INSTANCE_ID) },
    );

    expect(getTotalSubscriberCountForInstance(INSTANCE_ID)).toBe(1);

    unmount();

    expect(getTotalSubscriberCountForInstance(INSTANCE_ID)).toBe(0);
  });
});

describe('useSetAtomComponentState — subscriber counting', () => {
  it('increments subscriber count on mount and decrements on unmount', () => {
    const { unmount } = renderHook(
      () => useSetAtomComponentState(testBooleanState),
      { wrapper: createWrapper(INSTANCE_ID) },
    );

    expect(getTotalSubscriberCountForInstance(INSTANCE_ID)).toBe(1);

    unmount();

    expect(getTotalSubscriberCountForInstance(INSTANCE_ID)).toBe(0);
  });
});

describe('useAtomComponentState — subscriber counting', () => {
  it('increments subscriber count on mount and decrements on unmount', () => {
    const { unmount } = renderHook(
      () => useAtomComponentState(testBooleanState),
      { wrapper: createWrapper(INSTANCE_ID) },
    );

    expect(getTotalSubscriberCountForInstance(INSTANCE_ID)).toBe(1);

    unmount();

    expect(getTotalSubscriberCountForInstance(INSTANCE_ID)).toBe(0);
  });
});

describe('useAtomComponentStateCallbackState — subscriber counting', () => {
  it('increments subscriber count on mount and decrements on unmount', () => {
    const { unmount } = renderHook(
      () => useAtomComponentStateCallbackState(testBooleanState),
      { wrapper: createWrapper(INSTANCE_ID) },
    );

    expect(getTotalSubscriberCountForInstance(INSTANCE_ID)).toBe(1);

    unmount();

    expect(getTotalSubscriberCountForInstance(INSTANCE_ID)).toBe(0);
  });
});

describe('useAtomComponentFamilyStateValue — subscriber counting', () => {
  it('increments subscriber count on mount and decrements on unmount', () => {
    const { unmount } = renderHook(
      () => useAtomComponentFamilyStateValue(testFamilyState, { id: 'row-1' }),
      { wrapper: createWrapper(INSTANCE_ID) },
    );

    expect(getTotalSubscriberCountForInstance(INSTANCE_ID)).toBe(1);

    unmount();

    expect(getTotalSubscriberCountForInstance(INSTANCE_ID)).toBe(0);
  });
});

describe('useSetAtomComponentFamilyState — subscriber counting', () => {
  it('increments subscriber count on mount and decrements on unmount', () => {
    const { unmount } = renderHook(
      () => useSetAtomComponentFamilyState(testFamilyState, { id: 'row-1' }),
      { wrapper: createWrapper(INSTANCE_ID) },
    );

    expect(getTotalSubscriberCountForInstance(INSTANCE_ID)).toBe(1);

    unmount();

    expect(getTotalSubscriberCountForInstance(INSTANCE_ID)).toBe(0);
  });
});

describe('useAtomComponentFamilyState — subscriber counting', () => {
  it('increments subscriber count on mount and decrements on unmount', () => {
    const { unmount } = renderHook(
      () => useAtomComponentFamilyState(testFamilyState, { id: 'row-1' }),
      { wrapper: createWrapper(INSTANCE_ID) },
    );

    expect(getTotalSubscriberCountForInstance(INSTANCE_ID)).toBe(1);

    unmount();

    expect(getTotalSubscriberCountForInstance(INSTANCE_ID)).toBe(0);
  });
});

describe('useAtomComponentFamilyStateCallbackState — subscriber counting', () => {
  it('increments subscriber count on mount and decrements on unmount', () => {
    const { unmount } = renderHook(
      () => useAtomComponentFamilyStateCallbackState(testFamilyState),
      { wrapper: createWrapper(INSTANCE_ID) },
    );

    expect(getTotalSubscriberCountForInstance(INSTANCE_ID)).toBe(1);

    unmount();

    expect(getTotalSubscriberCountForInstance(INSTANCE_ID)).toBe(0);
  });
});

describe('multiple hooks — cumulative subscriber counting', () => {
  it('counts all active hooks for an instance', () => {
    const hookA = renderHook(
      () => useAtomComponentStateValue(testBooleanState),
      { wrapper: createWrapper(INSTANCE_ID) },
    );
    const hookB = renderHook(
      () => useSetAtomComponentState(testBooleanState),
      { wrapper: createWrapper(INSTANCE_ID) },
    );

    expect(getTotalSubscriberCountForInstance(INSTANCE_ID)).toBe(2);

    hookA.unmount();
    expect(getTotalSubscriberCountForInstance(INSTANCE_ID)).toBe(1);

    hookB.unmount();
    expect(getTotalSubscriberCountForInstance(INSTANCE_ID)).toBe(0);
  });
});

describe('destroyComponentStateContextScope — atom cache eviction', () => {
  it('removes the atom from the factory cache so re-access creates a fresh atom', () => {
    renderHook(() => useAtomComponentStateValue(testBooleanState), {
      wrapper: createWrapper(INSTANCE_ID),
    }).unmount();

    const atomBeforeDestroy = testBooleanState.atomFamily({
      instanceId: INSTANCE_ID,
    });

    destroyComponentStateContextScope(INSTANCE_ID);

    const atomAfterDestroy = testBooleanState.atomFamily({
      instanceId: INSTANCE_ID,
    });

    expect(atomAfterDestroy).not.toBe(atomBeforeDestroy);
  });

  it('fresh atom after cleanup has defaultValue', () => {
    jotaiStore.set(
      testBooleanState.atomFamily({ instanceId: INSTANCE_ID }),
      true,
    );

    destroyComponentStateContextScope(INSTANCE_ID);

    const freshAtom = testBooleanState.atomFamily({ instanceId: INSTANCE_ID });
    expect(jotaiStore.get(freshAtom)).toBe(false);
  });

  it('cleans up family atoms matching the instanceId prefix', () => {
    renderHook(
      () => useAtomComponentFamilyStateValue(testFamilyState, { id: 'row-1' }),
      { wrapper: createWrapper(INSTANCE_ID) },
    ).unmount();
    renderHook(
      () => useAtomComponentFamilyStateValue(testFamilyState, { id: 'row-2' }),
      { wrapper: createWrapper(INSTANCE_ID) },
    ).unmount();

    const atomRow1Before = testFamilyState.atomFamily({
      instanceId: INSTANCE_ID,
      familyKey: { id: 'row-1' },
    });
    const atomRow2Before = testFamilyState.atomFamily({
      instanceId: INSTANCE_ID,
      familyKey: { id: 'row-2' },
    });

    destroyComponentStateContextScope(INSTANCE_ID);

    const atomRow1After = testFamilyState.atomFamily({
      instanceId: INSTANCE_ID,
      familyKey: { id: 'row-1' },
    });
    const atomRow2After = testFamilyState.atomFamily({
      instanceId: INSTANCE_ID,
      familyKey: { id: 'row-2' },
    });

    expect(atomRow1After).not.toBe(atomRow1Before);
    expect(atomRow2After).not.toBe(atomRow2Before);
  });
});
