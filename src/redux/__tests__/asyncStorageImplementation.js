/* global jest, it, expect */
/* eslint-disable flowtype/require-valid-file-annotation */
import storageInterface from '../persistenceMiddleware/asyncStorageImplementation';
import { STORAGE_ACTION_SAVE, STORAGE_ACTION_REMOVE } from '../../types';

const baseStorageLocation = {
  id: 0,
  accountId: 0,
  title: 'test',
  lastModified: 0,
};

it('should add a document', async () => {
  const storageKey = 'test';
  const multiSet = jest.fn(() => Promise.resolve());

  const asyncStorage = storageInterface({ multiSet });

  const storageLocation = { ...baseStorageLocation, storageKey };

  await asyncStorage.updateStore([{
    action: STORAGE_ACTION_SAVE,
    storageLocation,
    account: {
      id: 0,
    },
    document: {
      id: 0,
      title: 'test',
      sections: [
        ['1 + 2'],
      ],
    },
  }], {
    documents: [0],
    documentStorageLocations: { 0: storageLocation },
  });

  expect(multiSet.mock.calls.length).toBe(1);
  expect(multiSet.mock.calls[0][0].length).toBe(2);
  expect(multiSet.mock.calls[0][0][0][0]).toBe(storageKey);
  expect(multiSet.mock.calls[0][0][0][1]).toBe('{"title":"test","sections":[["1 + 2"]]}');
  expect(multiSet.mock.calls[0][0][1][0]).toBe(0); // accountId
  expect(multiSet.mock.calls[0][0][1][1]).toMatch(
    /\[\{"id":".*","storageKey":".*","title":"test","lastModified":\d+\}]/,
  );
});

it('should remove a document', async () => {
  const storageKey = 'test';
  const multiSet = jest.fn(() => Promise.resolve());
  const multiRemove = jest.fn(() => Promise.resolve());

  const asyncStorage = storageInterface({ multiSet, multiRemove });

  const storageLocation = { ...baseStorageLocation, storageKey };

  await asyncStorage.updateStore([{
    action: STORAGE_ACTION_REMOVE,
    storageLocation,
    account: {
      id: 0,
    },
    document: {
      id: 0,
      title: 'test',
      sections: [
        ['1 + 2'],
      ],
    },
  }], {
    documents: [],
    documentStorageLocations: {},
  });

  expect(multiRemove.mock.calls.length).toBe(1);
  expect(multiRemove.mock.calls[0][0]).toEqual([storageKey]);

  expect(multiSet.mock.calls.length).toBe(1);
  expect(multiSet.mock.calls[0][0].length).toBe(1);
  expect(multiSet.mock.calls[0][0][0][0]).toBe(0); // accountId
  expect(multiSet.mock.calls[0][0][0][1]).toBe('[]');
});
