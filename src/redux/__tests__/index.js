/* global jest, it, expect */
/* eslint-disable flowtype/require-valid-file-annotation */
import reducer, { defaultState, addAccount, deleteAccount, /* reorderAccounts, setAccounts, */
  setDocumentStorageLocationsForAccount, updateDocumentStorageLocations, setDocumentContent,
  unloadDocument, addDocument, /* setDocumentTitle, */ addSection, /* setSectionTitle, */
  /* setTextInputs, setTextInput, setSectionResult, reorderSections, */ deleteDocument,
  deleteSection, /* setCustomUnits, */
} from '..';

it('adds an account', () => {
  const accountId = 'accountId';
  const accountType = 'accountType';
  const accountToken = 'accountToken';
  const accountName = 'accountName';
  const state = reducer({}, addAccount(accountId, accountType, accountToken, accountName));

  expect(state.accounts).toEqual([accountId]);
  expect(state.accountNames).toEqual({ [accountId]: accountName });
  expect(state.accountNames).toEqual({ [accountId]: accountName });
  expect(state.accountTokens).toEqual({ [accountId]: accountToken });
});

it('deletes an account', () => {
  const accountId = 'localStorage1';
  const state = reducer({
    ...defaultState,
    accounts: ['localStorage1'],
    accountNames: { localStorage1: 'Device Storage' },
    accountTypes: { localStorage1: 'LOCAL' },
    accountTokens: { localStorage1: '' },
  }, deleteAccount(accountId));

  expect(state.accounts).toEqual([]);
  expect(state.accountNames).toEqual({});
  expect(state.accountNames).toEqual({});
  expect(state.accountTokens).toEqual({});
});

it('deletes documents when deleting an account', () => {
  const accountId = 'localStorage1';
  const documentId = 0;

  const state = reducer({
    ...defaultState,
    documents: [documentId],
    documentStorageLocations: {
      [documentId]: { accountId },
    },
    loadedDocuments: [documentId],
  }, deleteAccount(accountId));

  expect(state.documents).toEqual([]);
  expect(state.loadedDocuments).toEqual([]);
  expect(state.documentStorageLocations).toEqual({});
});

it('sets document storage locations for an account', () => {
  const accountId = 'localStorage1';
  const storageLocation = { accountId };

  const state = reducer({
    ...defaultState,
  }, setDocumentStorageLocationsForAccount(accountId, [storageLocation]));

  const [documentId] = state.documents;
  expect(state.documentStorageLocations[documentId]).toEqual(storageLocation);
  expect(state.loadedDocuments).toEqual([]);
});

it('setting the storage location for an account removes documents that no longer exist', () => {
  const accountId = 'localStorage1';
  const storageLocation = { id: 'new', accountId };
  const oldDocumentId = 'old';

  const state = reducer({
    ...defaultState,
    documents: [oldDocumentId],
    loadedDocuments: [oldDocumentId],
    documentStorageLocations: {
      [oldDocumentId]: { id: 'old', accountId },
    },
  }, setDocumentStorageLocationsForAccount(accountId, [storageLocation]));

  const [documentId] = state.documents;
  expect(state.documents).toEqual([documentId]);
  expect(state.loadedDocuments).toEqual([]);
  expect(state.documentStorageLocations).toEqual({ [documentId]: storageLocation });
});

it('updates the document storage locations and titles', () => {
  const documentId = 0;
  const oldLocation = { title: 'old', path: 'old-path' };
  const newLocation = { title: 'new', path: 'new-path' };

  const state = reducer({
    ...defaultState,
    documents: [documentId],
    documentStorageLocations: {
      [documentId]: oldLocation,
    },
    documentTitles: { [documentId]: 'old' },
  }, updateDocumentStorageLocations({ [documentId]: newLocation }));

  expect(state.documents).toEqual([documentId]);
  expect(state.documentStorageLocations[documentId]).toEqual(newLocation);
  expect(state.documentTitles[documentId]).toEqual('new');
});

it('sets document content', () => {
  const documentId = 0;

  const state = reducer({
    ...defaultState,
    documents: [documentId],
  }, setDocumentContent(documentId, {
    title: 'document',
    sections: [
      { title: 'section1 1', textInputs: ['1 + 2', '3 + 4'] },
      { title: 'section1 2', textInputs: ['5 + 6'] },
    ],
  }));

  expect(state.documents).toEqual([documentId]);
  expect(state.loadedDocuments).toEqual([documentId]);
  expect(state.documentTitles[documentId]).toEqual('document');

  const [section1, section2] = state.documentSections[documentId];
  expect(state.documentSections[documentId]).toEqual([section1, section2]);

  expect(state.sectionTitles[section1]).toEqual('section1 1');
  expect(state.sectionTextInputs[section1]).toEqual(['1 + 2', '3 + 4']);

  expect(state.sectionTitles[section2]).toEqual('section1 2');
  expect(state.sectionTextInputs[section2]).toEqual(['5 + 6']);
});

