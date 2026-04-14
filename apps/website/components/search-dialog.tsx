'use client';

import { create } from '@orama/orama';
import { useDocsSearch } from 'fumadocs-core/search/client';
import {
  SearchDialog,
  SearchDialogClose,
  SearchDialogContent,
  SearchDialogFooter,
  SearchDialogHeader,
  SearchDialogIcon,
  SearchDialogInput,
  SearchDialogList,
  SearchDialogOverlay,
  type SharedProps,
} from 'fumadocs-ui/components/dialog/search';

import { withBasePath } from '@/lib/site';

function initOrama() {
  return create({
    schema: { _: 'string' },
    language: 'english',
  });
}

export function SiteSearchDialog(props: SharedProps) {
  const { search, setSearch, query } = useDocsSearch({
    type: 'static',
    from: withBasePath('/api/search'),
    initOrama,
  });

  return (
    <SearchDialog search={search} onSearchChange={setSearch} isLoading={query.isLoading} {...props}>
      <SearchDialogOverlay />
      <SearchDialogContent>
        <SearchDialogHeader>
          <SearchDialogIcon />
          <SearchDialogInput />
          <SearchDialogClose />
        </SearchDialogHeader>
        <SearchDialogList items={query.data !== 'empty' ? query.data : null} />
        <SearchDialogFooter>
          Public API reference, guides, and operational docs are all indexed together.
        </SearchDialogFooter>
      </SearchDialogContent>
    </SearchDialog>
  );
}
