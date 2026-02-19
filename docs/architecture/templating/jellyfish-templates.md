# Jellyfish Templates

Jellyfish is the template engine at the heart of Pict. It processes expressions embedded in strings, resolving data, evaluating logic, and composing output from reusable parts. Every Pict view, form section, and content section uses Jellyfish templates to produce its rendered output.

The name comes from the delimiters: `{~` and `~}` wrap every expression, giving template strings a distinctive visual rhythm.

## What a Template Looks Like

A Jellyfish template is a string containing literal text mixed with expressions. Each expression starts with `{~`, followed by a tag, a colon, parameters, and closes with `~}`.

```
{~TAG:parameters~}
```

For example, a template that renders a user profile card:

```html
<div class="card">
	<h2>{~D:Record.DisplayName~}</h2>
	<p>{~D:Record.Email~}</p>
	<span>Member since {~DateTimeFormat:Record.CreateDate^MMMM YYYY~}</span>
</div>
```

When rendered with a record like `{ DisplayName: 'Alice Chen', Email: 'alice@example.com', CreateDate: '2023-01-15T00:00:00Z' }`, this produces:

```html
<div class="card">
	<h2>Alice Chen</h2>
	<p>alice@example.com</p>
	<span>Member since January 2023</span>
</div>
```

## The Expression Anatomy

Every expression follows the same structure:

```
{~ExpressionTag:parameter1:parameter2~}
```

- **ExpressionTag** identifies which template expression handles this pattern. Most expressions have a long form and a shorthand (`Data` and `D`, `Template` and `T`, `Solve` and `S`).
- **Parameters** are separated by colons. What each parameter means depends on the expression. A data address like `AppData.User.Name` resolves against Pict's state. A literal like `Hello` is used as-is. A caret (`^`) separates sub-parameters within a single parameter.

## Data Addressing

The most fundamental concept in Jellyfish is the **data address** -- a dot-notation path that resolves against Pict's unified state object.

When you write `{~D:AppData.User.Name~}`, the engine looks up `AppData.User.Name` in a state object that combines several namespaces:

| Namespace | Source | Purpose |
|-----------|--------|---------|
| `AppData` | `pict.AppData` | Persistent application state |
| `Bundle` | `pict.Bundle` | Configuration and supporting data |
| `TempData` | `pict.TempData` | Transient caches and intermediate values |
| `Record` | Current record | The data object passed to the template |
| `Context` | Context array | Hierarchical context accessible by index |
| `Scope` | Sticky scope | State carried through template processing |
| `Pict` | The Pict instance | Access to Pict itself (also aliased as `Fable`) |

Addresses use dot notation to traverse nested objects and bracket notation for arrays:

```
AppData.Users[0].Name          → first user's name
Record.Address.City            → city from the current record
Bundle.Config.DefaultTheme     → a configuration value
Pict.UUID                      → the Pict instance UUID
```

Manyfest handles the resolution. Missing paths return `undefined` rather than throwing -- templates never crash on absent data.

## Core Expression Categories

Jellyfish ships with 44 built-in template expressions organized into logical categories.

### Data Access

The simplest expressions resolve a value from the address space and return it as a string.

```html
<!-- Basic data access -->
<h1>{~D:AppData.PageTitle~}</h1>

<!-- With a fallback template if the value is empty -->
<h1>{~DWTF:Record.Title:FallbackTitle~}</h1>

<!-- With a literal fallback string -->
<h1>{~DWAF:Record.Title^Untitled~}</h1>

<!-- JSON serialization -->
<script>var config = {~DJ:AppData.Config~};</script>
```

See [Data Access Expressions](architecture/templating/data-access.md) for the full reference.

### Data Formatting

Formatting expressions transform values for display -- numbers, dates, currencies, and strings.

```html
<!-- Currency -->
<span>{~Dollars:Record.Price~}</span>

<!-- Formatted number -->
<span>{~Digits:Record.Quantity~}</span>

<!-- Date formatting -->
<time>{~DateTimeFormat:Record.PublishedDate^MMMM Do, YYYY~}</time>

<!-- Join multiple values -->
<p>{~J:, ^Record.City^Record.State^Record.Country~}</p>
```

