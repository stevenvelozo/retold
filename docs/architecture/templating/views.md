# View and Self-Reference Expressions

These expressions bridge templates with Pict's view system and JavaScript runtime. They render views inline, retain scope across view boundaries, and provide the Pict instance reference for event handlers.

## View (V)

Renders a registered Pict view by its hash. The view's render output is captured as a string and inserted into the template.

**Tags:** `{~View:VIEW_HASH~}` `{~V:VIEW_HASH~}`

**Parameters:**

| Parameter | Description |
|-----------|-------------|
| VIEW_HASH | The hash identifier of a registered Pict view |

**Examples:**

```javascript
// Register a view
let _HeaderView = _Pict.addView('HeaderView',
	{
		ViewIdentifier: 'HeaderView',
		DefaultRenderable: 'HeaderContent',
		Templates: [
			{
				Hash: 'HeaderContent',
				Template: '<header><h1>{~D:AppData.SiteName~}</h1></header>'
			}
		],
		Renderables: [
			{
				RenderableHash: 'HeaderContent',
				TemplateHash: 'HeaderContent',
				DestinationAddress: '#header'
			}
		]
	});

// Embed the view in a template
_Pict.parseTemplate('<div class="page">{~V:HeaderView~}<main>Content</main></div>');
```

The View expression triggers the view's render pipeline, capturing its output to a virtual render target. This output is then inserted at the expression's location in the template string.

---

## ViewRetainingScope (VRS)

Same as View, but passes the current scope through to the child view using `renderWithScope()`. The child view can access values from the parent's Scope namespace.

**Tags:** `{~ViewRetainingScope:VIEW_HASH~}` `{~VRS:VIEW_HASH~}`

**Parameters:**

| Parameter | Description |
|-----------|-------------|
| VIEW_HASH | The hash identifier of a registered Pict view |

**Examples:**

```javascript
// Parent template sets scope values
_Pict.parseTemplate(
	'{~VRS:ChildView~}',
	null,    // no record
	null,    // no callback
	null,    // no context
	{ theme: 'dark', layout: 'compact' }  // scope
);

// Inside ChildView's templates, Scope values are accessible:
// '{~D:Scope.theme~}' resolves to 'dark'
// '{~D:Scope.layout~}' resolves to 'compact'
```

Use VRS when a parent view needs to pass contextual configuration to child views without polluting AppData. Scope is sticky -- it travels through the rendering chain without being modified, so deeply nested views all see the same scope values set by the parent.

The plain `{~V:...~}` expression does not carry scope. Use it when the child view is self-contained and does not need context from its parent.

---

## Pict / Self-Reference (P)

Returns the browser-side JavaScript reference to the Pict instance. This is essential for wiring event handlers in server-rendered HTML.

**Tags:** `{~Pict~}` `{~P~}`

**Parameters:** None. This expression takes no parameters.

**Default value:** `window._Pict`

**Examples:**

```html
<!-- Simple click handler -->
<button onclick="{~P~}.views['CartView'].addItem({~D:Record.IDProduct~})">
	Add to Cart
</button>

<!-- Calling a view method with data -->
<a href="#" onclick="{~P~}.views['Nav'].navigate('{~DEJS:Record.Route~}'); return false;">
	{~D:Record.Label~}
</a>

<!-- Accessing Pict state from inline JS -->
<script>
var currentUser = {~P~}.AppData.User;
</script>
```

```javascript
// Default
_Pict.parseTemplate('{~P~}');
// 'window._Pict'

// Custom browser address (for nested Pict instances)
_Pict.browserAddress = 'window._Pict.children[0]';
_Pict.parseTemplate('{~P~}');
// 'window._Pict.children[0]'
```

The Pict expression solves the problem of connecting server-rendered templates to client-side behavior. Without it, onclick handlers and inline scripts would need to hardcode the Pict instance path, which breaks when Pict instances are nested or when the global reference changes.

### Common Patterns

**View method calls from rendered HTML:**

```javascript
_Pict.TemplateProvider.addTemplate('ActionButton', [
	'<button onclick="{~P~}.views[\'TodoView\'].toggleComplete(\'{~DEJS:Record.GUID~}\')">',
	'	{~D:Record.Title~}',
	'</button>'
].join('\n'));
```

**Form submission:**

```javascript
_Pict.TemplateProvider.addTemplate('SearchForm', [
	'<form onsubmit="{~P~}.views[\'SearchView\'].search(this.q.value); return false;">',
	'	<input name="q" type="text" />',
	'	<button type="submit">Search</button>',
	'</form>'
].join('\n'));
```

**Data attributes for JavaScript initialization:**

```html
<div data-pict-ref="{~P~}" data-view="ChartView">
	{~V:ChartView~}
</div>
```
