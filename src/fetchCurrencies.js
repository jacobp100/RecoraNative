// @flow
/* global fetch */
import { mapValues } from 'lodash/fp';

const currencyBase = 'EUR';

export default async () => {
  const response = await fetch('https://api.fixer.io/latest');
  const body = await response.json();

  const multiplier = body.base !== currencyBase ? (1 / body.rates[currencyBase]) : 1;
  return mapValues(value => [value * multiplier, { currency: 1 }], body.rates);
};