it('will not set document contents of loaded document', () => {
  const documentId = 0;
  const initialState = {
    ...defaultState,
    documents: [documentId],
    loadedDocuments: [documentId],
  };

  const nextState = reducer(initialState, setDocumentContent(documentId, {
    title: 'document',
    sections: [
      { title: 'section1 1', textInputs: ['1 + 2', '3 + 4'] },
      { title: 'section1 2', textInputs: ['5 + 6'] },
    ],
  }));

  expect(nextState).toEqual(initialState);
});

it('unloads a document', () => {
  const documentId = 0;
  const sectionId = 1;

  const state = reducer({
    ...defaultState,
    documents: [documentId],
    documentSections: { [documentId]: [sectionId] },
    loadedDocuments: [documentId],
    sectionTextInputs: { [sectionId]: ['1 + 1'] },
    sectionResults: { [sectionId]: '2' },
    sectionTotals: { [sectionId]: '2' },
  }, unloadDocument(documentId));

  expect(state.documents).toEqual([documentId]);
  expect(state.loadedDocuments).toEqual([]);
  expect(state.documentSections).toEqual({});
  expect(state.sectionTextInputs).toEqual({});
  expect(state.sectionResults).toEqual({});
  expect(state.sectionTotals).toEqual({});
});

it('adds a document', () => {
  const accountId = 'account1';
  const title = 'Document';

  const state = reducer(undefined, addDocument(accountId, title));

  const [documentId] = state.documents;
  expect(state.loadedDocuments).toEqual([documentId]);
  expect(state.documentTitles[documentId]).toEqual(title);
  const { lastModified } = state.documentStorageLocations[documentId];
  expect(state.documentStorageLocations[documentId]).toEqual({
    accountId,
    title,
    lastModified,
  });
});

it('adds a section', () => {
  const documentId = 0;
  const otherSectionId = 'other';

  const state = reducer({
    ...defaultState,
    documents: [documentId],
    documentSections: [otherSectionId],
  }, addSection(documentId));

  const [/* other section */, sectionId] = state.documentSections[documentId];
  expect(state.documentSections[documentId]).toEqual([otherSectionId, sectionId]);
  expect(state.sectionTitles[sectionId]).toEqual('Section 2');
  expect(state.sectionTextInputs[sectionId]).toEqual([]);
});

it('deletes a document', () => {
  const documentId = 'document';
  const sectionId = 'section';
  const otherDocumentId = 'other document';
  const otherSectionId = 'other section';

  const state = reducer({
    ...defaultState,
    documents: [documentId, otherDocumentId],
    loadedDocuments: [documentId, otherDocumentId],
    documentTitles: { [documentId]: 'title', [otherDocumentId]: 'title' },
    documentSections: { [documentId]: [sectionId], [otherDocumentId]: [otherSectionId] },
    sectionTitles: { [sectionId]: 'title', [otherSectionId]: 'title' },
    sectionTextInputs: { [sectionId]: ['1 + 1'], [otherSectionId]: ['1 + 1'] },
  }, deleteDocument(documentId));

  expect(state.documents).toEqual([otherDocumentId]);
  expect(state.loadedDocuments).toEqual([otherDocumentId]);
  expect(state.documentTitles).toEqual({ [otherDocumentId]: 'title' });
  expect(state.documentSections).toEqual({ [otherDocumentId]: [otherSectionId] });
  expect(state.sectionTitles).toEqual({ [otherSectionId]: 'title' });
  expect(state.sectionTextInputs).toEqual({ [otherSectionId]: ['1 + 1'] });
});

it('deletes a section', () => {
  const documentId = 'document';
  const sectionId = 'section';
  const otherSectionId = 'other section';

  const state = reducer({
    ...defaultState,
    documents: [documentId],
    documentSections: { [documentId]: [sectionId, otherSectionId] },
    sectionTitles: { [sectionId]: 'title', [otherSectionId]: 'title' },
    sectionTextInputs: { [sectionId]: ['1 + 1'], [otherSectionId]: ['1 + 1'] },
  }, deleteSection(sectionId));

  expect(state.documentSections).toEqual({ [documentId]: [otherSectionId] });
  expect(state.sectionTitles).toEqual({ [otherSectionId]: 'title' });
  expect(state.sectionTextInputs).toEqual({ [otherSectionId]: ['1 + 1'] });
});
