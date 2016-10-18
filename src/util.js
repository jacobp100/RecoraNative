// @flow
import { curry, concat } from 'lodash/fp';

export const append = curry((value, array) => (
  array ? concat(array, value) : [value]
));
