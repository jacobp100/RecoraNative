// @flow
import {
  __, get, set, unset, concat, update, mapValues, without, reduce, assign, flow, includes, map,
  omitBy, curry, isNull, union, invert, sortBy, filter,
} from 'lodash/fp';
import { append, reorder, getOrThrow, objFrom } from '../util';
import { STORAGE_LOCAL } from '../types';
import type { // eslint-disable-line
  StorageLocation, Document, State, SectionId, DocumentId, RecoraResult, StorageType,
  StorageAccount, StorageAccountId,
} from '../types';


const defaultState: State = {
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

  accounts: ['localStorage1'],
  accountNames: { localStorage1: 'Device Storage' },
  accountTypes: { localStorage1: STORAGE_LOCAL },
  accountTokens: { localStorage1: '' },
};

export const getAccount = curry((state: State, accountId: StorageAccountId): StorageAccount => ({
  id: accountId,
  type: state.accountTypes[accountId],
  token: state.accountTokens[accountId],
  name: state.accountNames[accountId],
}));

export const getAccounts = (state: State): StorageAccount[] =>
  map(getAccount(state), state.accounts);

export const getDocument = curry((state: State, documentId: DocumentId): Document => ({
  id: documentId,
  title: state.documentTitles[documentId],
  sections: map(sectionId => ({
    id: sectionId,
    title: getOrThrow(['sectionTitles', sectionId], state),
    textInputs: getOrThrow(['sectionTextInputs', sectionId], state),
  }), state.documentSections[documentId]),
}));


const ADD_ACCOUNT = 'recora:ADD_ACCOUNT';
const DELETE_ACCOUNT = 'recora:DELETE_ACCOUNT';
const REORDER_ACCOUNTS = 'recora:REORDER_ACCOUNTS';
const SET_ACCOUNTS = 'recora:SET_ACCOUNTS';
const SET_DOCUMENT_STORAGE_LOCATIONS = 'recora:SET_DOCUMENT_STORAGE_LOCATIONS';
const SET_DOCUMENT_CONTENT = 'recora:SET_DOCUMENT_CONTENT';
const UNLOAD_DOCUMENT = 'recora:UNLOAD_DOCUMENT';
const UPDATE_DOCUMENT_STORAGE_LOCATIONS = 'recora:UPDATE_DOCUMENT_STORAGE_LOCATIONS';
const ADD_DOCUMENT = 'recora:ADD_DOCUMENT';
const SET_DOCUMENT_TITLE = 'recora:SET_DOCUMENT_TITLE';
const ADD_SECTION = 'recora:ADD_SECTION';
const SET_SECTION_TITLE = 'recora:SET_SECTION_TITLE';
const SET_TEXT_INPUTS = 'recora:SET_TEXT_INPUTS';
const SET_TEXT_INPUT = 'recora:SET_TEXT_INPUT';
const SET_SECTION_RESULT = 'recora:SET_SECTION_RESULT';
const REORDER_SECTIONS = 'recora:REORDER_SECTIONS';
const DELETE_DOCUMENT = 'recora:DELETE_DOCUMENT';
const DELETE_SECTION = 'recora:DELETE_SECTION';
const SET_CUSTOM_UNITS = 'recora:SET_CUSTOM_UNITS';

// When using an object with zero-based integer ids ({ 0: value, 1: value } etc), you get fast
// array access. Until you delete documents or sections, this method will give fast access.
const idCreator = () => {
  let i = 0;
  return () => {
    const out = String(i);
    i += 1;
    return out;
  };
};
const createDocumentId = idCreator();
const createSectionId = idCreator();

const removeIdWithinKeys = curry((keysToUpdate, idToRemove, state) => reduce(
  (state, keyToUpdate) => unset([keyToUpdate, idToRemove], state),
  state,
  keysToUpdate
));

const sectionKeys = [
  'sectionTitles',
  'sectionTextInputs',
  'sectionResults',
  'sectionTotals',
  'sectionTotalTexts',
];
const doDeleteUnloadSection = curry((sectionId, state) => flow(
  removeIdWithinKeys(sectionKeys, sectionId),
  update('documentSections', mapValues(without([sectionId])))
)(state));

