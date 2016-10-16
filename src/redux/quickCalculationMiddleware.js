// @flow
import Recora from 'recora';
import { setQuickCalculationResult } from './index';


export default () => ({ getState, dispatch }) => {
  const instance = new Recora();

  const doCalculation = (input) => {
    const result = instance.parse(input);
    dispatch(setQuickCalculationResult(result));
  };

  return next => (action) => {
    const { quickCalculationInput: previousQuickCalculationInput } = getState();
    const returnValue = next(action);
    const { quickCalculationInput: nextQuickCalculationInput } = getState();

    if (previousQuickCalculationInput !== nextQuickCalculationInput) {
      doCalculation(nextQuickCalculationInput);
    }

    return returnValue;
  };
};
