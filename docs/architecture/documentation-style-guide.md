# Retold Documentation Style Guide

Style conventions for writing documentation within the Retold ecosystem. These apply to markdown files served through pict-docuserve in the `/docs/` directory.

## Routing and Links

Retold documentation uses **pict-docuserve** with hash-based routing, not standard docsify.

- **Local page links:** `#/page/<path>` (e.g., `#/page/architecture/architecture.md`)
- **Module doc links:** `#/doc/<group>/<module>` (e.g., `#/doc/pict/pict-section-form`)
- **Links in subdirectory `.md` files** must use absolute paths from the docs root (no relative path resolution for `#/page/` routes)
- **Anchor fragments** (`#heading-slug`) are not supported in cross-file links — do not use them

## Markdown Conventions

### Headings

- Use `#` for the page title (one per file)
- Use `##` for major sections
- Use `###` for subsections
- Do not skip heading levels

### Code Blocks

- Always specify the language for syntax highlighting
- Use `javascript` (not `js`) for JavaScript blocks
- Use `html` for HTML blocks
- Use `bash` or `shell` for terminal commands

### Module References

When referencing a Retold module, link to its documentation:

```markdown
See [pict-section-form](#/doc/pict/pict-section-form) for details.
```

### Tone

- Write in plain, direct language
- Prefer active voice
- Keep paragraphs short — aim for 2–4 sentences
- Lead with the most important information

## File Organization

```
docs/
├── _sidebar.md          # Navigation sidebar
├── _topbar.md           # Top navigation bar
├── README.md            # Landing page
├── architecture/        # Architecture and design docs
├── modules/             # Module group overview pages
├── examples/            # Example walkthroughs
└── css/                 # Custom stylesheets
```

## Navigation

The sidebar is defined in `_sidebar.md`. When adding new pages:

1. Add the markdown file to the appropriate directory
2. Add an entry in `_sidebar.md` under the correct section
3. Use the `.md` extension in sidebar links for local pages
4. Module links use the `/group/module/` format (no `.md`)
