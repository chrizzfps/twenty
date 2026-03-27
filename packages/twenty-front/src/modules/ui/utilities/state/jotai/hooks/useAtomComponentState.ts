import { useAtom } from 'jotai';
import { useEffect } from 'react';

import { useAvailableComponentInstanceIdOrThrow } from '@/ui/utilities/state/component-state/hooks/useAvailableComponentInstanceIdOrThrow';
import { globalComponentInstanceContextMap } from '@/ui/utilities/state/component-state/utils/globalComponentInstanceContextMap';
import {
  decrementComponentStateSubscriberCount,
  incrementComponentStateSubscriberCount,
} from '@/ui/utilities/state/component-state/utils/componentStateSubscriberRegistry';
import { type ComponentState } from '@/ui/utilities/state/jotai/types/ComponentState';

export const useAtomComponentState = <StateType>(
  componentState: ComponentState<StateType>,
  instanceIdFromProps?: string,
): [
  StateType,
  (value: StateType | ((prev: StateType) => StateType)) => void,
] => {
  const componentInstanceContext = globalComponentInstanceContextMap.get(
    componentState.key,
  );

  if (!componentInstanceContext) {
    throw new Error(
      `Instance context for key "${componentState.key}" is not defined`,
    );
  }

  const instanceId = useAvailableComponentInstanceIdOrThrow(
    componentInstanceContext,
    instanceIdFromProps,
  );

  useEffect(() => {
    incrementComponentStateSubscriberCount(componentState.key, instanceId);
    return () => {
      decrementComponentStateSubscriberCount(componentState.key, instanceId);
    };
  }, [componentState.key, instanceId]);

  return useAtom(componentState.atomFamily({ instanceId }));
};