const documentKeys = [
  'documentTitles',
  'documentSections',
];
const doUnloadDocument = curry((documentId, state) => flow(
  state => reduce(
    (state, sectionId) => doDeleteUnloadSection(sectionId, state),
    state,
    get(['documentSections', documentId], state)
  ),
  update('loadedDocuments', without([documentId]))
)(state));
const doDeleteDocument = curry((documentId, state) => flow(
  doUnloadDocument(documentId),
  removeIdWithinKeys(documentKeys, documentId),
  update('documents', without([documentId])),
)(state));

const doAddSection = curry((documentId, state) => {
  const sectionId = createSectionId();
  return flow(
    update(['documentSections', documentId], append(sectionId)),
    state => set(
      ['sectionTitles', sectionId],
      `Section ${state.documentSections[documentId].length}`,
      state
    ),
    set(['sectionTextInputs', sectionId], [])
  )(state);
});

const doAddDocument = curry((title, accountId, state) => {
  const id = createDocumentId();
  return flow(
    update('loadedDocuments', append(id)),
    update('documents', concat(id)),
    set(['documentTitles', id], title),
    set(['documentStorageLocations', id], {
      accountId,
      title,
      lastModified: Date.now(),
    }),
    doAddSection(id)
  )(state);
});

const doUpdateDocumentStorageLocations = curry((documentStorageLocations, state) => flow(
  update('documentStorageLocations', flow(
    assign(__, documentStorageLocations),
    omitBy(isNull)
  )),
  update('documentTitles', assign(__, mapValues('title', documentStorageLocations))),
  state => update(
    'documents',
    sortBy(docId => -get(['documentStorageLocations', docId, 'lastModified'], state)),
    state,
  )
)(state));


export default (state: State = defaultState, action: Object): State => {
  switch (action.type) {
    case ADD_ACCOUNT: {
      const { accountId } = action;
      return flow(
        update('accounts', append(accountId)),
        set(['accountTypes', accountId], action.accountType),
        set(['accountNames', accountId], action.accountName),
        set(['accountTokens', accountId], action.accountToken)
      )(state);
    }
    case DELETE_ACCOUNT: {
      const { accountId } = action;
      const documentsToRemove = filter(documentId => (
        get(['documentStorageLocations', documentId, 'accountId'], state) === accountId
      ), state.documents);
      return flow(
        state => reduce((state, documentId) => (
          doDeleteDocument(documentId, state)
        ), state, documentsToRemove),
        update('accounts', without([accountId])),
        unset(['accountTypes', accountId]),
        unset(['accountNames', accountId]),
        unset(['accountTokens', accountId])
      )(state);
    }
    case REORDER_ACCOUNTS:
      return update('accounts', reorder(action.order), state);
    case SET_ACCOUNTS: {
      const accountIds = map('id', action.accounts);
      const accounts = objFrom(accountIds, action.accounts);
      return flow(
        update('accounts', union(accountIds)),
        update('accountTypes', assign(__, mapValues('type', accounts))),
        update('accountTokens', assign(__, mapValues('token', accounts))),
        update('accountNames', assign(__, mapValues('name', accounts)))
      )(state);
    }
    case SET_DOCUMENT_STORAGE_LOCATIONS: {
      const storageLocationIdToDocumentId = flow(
        mapValues('id'),
        invert
      )(state.documentStorageLocations);
      const documentIds = map(storageLocation => (
        storageLocationIdToDocumentId[storageLocation.id] || createDocumentId()
      ), action.documents);
      const documentStorageLocations = objFrom(documentIds, action.documents);
      return flow(
        update('documents', union(documentIds)),
        doUpdateDocumentStorageLocations(documentStorageLocations)
      )(state);
    }
    case SET_DOCUMENT_CONTENT: {
      const { documentId, document } = action;

      if (includes(documentId, state.loadedDocuments)) return state;

      const { title, sections } = document;
      const sectionIds = map(createSectionId, sections);
      const sectionTitles = objFrom(sectionIds, map('title', sections));
      const sectionTextInputs = objFrom(sectionIds, map('textInputs', sections));

      return flow(
        update('loadedDocuments', append(documentId)),
        set(['documentTitles', documentId], title),
        set(['documentSections', documentId], sectionIds),
        update('sectionTitles', assign(__, sectionTitles)),
        update('sectionTextInputs', assign(__, sectionTextInputs))
      )(state);
    }
    case UNLOAD_DOCUMENT:
      return doUnloadDocument(action.documentId, state);
    case UPDATE_DOCUMENT_STORAGE_LOCATIONS:
      return doUpdateDocumentStorageLocations(action.documentStorageLocations, state);
    case ADD_DOCUMENT:
      return doAddDocument(action.filename, action.accountId, state);
    case SET_DOCUMENT_TITLE:
      return set(['documentTitles', action.documentId], action.title, state);
    case ADD_SECTION:
      return doAddSection(action.documentId, state);
    case SET_SECTION_TITLE:
      return set(['sectionTitles', action.sectionId], action.title, state);
    case SET_TEXT_INPUTS:
      return set(['sectionTextInputs', action.sectionId], action.textInputs, state);
    case SET_TEXT_INPUT:
      return set(['sectionTextInputs', action.sectionId, action.index], action.textInput, state);
    case SET_SECTION_RESULT:
      return flow(
        set(['sectionResults', action.sectionId], action.entries),
        set(['sectionTotals', action.sectionId], action.total)
      )(state);
    case REORDER_SECTIONS:
      return update(['documentSections', action.documentId], reorder(action.order), state);
    case DELETE_DOCUMENT:
      return doDeleteDocument(action.documentId, state);
    case DELETE_SECTION:
      return doDeleteUnloadSection(action.sectionId, state);
    case SET_CUSTOM_UNITS:
      return set('customUnits', action.customUnits, state);
    default:
      return state;
  }
};

