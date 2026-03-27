import {
  clearSubscriberCountsForInstance,
  decrementComponentStateSubscriberCount,
  getComponentStateSubscriberCount,
  getTotalSubscriberCountForInstance,
  incrementComponentStateSubscriberCount,
} from '../componentStateSubscriberRegistry';

const STATE_KEY_A = 'stateKeyA';
const STATE_KEY_B = 'stateKeyB';
const INSTANCE_ID = 'instance-1';
const OTHER_INSTANCE_ID = 'instance-2';

afterEach(() => {
  clearSubscriberCountsForInstance(INSTANCE_ID);
  clearSubscriberCountsForInstance(OTHER_INSTANCE_ID);
});

describe('incrementComponentStateSubscriberCount', () => {
  it('returns 1 on first increment', () => {
    expect(
      incrementComponentStateSubscriberCount(STATE_KEY_A, INSTANCE_ID),
    ).toBe(1);
  });

  it('returns incremented value on subsequent calls', () => {
    incrementComponentStateSubscriberCount(STATE_KEY_A, INSTANCE_ID);
    expect(
      incrementComponentStateSubscriberCount(STATE_KEY_A, INSTANCE_ID),
    ).toBe(2);
  });

  it('tracks different state keys independently', () => {
    incrementComponentStateSubscriberCount(STATE_KEY_A, INSTANCE_ID);
    expect(
      incrementComponentStateSubscriberCount(STATE_KEY_B, INSTANCE_ID),
    ).toBe(1);
  });
});

describe('decrementComponentStateSubscriberCount', () => {
  it('returns 0 when decrementing from 0', () => {
    expect(
      decrementComponentStateSubscriberCount(STATE_KEY_A, INSTANCE_ID),
    ).toBe(0);
  });

  it('returns decremented count', () => {
    incrementComponentStateSubscriberCount(STATE_KEY_A, INSTANCE_ID);
    incrementComponentStateSubscriberCount(STATE_KEY_A, INSTANCE_ID);
    expect(
      decrementComponentStateSubscriberCount(STATE_KEY_A, INSTANCE_ID),
    ).toBe(1);
  });

  it('removes the map entry when count reaches 0', () => {
    incrementComponentStateSubscriberCount(STATE_KEY_A, INSTANCE_ID);
    decrementComponentStateSubscriberCount(STATE_KEY_A, INSTANCE_ID);
    expect(getComponentStateSubscriberCount(STATE_KEY_A, INSTANCE_ID)).toBe(0);
  });

  it('does not go below 0', () => {
    decrementComponentStateSubscriberCount(STATE_KEY_A, INSTANCE_ID);
    decrementComponentStateSubscriberCount(STATE_KEY_A, INSTANCE_ID);
    expect(getComponentStateSubscriberCount(STATE_KEY_A, INSTANCE_ID)).toBe(0);
  });
});

describe('getComponentStateSubscriberCount', () => {
  it('returns 0 for unknown key', () => {
    expect(getComponentStateSubscriberCount('unknownKey', INSTANCE_ID)).toBe(0);
  });

  it('returns correct count after increments', () => {
    incrementComponentStateSubscriberCount(STATE_KEY_A, INSTANCE_ID);
    incrementComponentStateSubscriberCount(STATE_KEY_A, INSTANCE_ID);
    incrementComponentStateSubscriberCount(STATE_KEY_A, INSTANCE_ID);
    expect(getComponentStateSubscriberCount(STATE_KEY_A, INSTANCE_ID)).toBe(3);
  });
});

describe('getTotalSubscriberCountForInstance', () => {
  it('returns 0 for unknown instanceId', () => {
    expect(getTotalSubscriberCountForInstance('unknown-instance')).toBe(0);
  });

  it('sums across multiple state keys for the same instanceId', () => {
    incrementComponentStateSubscriberCount(STATE_KEY_A, INSTANCE_ID);
    incrementComponentStateSubscriberCount(STATE_KEY_A, INSTANCE_ID);
    incrementComponentStateSubscriberCount(STATE_KEY_B, INSTANCE_ID);
    expect(getTotalSubscriberCountForInstance(INSTANCE_ID)).toBe(3);
  });

  it('does not include counts from other instances', () => {
    incrementComponentStateSubscriberCount(STATE_KEY_A, INSTANCE_ID);
    incrementComponentStateSubscriberCount(STATE_KEY_A, OTHER_INSTANCE_ID);
    expect(getTotalSubscriberCountForInstance(INSTANCE_ID)).toBe(1);
  });

  it('returns 0 after all subscribers decrement', () => {
    incrementComponentStateSubscriberCount(STATE_KEY_A, INSTANCE_ID);
    incrementComponentStateSubscriberCount(STATE_KEY_B, INSTANCE_ID);
    decrementComponentStateSubscriberCount(STATE_KEY_A, INSTANCE_ID);
    decrementComponentStateSubscriberCount(STATE_KEY_B, INSTANCE_ID);
    expect(getTotalSubscriberCountForInstance(INSTANCE_ID)).toBe(0);
  });
});

describe('clearSubscriberCountsForInstance', () => {
  it('removes all entries for the given instanceId', () => {
    incrementComponentStateSubscriberCount(STATE_KEY_A, INSTANCE_ID);
    incrementComponentStateSubscriberCount(STATE_KEY_B, INSTANCE_ID);
    clearSubscriberCountsForInstance(INSTANCE_ID);
    expect(getTotalSubscriberCountForInstance(INSTANCE_ID)).toBe(0);
  });

  it('does not affect other instances', () => {
    incrementComponentStateSubscriberCount(STATE_KEY_A, INSTANCE_ID);
    incrementComponentStateSubscriberCount(STATE_KEY_A, OTHER_INSTANCE_ID);
    clearSubscriberCountsForInstance(INSTANCE_ID);
    expect(getTotalSubscriberCountForInstance(OTHER_INSTANCE_ID)).toBe(1);
  });
});
