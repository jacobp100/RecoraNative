/* global jest, it, expect */
/* eslint-disable flowtype/require-valid-file-annotation */
import { createStore, applyMiddleware } from 'redux';
import { STORAGE_ACTION_REMOVE } from '../../types';
import persistenceMiddleware, {
  flushStorageTypeUpdates, loadDocuments,
} from '../persistenceMiddleware';
import reducer, {
  unloadDocument, addDocument, deleteDocument, setTextInputs, deleteAccount,
} from '..';

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

const getMockStorageInterface = ({
  loadDocuments = jest.fn(),
  loadDocument = jest.fn(),
  updateStore = jest.fn(),
} = {}) => ({
  type: MOCK_STORAGE_TYPE,
  delay: MOCK_STORAGE_DELAY,
  maxWait: MOCK_STORAGE_MAX_WAIT,
  loadDocuments,
  loadDocument,
  updateStore,
});

const mockState = {
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
};

const getMocks = ({
  state = mockState,
  mockPromiseStorage = getMockPromiseStorage(),
  storageInterface = getMockStorageInterface(),
} = {}) => {
  const middleware = persistenceMiddleware(mockPromiseStorage, [storageInterface]);
  const middlewares = applyMiddleware(middleware);
  const store = createStore(reducer, state, middlewares);
  return { store, storageInterface };
};

it('saves a document immediately after creation', async () => {
  const { store, storageInterface } = getMocks();
  expect(storageInterface.updateStore.mock.calls.length).toBe(0);
  store.dispatch(addDocument(MOCK_STORAGE_ACCOUNT_ID, 'Mock Filename'));
  await Promise.resolve();
  expect(storageInterface.updateStore.mock.calls.length).toBe(1);
});

it('deletes a document immediately deletion creation', async () => {
  const initialState = reducer(
    mockState,
    addDocument(MOCK_STORAGE_ACCOUNT_ID, 'Mock Filename')
  );
  const { store, storageInterface } = getMocks({ state: initialState });
  expect(storageInterface.updateStore.mock.calls.length).toBe(0);

  const documentId = store.getState().documents[0];
  store.dispatch(deleteDocument(documentId));

  await Promise.resolve();
  expect(storageInterface.updateStore.mock.calls.length).toBe(1);
});

it('saves a document after a change after waiting', async () => {
  const initialState = reducer(
    mockState,
    addDocument(MOCK_STORAGE_ACCOUNT_ID, 'Mock Filename')
  );
  const { store, storageInterface } = getMocks({ state: initialState });
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

it('loads documents and does not emit other storage events', async () => {
  const loadDocumentsMock = jest.fn(() => Promise.resolve([{
    title: 'test',
    sections: [
      ['1 + 2'],
    ],
  }]));
  const { store, storageInterface } = getMocks({
    storageInterface: getMockStorageInterface({ loadDocuments: loadDocumentsMock }),
  });

  expect(store.getState().documents.length).toEqual(0);
  expect(loadDocumentsMock.mock.calls.length).toBe(0);
  expect(storageInterface.updateStore.mock.calls.length).toBe(0);

  await store.dispatch(loadDocuments());
  store.dispatch(flushStorageTypeUpdates(MOCK_STORAGE_TYPE));
  await Promise.resolve();

  expect(store.getState().documents.length).toEqual(1);
  expect(loadDocumentsMock.mock.calls.length).toBe(1);
  expect(storageInterface.updateStore.mock.calls.length).toBe(0);
});

it('does not save a document with no changes after unloading', async () => {
  const initialState = reducer(
    mockState,
    addDocument(MOCK_STORAGE_ACCOUNT_ID, 'Mock Filename')
  );
  const { store, storageInterface } = getMocks({ state: initialState });
  expect(storageInterface.updateStore.mock.calls.length).toBe(0);

  const state = store.getState();
  const documentId = state.documents[0];
  store.dispatch(unloadDocument(documentId));

  await Promise.resolve();
  expect(storageInterface.updateStore.mock.calls.length).toBe(0);
});

it('saves a document after changing then unloading', async () => {
  const initialState = reducer(
    mockState,
    addDocument(MOCK_STORAGE_ACCOUNT_ID, 'Mock Filename')
  );
  const { store, storageInterface } = getMocks({ state: initialState });
  expect(storageInterface.updateStore.mock.calls.length).toBe(0);

  const state = store.getState();
  const documentId = state.documents[0];
  const sections = state.documentSections[documentId];
  store.dispatch(setTextInputs(sections[0], ['1 + 2']));

  await Promise.resolve();
  expect(storageInterface.updateStore.mock.calls.length).toBe(0);

  store.dispatch(unloadDocument(documentId));

  await Promise.resolve();
  expect(storageInterface.updateStore.mock.calls.length).toBe(1);
});

it('emits only a removal storage operation when changing then deleting', async () => {
  const initialState = reducer(
    mockState,
    addDocument(MOCK_STORAGE_ACCOUNT_ID, 'Mock Filename')
  );
  const { store, storageInterface } = getMocks({ state: initialState });
  expect(storageInterface.updateStore.mock.calls.length).toBe(0);

  const state = store.getState();
  const documentId = state.documents[0];
  const sections = state.documentSections[documentId];
  store.dispatch(setTextInputs(sections[0], ['1 + 2']));

  await Promise.resolve();
  expect(storageInterface.updateStore.mock.calls.length).toBe(0);

  store.dispatch(deleteDocument(documentId));

  await Promise.resolve();
  expect(storageInterface.updateStore.mock.calls.length).toBe(1);

  const storageOperations = storageInterface.updateStore.mock.calls[0][0];
  expect(storageOperations.length).toEqual(1);
  expect(storageOperations[0].action).toEqual(STORAGE_ACTION_REMOVE);
});

it('emits no storage operations when removing accounts', async () => {
  const initialState = reducer(
    mockState,
    addDocument(MOCK_STORAGE_ACCOUNT_ID, 'Mock Filename')
  );
  const { store, storageInterface } = getMocks({ state: initialState });
  expect(storageInterface.updateStore.mock.calls.length).toBe(0);

  store.dispatch(deleteAccount(MOCK_STORAGE_ACCOUNT_ID));

  store.dispatch(flushStorageTypeUpdates(MOCK_STORAGE_TYPE));
  await Promise.resolve();

  expect(storageInterface.updateStore.mock.calls.length).toBe(0);
});
