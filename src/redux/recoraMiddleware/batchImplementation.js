// @flow
import { map, findIndex, pullAt, concat, first, keys, getOr, forEach, isEmpty } from 'lodash/fp';
import Recora from 'recora';
import type { SectionId } from '../../types';
import createFiberRunner from './fiberRunner';
import type { FiberRunner, BatchImplementation, Fiber, Result } from './types';
import {
  getAssignments, getNewChangedAssignments, getNextConstants, removeDuplicateAssignments,
} from './util';

type CalculationState = {
  sectionId: SectionId,
  forceRecalculation: bool,
  instance: Recora,
  constants: Object,
  inputs: string[],
  previousResults: Result[],
  results: Result[],
};
type ImmutableConstants = Object;


const getStateForRecalculation = (
  { sectionId, inputs }: CalculationState,
  constants
): CalculationState => ({
  sectionId,
  forceRecalculation: true,
  constants,
  instance: new Recora().setConstants(constants),
  inputs,
  previousResults: [],
  results: [],
});

export default ({
  requestIdleCallback = global.requestAnimationFrame,
  frameBudget = 8,
} = {}): BatchImplementation => {
  const runFiber: FiberRunner<CalculationState> = createFiberRunner({
    requestIdleCallback,
    frameBudget,
  });

  // Global state (All objects mutable)
  let resultListeners = [];
  const queuedInputs: { [key:SectionId]: string[] } = {};
  const previousResultsPerSection: { [key:SectionId]: Result[] } = {};
  const constantsPerSection: { [key:SectionId]: ImmutableConstants } = {};
  const instancesPerSection: { [key:SectionId]: Recora } = {};
  let fiber: ?Fiber<CalculationState> = null;


  const getInstanceFor = (sectionId) => {
    if (sectionId in instancesPerSection) return instancesPerSection[sectionId];
    const instance = new Recora();
    const constants = constantsPerSection[sectionId];
    if (constants) instance.setConstants(constants);
    return instance;
  };

  const queueComputation = () => {
    if (fiber !== null) return;
    const sectionId = first(keys(queuedInputs));
    if (!sectionId) return;

    /* eslint-disable no-use-before-define */
    fiber = runFiber(sectionComputation, ({
      sectionId,
      forceRecalculation: false,
      instance: getInstanceFor(sectionId),
      constants: getOr({}, sectionId, constantsPerSection),
      inputs: getOr([], sectionId, queuedInputs),
      previousResults: getOr([], sectionId, previousResultsPerSection),
      results: [],
    }: CalculationState));
    /* eslint-enable */
  };

  const cancelFiberFor = (sectionId) => {
    if (fiber && fiber.getState().sectionId === sectionId) {
      fiber.cancel();
      fiber = null;
    }
    queueComputation();
  };

  const sectionComputation = (state: CalculationState, next) => {
    const { sectionId, forceRecalculation, constants, instance, inputs } = state;
    let { previousResults, results } = state;
    const getCurrentState = (): CalculationState =>
      ({ sectionId, forceRecalculation, instance, constants, inputs, previousResults, results });
    const remainingInputs = inputs.slice(results.length);

    let didPerformExpensiveComputation = false;

    for (const input of remainingInputs) {
      const previousEntryIndex = findIndex({ input }, previousResults);

      let result;
      if (previousEntryIndex !== -1) {
        // Almost free, do even if we've exceeded the frame budget
        const previousValue = previousResults[previousEntryIndex];
        result = previousValue.removedAssignment || previousValue.result;
        previousResults = pullAt(previousEntryIndex, previousResults);
      } else if (!didPerformExpensiveComputation) {
        console.log(input);
        // Expensive, don't do if we've exceeded the frame budget
        result = instance.parse(input);
        didPerformExpensiveComputation = true;
      } else {
        next(getCurrentState());
        return;
      }

      results = concat(results, { input, result, removedAssignment: null });
    }

    results = removeDuplicateAssignments(results);

    const newChangedAssignments = getNewChangedAssignments(constants, results);
    const removedAssignments = getAssignments(previousResults);

    if (!isEmpty(newChangedAssignments) || !isEmpty(removedAssignments)) {
      const nextConstants = getNextConstants(newChangedAssignments, removedAssignments, constants);
      next(getStateForRecalculation(getCurrentState(), nextConstants));
      return;
    }

    const entries = map('result', results);
    const total = instance.parse('');
    forEach(resultListener => resultListener(sectionId, entries, total), resultListeners);

    delete queuedInputs[sectionId];
    previousResultsPerSection[sectionId] = results;
    constantsPerSection[sectionId] = constants;
    instancesPerSection[sectionId] = instance;
    fiber = null;
    queueComputation();
  };

  const resetFiberFor = (sectionId) => {
    cancelFiberFor(sectionId);
    queueComputation();
  };

  return {
    queueSection: (sectionId, inputs) => {
      queuedInputs[sectionId] = inputs;
      resetFiberFor(sectionId);
    },
    unqueueSection: (sectionId) => {
      delete queuedInputs[sectionId];
      resetFiberFor(sectionId);
    },
    addResultListener: callback => {
      resultListeners = concat(resultListeners, callback);
    },
  };
};
