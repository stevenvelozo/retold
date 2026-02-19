# Template Composition Expressions

Composition expressions render other templates, enabling modular and reusable template designs. They are the primary mechanism for building complex output from simple, focused pieces.

## Template (T)

Renders a registered template by its hash. Optionally resolves data from an address to pass as the Record.

**Tags:** `{~Template:TEMPLATE_HASH~}` `{~T:TEMPLATE_HASH~}` or `{~T:TEMPLATE_HASH:DATA_ADDRESS~}`

**Parameters:**

| Parameter | Description |
|-----------|-------------|
| TEMPLATE_HASH | The hash of a registered template |
| DATA_ADDRESS | Optional. Address to resolve and pass as Record to the rendered template. |

**Examples:**

```javascript
_Pict.TemplateProvider.addTemplate('UserBadge',
	'<span class="badge">{~D:Record.Name~} ({~D:Record.Role~})</span>');

_Pict.AppData.CurrentUser = { Name: 'Alice', Role: 'Admin' };

// Render with data from an address
_Pict.parseTemplate('{~T:UserBadge:AppData.CurrentUser~}');
// '<span class="badge">Alice (Admin)</span>'

// Without a data address, uses the current Record
_Pict.parseTemplate('{~T:UserBadge~}', { Name: 'Bob', Role: 'User' });
// '<span class="badge">Bob (User)</span>'
```

This is the most common composition expression. Use it to break large templates into smaller, reusable fragments.

---

## TemplateByDataAddress (TBDA)

Reads a **template string** (the actual template content) from a data address and parses it inline. The value at the address must be a valid template string.

**Tags:** `{~TemplateByDataAddress:ADDRESS~}` `{~TBDA:ADDRESS~}`

**Parameters:**

| Parameter | Description |
|-----------|-------------|
| ADDRESS | Path to a string containing template content |

**Examples:**

```javascript
_Pict.AppData.CustomHeader = '<h1>{~D:AppData.SiteName~}</h1>';
_Pict.AppData.SiteName = 'My Bookstore';

_Pict.parseTemplate('{~TBDA:AppData.CustomHeader~}');
// '<h1>My Bookstore</h1>'
```

This is useful when template content is stored in configuration, database records, or user-defined layouts. The resolved string is fully parsed -- it can contain any Jellyfish expressions.

---

## TemplateFromAddress (TFA)

Identical to TemplateByDataAddress. Reads template content from a data address and parses it.

**Tags:** `{~TemplateFromAddress:ADDRESS~}` `{~TFA:ADDRESS~}`

**Parameters:**

| Parameter | Description |
|-----------|-------------|
| ADDRESS | Path to a string containing template content |

**Examples:**

```javascript
_Pict.parseTemplate('{~TFA:Record.TemplateContent~}',
	{ TemplateContent: '<strong>{~D:Record.Label~}</strong>', Label: 'Important' });
// '<strong>Important</strong>'
```

---

## TemplateByReference (TBR)

Reads a **template hash** (the name of a registered template) from a data address, then renders that registered template.

**Tags:** `{~TemplateByReference:ADDRESS~}` `{~TBR:ADDRESS~}`

**Parameters:**

| Parameter | Description |
|-----------|-------------|
| ADDRESS | Path to a string containing a template hash |

**Examples:**

```javascript
_Pict.TemplateProvider.addTemplate('CardLayout',
	'<div class="card">{~D:Record.Content~}</div>');
_Pict.TemplateProvider.addTemplate('ListLayout',
	'<li>{~D:Record.Content~}</li>');

// The template to use is determined by data
_Pict.parseTemplate('{~TBR:Record.LayoutType~}',
	{ LayoutType: 'CardLayout', Content: 'Hello' });
// '<div class="card">Hello</div>'

_Pict.parseTemplate('{~TBR:Record.LayoutType~}',
	{ LayoutType: 'ListLayout', Content: 'Hello' });
// '<li>Hello</li>'
```

