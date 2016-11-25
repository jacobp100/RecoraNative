// @flow
/* global jest, it, expect */
import { createStore, applyMiddleware } from 'redux';
import persistenceMiddleware, { flushStorageTypeUpdates } from '../persistenceMiddleware';
import reducer, { addDocumentForAccount, deleteDocument, setTextInputs } from '..';

const MOCK_STORAGE_ACCOUNT_ID = 'MOCK_STORAGE_ACCOUNT_ID';
const MOCK_STORAGE_TYPE = 'MOCK_STORAGE_TYPE';
const MOCK_STORAGE_DELAY = 1000;
const MOCK_STORAGE_MAX_WAIT = 10000;


const getMockPromiseStorage = () => ({
  getItem: () => Promise.resolve(null),
  multiGet: keys => Promise.resolve(keys.map(() => null)),
  setItem: () => Promise.resolve(null),
  multiSet: () => Promise.resolve(null),
  removeItem: () => Promise.resolve(null),
  multiRemove: () => Promise.resolve(null),
});

const getMockStorageInterface = () => ({
  type: MOCK_STORAGE_TYPE,
  delay: MOCK_STORAGE_DELAY,
  maxWait: MOCK_STORAGE_MAX_WAIT,
  loadDocuments: jest.fn(),
  loadDocument: jest.fn(),
  updateStore: jest.fn(),
});

const getMockState = () => ({
  documents: [],
  documentStorageLocations: {},
  documentTitles: {},
  documentSections: {},
  sectionTitles: {},
  sectionTextInputs: {},
  sectionResults: {},
  sectionTotals: {},
  loadedDocuments: [],

  customUnits: {},

  accounts: [MOCK_STORAGE_ACCOUNT_ID],
  accountNames: { [MOCK_STORAGE_ACCOUNT_ID]: 'Mock' },
  accountTypes: { [MOCK_STORAGE_ACCOUNT_ID]: MOCK_STORAGE_TYPE },
  accountTokens: { [MOCK_STORAGE_ACCOUNT_ID]: '' },
});

const getMocks = (state = getMockState()) => {
  const mockPromiseStorage = getMockPromiseStorage();
  const storageInterface = getMockStorageInterface();
  const middleware = persistenceMiddleware(mockPromiseStorage, [storageInterface]);
  const middlewares = applyMiddleware(middleware);
  const store = createStore(reducer, state, middlewares);
  return { store, storageInterface };
};

it('should save a document immediately after creation', async () => {
  const { store, storageInterface } = getMocks();
  expect(storageInterface.updateStore.mock.calls.length).toBe(0);
  store.dispatch(addDocumentForAccount('Mock Filename', MOCK_STORAGE_ACCOUNT_ID));
  await Promise.resolve();
  expect(storageInterface.updateStore.mock.calls.length).toBe(1);
});

it('should delete a document immediately deletion creation', async () => {
  const initialState = reducer(
    getMockState(),
    addDocumentForAccount('Mock Filename', MOCK_STORAGE_ACCOUNT_ID)
  );
  const { store, storageInterface } = getMocks(initialState);
  expect(storageInterface.updateStore.mock.calls.length).toBe(0);
  store.dispatch(deleteDocument(store.getState().documents[0]));
  await Promise.resolve();
  expect(storageInterface.updateStore.mock.calls.length).toBe(1);
});

it('should save a document after a change after waiting', async () => {
  const initialState = reducer(
    getMockState(),
    addDocumentForAccount('Mock Filename', MOCK_STORAGE_ACCOUNT_ID)
  );
  const { store, storageInterface } = getMocks(initialState);
  expect(storageInterface.updateStore.mock.calls.length).toBe(0);

  const state = store.getState();
  const documentId = state.documents[0];
  const sections = state.documentSections[documentId];
  store.dispatch(setTextInputs(sections[0], ['1 + 2']));

  await Promise.resolve();
  expect(storageInterface.updateStore.mock.calls.length).toBe(0);

  store.dispatch(flushStorageTypeUpdates(MOCK_STORAGE_TYPE));
  await Promise.resolve();

  expect(storageInterface.updateStore.mock.calls.length).toBe(1);
});