See [Data Formatting Expressions](architecture/templating/data-formatting.md) for the full reference.

### Template Composition

Templates can render other templates, enabling reuse and modular design.

```html
<!-- Render a named template -->
{~T:UserCard:AppData.CurrentUser~}

<!-- Render a template whose name is stored in data -->
{~TBR:Record.TemplateName~}

<!-- Render a template string stored in data -->
{~TBDA:Record.TemplateContent~}

<!-- Look up a record in a map, then render a template with it -->
{~TFM:DinoCard:AppData.DinosaurMap:Record.IDDinosaur~}
```

See [Template Composition Expressions](architecture/templating/template-composition.md) for the full reference.

### Iteration

Template sets render a template once for each item in a collection. The current item becomes `Record` inside the loop.

```html
<!-- Render a template for each item in an array -->
<ul>
	{~TS:ProductRow:AppData.Products~}
</ul>

<!-- With extra payload data available to each iteration -->
{~TSWP:ItemRow:AppData.Items:AppData.DisplayConfig~}

<!-- Iterate over values of an object or array -->
{~TVS:ValueDisplay:AppData.CategoryMap~}
```

See [Iteration Expressions](architecture/templating/iteration.md) for the full reference.

### Logic and Conditionals

Conditional expressions compare values and render templates when conditions are met.

```html
<!-- Render a template if two data values are equal -->
{~TIf:SuccessMessage::AppData.StatusCode^==^AppData.ExpectedCode~}

<!-- Compare against a literal value -->
{~TIfAbs:AdminPanel::AppData.UserRole^==^admin~}

<!-- Output literal text if a value is truthy -->
{~NE:Record.HasAvatar^<img src="avatar.png">~}

<!-- HTML comment toggling for conditional display -->
{~HCS:Record.ShowSection~}
<div class="optional-section">Content here</div>
{~HCE:Record.ShowSection~}
```

See [Logic Expressions](architecture/templating/logic.md) for the full reference.

### Solvers

Solver expressions evaluate mathematical expressions using Fable's expression parser.

```html
<!-- Inline math -->
<span>Total: {~S:Price*Quantity:Record~}</span>

<!-- Built-in functions -->
<span>Area: {~S:ROUND(PI()*Radius*Radius,2):Record~}</span>

<!-- String concatenation in expressions -->
<span>{~S:CONCAT("Total: $",Price):Record~}</span>

<!-- Evaluate an equation stored in data -->
{~SBR:AppData.PricingFormula:AppData.OrderData~}
```

See [Solver Expressions](architecture/templating/solvers.md) for the full reference.

### Entity Access

The Entity expression fetches records from Meadow REST APIs and renders them with a template. This is inherently asynchronous.

```html
<!-- Fetch a Book by ID and render it -->
{~E:Book^42^BookCard~}

<!-- Fetch using a dynamic ID from data -->
{~E:Book^Record.IDBook^BookCard~}
```

See [Entity Expressions](architecture/templating/entity.md) for the full reference.

### Views and Self-Reference

Templates can render Pict views inline or reference the Pict instance for JavaScript interop.

```html
<!-- Render a Pict view -->
{~V:HeaderView~}

<!-- Render a view while carrying scope through -->
{~VRS:ChildView~}

<!-- Reference the Pict instance in inline JS -->
<button onclick="{~P~}.views['MyView'].doSomething()">Click</button>
```

See [View and Self-Reference Expressions](architecture/templating/views.md) for the full reference.

### Debugging

Debugging expressions help during development -- they log values, insert breakpoints, and render object trees as HTML.

```html
<!-- Log a message during template processing -->
{~LS:Processing user section~}

<!-- Log a resolved value with type info -->
{~LV:AppData.CurrentUser~}

<!-- Insert a debugger breakpoint -->
{~Breakpoint~}

<!-- Render an object as an interactive HTML tree -->
{~DT:AppData.DebugData~}
```

See [Debugging Expressions](architecture/templating/debugging.md) for the full reference.

### Data Generation

Generate random values for testing, unique IDs, or placeholder content.