The difference between TBR and TBDA: TBR resolves a template **name** from data and looks it up in the TemplateProvider. TBDA resolves the template **content** from data and parses it directly. Use TBR when the data controls which pre-registered template to use. Use TBDA when the data contains the actual template markup.

---

## TemplateFromMap (TFM)

Looks up a key in a map/object, retrieves the entry, and renders a template with that entry as the Record.

**Tags:** `{~TemplateFromMap:TEMPLATE_HASH:MAP_ADDRESS:KEY_ADDRESS~}` `{~TFM:TEMPLATE_HASH:MAP_ADDRESS:KEY_ADDRESS~}`

**Parameters:**

| Parameter | Description |
|-----------|-------------|
| TEMPLATE_HASH | Hash of the template to render |
| MAP_ADDRESS | Address of the map/object to look up in |
| KEY_ADDRESS | Address containing the key to use for the lookup |

**Examples:**

```javascript
_Pict.AppData.DinosaurIndex = {
	'Dino-01': { Name: 'Brontosaurus', Era: 'Jurassic' },
	'Dino-02': { Name: 'T-Rex', Era: 'Cretaceous' },
	'Dino-03': { Name: 'Triceratops', Era: 'Cretaceous' }
};

_Pict.TemplateProvider.addTemplate('DinoCard',
	'<div><strong>{~D:Record.Name~}</strong> ({~D:Record.Era~})</div>');

// Look up a dinosaur by ID and render its card
_Pict.parseTemplate(
	'{~TFM:DinoCard:AppData.DinosaurIndex:Record.IDDinosaur~}',
	{ IDDinosaur: 'Dino-01' });
// '<div><strong>Brontosaurus</strong> (Jurassic)</div>'
```

This pattern is common when rendering related records. Rather than embedding all related data in each record, store a map of related entities in AppData and look them up by key during rendering.

---

## TemplateByType (TBT)

Checks the JavaScript type of a value (`typeof`) and renders a template if the type matches. Optionally renders a fallback template if the type does not match.

**Tags:** `{~TemplateByType:DATA_ADDRESS:TYPE:TEMPLATE_IF_MATCH~}` `{~TBT:DATA_ADDRESS:TYPE:TEMPLATE_IF_MATCH~}` or `{~TBT:DATA_ADDRESS:TYPE:TEMPLATE_IF_MATCH:FALLBACK_DATA_ADDRESS:FALLBACK_TEMPLATE~}`

**Parameters:**

| Parameter | Description |
|-----------|-------------|
| DATA_ADDRESS | Address of the value to type-check |
| TYPE | Expected JavaScript type (`string`, `number`, `object`, `boolean`, `undefined`) |
| TEMPLATE_IF_MATCH | Template hash to render if the type matches |
| FALLBACK_DATA_ADDRESS | Optional. Data address for the fallback template |
| FALLBACK_TEMPLATE | Optional. Template hash to render if the type does not match |

**Examples:**

```javascript
_Pict.TemplateProvider.addTemplate('ShowString',
	'<p>Text: {~D:Record.Value~}</p>');
_Pict.TemplateProvider.addTemplate('ShowNumber',
	'<p>Number: {~Digits:Record.Value~}</p>');
_Pict.TemplateProvider.addTemplate('ShowDefault',
	'<p>Unknown type</p>');

// Render different templates based on value type
_Pict.AppData.Item = { Value: 'Hello' };
_Pict.parseTemplate('{~TBT:AppData.Item.Value:string:ShowString~}');
// '<p>Text: Hello</p>'

// With fallback
_Pict.AppData.Item = { Value: 42 };
_Pict.parseTemplate(
	'{~TBT:AppData.Item.Value:string:ShowString:AppData.Item:ShowNumber~}');
// '<p>Number: 42.00</p>'
```

TemplateByType is useful when rendering heterogeneous data where the same field may contain different types across records.
