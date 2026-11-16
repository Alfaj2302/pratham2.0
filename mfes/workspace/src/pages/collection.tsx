import { Collection } from '@shared-lib';

import React from 'react';

// Read by the collection editor, so they must be in place before it mounts.
const setCollectionEditorStorage = () => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(
    'shellFindURL',
    `${process.env.NEXT_PUBLIC_MIDDLEWARE_URL}/action/composite/v3/search`
  );
  const collectionFramework = localStorage.getItem('collectionFramework');
  if (collectionFramework) {
    localStorage.setItem('frameworkId', collectionFramework);
  }
};

const collection = () => {
  // Runs during render (not in an effect) because the editor's own effects run first.
  setCollectionEditorStorage();
  return <Collection />;
};

export default collection;
