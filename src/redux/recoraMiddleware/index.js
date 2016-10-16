// @flow
import { concat, forEach } from 'lodash/fp';
import type { State } from '../../types';
import { getAddedChangedRemovedSectionItems } from '../util';
import getDefaultBatchImpl from './batchImplementation';
import { setSectionResult } from '../index';


const middleware = (
  batchImplementation = getDefaultBatchImpl()
): any => ({ getState, dispatch }) => {
  batchImplementation.addResultListener((sectionId, entries, total) => {
    dispatch(setSectionResult(sectionId, entries, total));
  });

  return next => (action) => {
    const previousState: State = getState();
    const returnValue = next(action);
    const nextState: State = getState();

    if (nextState.customUnits !== previousState.customUnits) {
      batchImplementation.setCustomUnits(nextState.customUnits);
    }

    const { added, changed, removed } = getAddedChangedRemovedSectionItems(
      nextState.sectionTextInputs,
      previousState.sectionTextInputs
    );

    forEach(batchImplementation.unloadSection, removed);

    const sectionsToLoad = concat(added, changed);
    forEach(sectionId => (
      batchImplementation.loadSection(sectionId, nextState.sectionTextInputs[sectionId])
    ), sectionsToLoad);

    return returnValue;
  };
};
export default middleware;
