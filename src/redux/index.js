// @flow
import {
  get, set, unset, concat, update, mapValues, without, reduce, curry, flow, values, flatten,
  over, uniqueId, includes, merge, propertyOf, map, intersection, sample,
} from 'lodash/fp';
import quickCalculationExamples from './quickCalculationExamples.json';
import type { State, SectionId, DocumentId, RecoraResult } from '../types';


const defaultState: State = {
  documents: [],
  documentTitles: {},
  documentSections: {},
  sectionTitles: {},
  sectionTextInputs: {},
  sectionResults: {},
  sectionTotals: {},
  quickCalculationInput: '',
  quickCalculationResult: { text: '' },
};

const MERGE_STATE = 'recora:MERGE_STATE';
const ADD_DOCUMENT = 'recora:ADD_DOCUMENT';
const SET_DOCUMENT_TITLE = 'recora:SET_DOCUMENT_TITLE';
const REORDER_DOCUMENTS = 'recora:REORDER_DOCUMENTS';
const ADD_SECTION = 'recora:ADD_SECTION';
const SET_SECTION_TITLE = 'recora:SET_SECTION_TITLE';
const SET_TEXT_INPUTS = 'recora:SET_TEXT_INPUTS';
const SET_TEXT_INPUT = 'recora:SET_TEXT_INPUT';
const SET_SECTION_RESULT = 'recora:SET_SECTION_RESULT';
const REORDER_SECTIONS = 'recora:REORDER_SECTIONS';
const DELETE_DOCUMENT = 'recora:DELETE_DOCUMENT';
const DELETE_SECTION = 'recora:DELETE_SECTION';
const SET_QUICK_CALCULATION_INPUT = 'recora:SET_QUICK_CALCULATION_INPUT';
const GET_QUICK_CALCULATION_EXAMPLE = 'recora:GET_QUICK_CALCULATION_EXAMPLE';
const SET_QUICK_CALCULATION_RESULT = 'recora:SET_QUICK_CALCULATION_RESULT';

const getExistingIds = flow(
  over([
    get('documents'),
    flow(get('documentSections'), values, flatten),
  ]),
  flatten,
);
const newId = (identifier, state) => {
  const existingIds = getExistingIds(state);
  let id;
  do {
    id = uniqueId(`${identifier}-`);
  } while (includes(id, existingIds));
  return id;
};


const append = curry((value, array) => (
  array ? concat(array, value) : [value]
));

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
const doDeleteSection = curry((sectionId, state) => flow(
  removeIdWithinKeys(sectionKeys, sectionId),
  update('documentSections', mapValues(without([sectionId])))
)(state));

const documentKeys = [
  'documentTitles',
  'documentSections',
];
const doDeleteDocument = curry((documentId, state) => flow(
  state => reduce(
    (state, sectionId) => doDeleteSection(sectionId, state),
    state,
    get(['documentSections', documentId], state)
  ),
  removeIdWithinKeys(documentKeys, documentId),
  update('documents', without([documentId]))
)(state));

const doAddSection = curry((documentId, state) => {
  const sectionId = newId('section');
  return flow(
    update(['documentSections', documentId], append(sectionId)),
    state => set(
      ['sectionTitles', sectionId],
      `Section ${state.documentSections[documentId].length}`,
      state
    ),
  )(state);
});


export default (state: State = defaultState, action: Object): State => {
  switch (action.type) {
    case MERGE_STATE:
      return merge(state, action.state);
    case ADD_DOCUMENT: {
      const id = newId('document', state);
      return flow(
        update('documents', concat(id)),
        set(['documentTitles', id], 'New Document'),
        doAddSection(id)
      )(state);
    }
    case SET_DOCUMENT_TITLE:
      return set(['documentTitles', action.documentId], action.title, state);
    case REORDER_DOCUMENTS: {
      const { order } = action;
      const documentIds = get('documents', state);
      const orderedDocumentIds = map(propertyOf(documentIds), order);

      const noDocumentsAddedRemoved =
        intersection(orderedDocumentIds, documentIds).length === documentIds.length;

      return noDocumentsAddedRemoved
        ? set('documents', orderedDocumentIds, state)
        : state;
    }
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
    case REORDER_SECTIONS: {
      const { documentId, order } = action;
      const sectionIds = get(['documentSections', documentId], state);
      const orderedSectionIds = map(propertyOf(sectionIds), order);

      const noSectionsAddedRemoved =
        intersection(orderedSectionIds, sectionIds).length === sectionIds.length;

      return noSectionsAddedRemoved
        ? set(['documentSections', documentId], orderedSectionIds, state)
        : state;
    }
    case DELETE_DOCUMENT:
      return doDeleteDocument(action.documentId, state);
    case DELETE_SECTION:
      return doDeleteSection(action.sectionId, state);
    case SET_QUICK_CALCULATION_INPUT:
      return set('quickCalculationInput', action.quickCalculationInput, state);
    case GET_QUICK_CALCULATION_EXAMPLE: {
      let example;
      do {
        example = sample(quickCalculationExamples);
      } while (state.quickCalculationInput === example);
      return set('quickCalculationInput', example, state);
    }
    case SET_QUICK_CALCULATION_RESULT:
      return set('quickCalculationResult', action.quickCalculationResult, state);
    default:
      return state;
  }
};

/* eslint-disable max-len */
export const mergeState = (state: Object) =>
  ({ type: MERGE_STATE, state });
export const addDocument = () =>
  ({ type: ADD_DOCUMENT });
export const setDocumentTitle = (documentId: DocumentId, title: string) =>
  ({ type: SET_DOCUMENT_TITLE, documentId, title });
export const reorderDocuments = (order: number[]) =>
  ({ type: REORDER_DOCUMENTS, order });
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
export const setQuickCalculationInput = (quickCalculationInput: string) =>
  ({ type: SET_QUICK_CALCULATION_INPUT, quickCalculationInput });
export const getQuickCalculationExample = () =>
  ({ type: GET_QUICK_CALCULATION_EXAMPLE });
export const setQuickCalculationResult = (quickCalculationResult: RecoraResult) =>
  ({ type: SET_QUICK_CALCULATION_RESULT, quickCalculationResult });
export { loadDocuments, loadDocument } from './persistenceMiddleware';
/* eslint-enable */