```html
<!-- Random number between 1 and 100 -->
<span>{~RN:1,100~}</span>

<!-- Zero-padded random number string -->
<code>{~RNS:8~}</code>
```

See [Data Generation Expressions](architecture/templating/data-generation.md) for the full reference.

## Using Templates Programmatically

### Setup

```javascript
const libPict = require('pict');

let _Pict = new libPict({
	Product: 'MyApp',
	ProductVersion: '1.0.0'
});
```

### Parsing a Template String

The most direct way to use Jellyfish is `parseTemplate`. Pass a template string and an optional record object.

```javascript
_Pict.AppData.SiteName = 'Bookstore';

// Simple data resolution
let tmpResult = _Pict.parseTemplate('Welcome to {~D:AppData.SiteName~}!');
// 'Welcome to Bookstore!'

// With a record
tmpResult = _Pict.parseTemplate(
	'{~D:Record.Title~} by {~D:Record.Author~}',
	{ Title: 'Dune', Author: 'Frank Herbert' }
);
// 'Dune by Frank Herbert'
```

### Registering Named Templates

Named templates let you define reusable fragments and reference them by hash.

```javascript
// Register a template
_Pict.TemplateProvider.addTemplate('BookRow',
	'<tr><td>{~D:Record.Title~}</td><td>{~D:Record.Author~}</td></tr>');

// Render by hash
let tmpResult = _Pict.parseTemplateByHash('BookRow',
	{ Title: 'Neuromancer', Author: 'William Gibson' });
// '<tr><td>Neuromancer</td><td>William Gibson</td></tr>'
```

### Iterating Over Collections

Template sets render a template once per item in an array.

```javascript
_Pict.TemplateProvider.addTemplate('BookRow',
	'<tr><td>{~D:Record.Title~}</td><td>{~Dollars:Record.Price~}</td></tr>');

_Pict.AppData.Books = [
	{ Title: 'Dune', Price: 12.99 },
	{ Title: 'Neuromancer', Price: 9.99 },
	{ Title: 'Snow Crash', Price: 14.99 }
];

let tmpResult = _Pict.parseTemplate(
	'<table>{~TS:BookRow:AppData.Books~}</table>');
// '<table><tr><td>Dune</td><td>$12.99</td></tr>...'
```

### Composing Templates

Templates can reference other templates, building complex output from simple parts.

```javascript
_Pict.TemplateProvider.addTemplate('BookRow',
	'<li>{~D:Record.Title~} ({~Dollars:Record.Price~})</li>');

_Pict.TemplateProvider.addTemplate('BookList',
	'<h2>{~D:AppData.ListTitle~}</h2><ul>{~TS:BookRow:AppData.Books~}</ul>');

_Pict.AppData.ListTitle = 'Science Fiction';
let tmpResult = _Pict.parseTemplateByHash('BookList');
```

### Solvers and Computed Values

The Solve expression evaluates math expressions with variable references resolved from data.

```javascript
_Pict.AppData.Order = { Quantity: 3, UnitPrice: 24.99, TaxRate: 0.08 };

let tmpResult = _Pict.parseTemplate(
	'Subtotal: {~S:ROUND(Quantity*UnitPrice,2):AppData.Order~}');
// 'Subtotal: 74.97'

tmpResult = _Pict.parseTemplate(
	'Tax: {~S:ROUND(Quantity*UnitPrice*TaxRate,2):AppData.Order~}');
// 'Tax: 6.00'
```

### Asynchronous Rendering

Some expressions (Entity, View) are asynchronous. Use a callback for templates containing async expressions.

```javascript
_Pict.parseTemplate(
	'<div>{~E:Book^42^BookCard~}</div>',
	{},
	(pError, pResult) =>
	{
		if (pError)
		{
			console.error(pError);
			return;
		}
		console.log(pResult);
	});
```

### Conditional Rendering

```javascript
_Pict.TemplateProvider.addTemplate('AdminBadge', '<span class="badge">Admin</span>');

_Pict.AppData.User = { Role: 'admin', Name: 'Alice' };

let tmpResult = _Pict.parseTemplate(
	'{~D:AppData.User.Name~} {~TIfAbs:AdminBadge::AppData.User.Role^==^admin~}');
// 'Alice <span class="badge">Admin</span>'
```