/* eslint-disable max-len */
export const addAccount = (
  accountType: StorageType,
  accountId: StorageAccountId,
  accountToken: ?string,
  accountName: string
) =>
  ({ type: ADD_ACCOUNT, accountType, accountId, accountToken, accountName });
export const deleteAccount = (accountId: StorageAccountId) =>
  ({ type: DELETE_ACCOUNT, accountId });
export const reorderAccounts = (order: number[]) =>
  ({ type: REORDER_ACCOUNTS, order });
export const setAccounts = (accounts: StorageAccount) =>
  ({ type: SET_ACCOUNTS, accounts });
export const setDocumentStorageLocations = (documents: StorageLocation[]) =>
  ({ type: SET_DOCUMENT_STORAGE_LOCATIONS, documents });
export const setDocumentContent = (documentId: DocumentId, document: Document) =>
  ({ type: SET_DOCUMENT_CONTENT, documentId, document });
export const unloadDocument = (documentId: DocumentId) =>
  ({ type: UNLOAD_DOCUMENT, documentId });
export const updateDocumentStorageLocations = (documentStorageLocations: Object) =>
  ({ type: UPDATE_DOCUMENT_STORAGE_LOCATIONS, documentStorageLocations });
export const addDocument = (
  filename: string = 'New Document',
  accountId: StorageAccountId = 'localStorage1'
) =>
  ({ type: ADD_DOCUMENT, filename, accountId });
export const setDocumentTitle = (documentId: DocumentId, title: string) =>
  ({ type: SET_DOCUMENT_TITLE, documentId, title });
export const addSection = (documentId: DocumentId) =>
  ({ type: ADD_SECTION, documentId });
export const setSectionTitle = (sectionId: SectionId, title: string) =>
  ({ type: SET_SECTION_TITLE, sectionId, title });
export const setTextInputs = (sectionId: SectionId, textInputs: string[]) =>
  ({ type: SET_TEXT_INPUTS, sectionId, textInputs });
export const setTextInput = (sectionId: SectionId, index: number, textInput: string) =>
  ({ type: SET_TEXT_INPUT, sectionId, index, textInput });
export const setSectionResult = (sectionId: SectionId, entries: RecoraResult[], total: RecoraResult) =>
  ({ type: SET_SECTION_RESULT, sectionId, entries, total });
export const reorderSections = (documentId: DocumentId, order: number[]) =>
  ({ type: REORDER_SECTIONS, documentId, order });
export const deleteDocument = (documentId: DocumentId) =>
  ({ type: DELETE_DOCUMENT, documentId });
export const deleteSection = (sectionId: SectionId) =>
  ({ type: DELETE_SECTION, sectionId });
export const setCustomUnits = (customUnits: Object) =>
  ({ type: SET_CUSTOM_UNITS, customUnits });
export { loadDocuments, loadDocument } from './persistenceMiddleware';
/* eslint-enable */
