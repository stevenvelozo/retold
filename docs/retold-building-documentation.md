# Building and Maintaining the Retold Documentation

To serve locally:

```shell
npx docsify-cli serve docs
```

## Module Structure has Changed

When a module structure changes (a new module is added to the working path, a
sidebar is reorganized, etc.), the following steps are necessary to update the
documentation:

```shell
cd modules/utility/indoctrinate
npx indoctrinate generate_catalog -d /path/to/retold/modules -o /path/to/retold/docs/retold-catalog.json
npx indoctrinate generate_keyword_index -d /path/to/retold/modules -o /path/to/retold/docs/retold-keyword-index.json
```

This will build the retold-catalog.  You can then commit the updated JSON files
the git repository.

## Individual Package Content has Changed

When the content of an individual package changes (a new function is added, a
markdown file is edited, etc.) there is nothing to do.  The documentation is
fetched live from raw.githubusercontent.com as the user interacts with the
documentation site.