## How Views Use Templates

Pict views are the primary consumers of Jellyfish templates. A view declares templates in its configuration and renders them during its lifecycle.

```javascript
let _MyView = _Pict.addView('ProductView',
	{
		ViewIdentifier: 'ProductView',
		DefaultRenderable: 'Product-List',
		DefaultDestinationAddress: '#product-container',
		Templates: [
			{
				Hash: 'Product-List',
				Template: '<div class="products">{~TS:Product-Card:AppData.Products~}</div>'
			},
			{
				Hash: 'Product-Card',
				Template: [
					'<div class="card">',
					'	<h3>{~D:Record.Name~}</h3>',
					'	<p>{~Dollars:Record.Price~}</p>',
					'	<button onclick="{~P~}.views[\'ProductView\'].addToCart({~D:Record.IDProduct~})">',
					'		Add to Cart',
					'	</button>',
					'</div>'
				].join('\n')
			}
		],
		Renderables: [
			{
				RenderableHash: 'Product-List',
				TemplateHash: 'Product-List',
				DestinationAddress: '#product-container'
			}
		]
	});
```

When the view renders, it parses `Product-List`, which iterates over `AppData.Products` using the `Product-Card` template for each item. The `{~P~}` expression generates the correct JavaScript reference to the Pict instance so that click handlers can call back into view methods.

Views can also be embedded in other templates using `{~V:ViewHash~}`, enabling hierarchical composition of UI components.

## Creating Custom Expressions

You can extend Jellyfish with your own template expressions. Create a class that extends `pict-template` and register it with Pict.

```javascript
const libPictTemplate = require('pict-template');

class UpperCaseExpression extends libPictTemplate
{
	constructor(pFable, pOptions, pServiceHash)
	{
		super(pFable, pOptions, pServiceHash);

		this.addPattern('{~Upper:', '~}');
		this.addPattern('{~UC:', '~}');
	}

	render(pTemplateHash, pRecord, pContextArray, pScope, pState)
	{
		let tmpValue = this.resolveStateFromAddress(
			pTemplateHash.trim(), pRecord, pContextArray, null, pScope, pState);
		return (typeof tmpValue === 'string') ? tmpValue.toUpperCase() : '';
	}
}

module.exports = UpperCaseExpression;
module.exports.template_hash = 'Upper';
```

Register it:

```javascript
_Pict.addTemplate(require('./UpperCase-Expression.js'));

_Pict.parseTemplate('{~UC:Record.Name~}', { Name: 'alice' });
// 'ALICE'
```

Custom expressions follow the same lifecycle as built-in ones. They have access to `this.pict`, `this.log`, and `this.resolveStateFromAddress()`. For async work, override `renderAsync` in addition to `render`.

## Further Reading

- [Jellyfish Deep Dive](architecture/templating/jellyfish-deep-dive.md) -- Detailed internals of the template engine
- [Data Access Expressions](architecture/templating/data-access.md) -- D, DWTF, DWAF, DVBK, DJ, DEJS
- [Data Formatting Expressions](architecture/templating/data-formatting.md) -- Digits, Dollars, dates, joins, PascalCase
- [Logic Expressions](architecture/templating/logic.md) -- TIf, TIfAbs, NE, HTML comments
- [Iteration Expressions](architecture/templating/iteration.md) -- TS, TSFM, TSWP, TVS
- [Template Composition Expressions](architecture/templating/template-composition.md) -- T, TBDA, TBR, TFA, TFM, TBT
- [Solver Expressions](architecture/templating/solvers.md) -- S, SBR
- [Entity Expressions](architecture/templating/entity.md) -- E
- [View and Self-Reference Expressions](architecture/templating/views.md) -- V, VRS, P
- [Debugging Expressions](architecture/templating/debugging.md) -- Breakpoint, LS, LV, LVT, DT
- [Data Generation Expressions](architecture/templating/data-generation.md) -- RN, RNS
