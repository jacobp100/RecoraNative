// @flow
import { map, reduce, startsWith, update, set, flow, uniqueId, trim, last, filter } from 'lodash/fp';
import { append } from '../../util';
import { STORAGE_ACTION_SAVE } from '../util';
import type { Document, StorageOperation, StorageInterface, RemoteStorageLocation } from '../util'; // eslint-disable-line
import type { DocumentId } from '../../types';

const createDocumentId = () =>
  `document-${uniqueId()}`;

const createSectionId = (documentId: DocumentId) =>
  `document:${documentId}/section:section-${uniqueId()}`;

const sectionToString = (
  sectionTitle: string,
  textInputs: string,
) => {
  const titleString = `## ${sectionTitle}\n`;
  const textInputStrings = map(input => `> ${input}\n`, textInputs);
  return [titleString, ...textInputStrings].join('');
};

const documentToString = (document: Document) => {
  const titleString = `# ${document.documentTitle}\n`;
  const sectionStrings = map(sectionId => sectionToString(
    document.sectionTitles[sectionId],
    document.sectionTextInputs[sectionId]
  ), document.documentSections);

  [titleString, ...sectionStrings].join('\n');
};

const parseDocumentString = (documentId: DocumentId, string: string) => reduce((accum, line) => {
  if (startsWith('##', line)) {
    const sectionId = createSectionId(documentId);
    const sectionTitle = trim(line.substring(2));

    return flow(
      update('documentSections', append(sectionId)),
      set(['sectionTitles', sectionId], sectionTitle)
    )(accum);
  } else if (startsWith('>', line)) {
    const sectionId = last(accum.documentSections);
    if (!sectionId) return accum;

    const textInput = trim(line.substring(1));
    return update(['sectionTextInputs', sectionId], append(textInput), accum);
  } else if (startsWith('#', line)) {
    const documentTitle = trim(line.substring(1));
    return set('documentTitle', documentTitle, accum);
  }
  return accum;
}, {
  documentId,
  documentTitle: '',
  documentSections: [],
  sectionTitles: {},
  sectionTextInputs: {},
}, string.split('\n'));

export default (type, remote): StorageInterface => {
  const loadDocument = async (storageLocation: RemoteStorageLocation) => {
    const contents = await remote.get(storageLocation.userId, storageLocation.path);
    const documentId = createDocumentId();
    const document: Document = parseDocumentString(documentId, contents);
    return document;
  };

  const updateStore = flow(
    // Ignore remove actions
    filter({ type: STORAGE_ACTION_SAVE }),
    map(({ document, storageLocation }) => remote.post(
      documentToString(document),
      storageLocation.userId,
      storageLocation.path
    )),
    fetchRequests => Promise.all(fetchRequests)
  );

  return {
    type,
    delay: 15000,
    maxWait: 30000,
    loadDocument,
    updateStore,
  };
};
