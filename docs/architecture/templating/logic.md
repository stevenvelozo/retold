# Logic Expressions

Logic expressions evaluate conditions and control what content appears in the rendered output. They compare values, check for truthiness, and conditionally render templates.

## TemplateIf (TIf)

Compares two data-resolved values using an operator. If the comparison is true, renders a named template.

**Tags:** `{~TemplateIf:TEMPLATE_HASH:DATA_ADDRESS:LEFT^OPERATOR^RIGHT~}` `{~TIf:TEMPLATE_HASH:DATA_ADDRESS:LEFT^OPERATOR^RIGHT~}`

**Parameters:**

| Parameter | Description |
|-----------|-------------|
| TEMPLATE_HASH | Hash of the template to render if the condition is true |
| DATA_ADDRESS | Address of data to pass as Record to the template (can be empty) |
| LEFT | Address to resolve for the left side of the comparison |
| OPERATOR | Comparison operator (see table below) |
| RIGHT | Address to resolve for the right side of the comparison |

**Operators:**

| Operator | Meaning |
|----------|---------|
| `==` | Loose equality |
| `===` | Strict equality |
| `!=` | Loose inequality |
| `!==` | Strict inequality |
| `>` | Greater than |
| `>=` | Greater than or equal |
| `<` | Less than |
| `<=` | Less than or equal |
| `TRUE` | Left value is exactly `true` (right is ignored) |
| `FALSE` | Left value is exactly `false` (right is ignored) |
| `LNGT` | Left value's `.length` is greater than right value |
| `LENGTH_GREATER_THAN` | Same as LNGT |
| `LNLT` | Left value's `.length` is less than right value |
| `LENGTH_LESS_THAN` | Same as LNLT |

**Examples:**

```javascript
_Pict.TemplateProvider.addTemplate('SuccessMsg',
	'<span class="success">Operation succeeded!</span>');

_Pict.TemplateProvider.addTemplate('HighValueBadge',
	'<span class="badge">Premium</span>');

// Compare two data values
_Pict.AppData.Response = { StatusCode: 200, ExpectedCode: 200 };
_Pict.parseTemplate(
	'{~TIf:SuccessMsg::AppData.Response.StatusCode^==^AppData.Response.ExpectedCode~}');
// '<span class="success">Operation succeeded!</span>'

// Numeric comparison
_Pict.parseTemplate(
	'{~TIf:HighValueBadge:Record:Record.OrderTotal^>^Record.Threshold~}',
	{ OrderTotal: 500, Threshold: 100 });
// '<span class="badge">Premium</span>'

// Boolean check
_Pict.parseTemplate(
	'{~TIf:SuccessMsg::AppData.IsReady^TRUE^~}');

// Length check
_Pict.TemplateProvider.addTemplate('HasItems', '<p>Items found</p>');
_Pict.parseTemplate(
	'{~TIf:HasItems::AppData.Results^LNGT^0~}');
```

When the condition is false, the expression returns an empty string.

---

## TemplateIfAbsolute (TIfAbs)

Like TemplateIf, but the right side of the comparison is a literal value, not a data address.

**Tags:** `{~TemplateIfAbsolute:TEMPLATE_HASH:DATA_ADDRESS:LEFT^OPERATOR^LITERAL~}` `{~TIfAbs:TEMPLATE_HASH:DATA_ADDRESS:LEFT^OPERATOR^LITERAL~}`

**Parameters:**

| Parameter | Description |
|-----------|-------------|
| TEMPLATE_HASH | Hash of the template to render if the condition is true |
| DATA_ADDRESS | Address of data to pass as Record to the template (can be empty) |
| LEFT | Address to resolve for the left side |
| OPERATOR | Comparison operator (same table as TemplateIf) |
| LITERAL | A literal value to compare against (not resolved from data) |

**Examples:**

```javascript
_Pict.TemplateProvider.addTemplate('AdminPanel',
	'<div class="admin">{~D:AppData.User.Name~} (Admin)</div>');

_Pict.TemplateProvider.addTemplate('GuestWelcome',
	'<p>Welcome, guest!</p>');

_Pict.AppData.User = { Name: 'Alice', Role: 'admin' };

// Compare against a literal string
_Pict.parseTemplate('{~TIfAbs:AdminPanel::AppData.User.Role^==^admin~}');
// '<div class="admin">Alice (Admin)</div>'

_Pict.parseTemplate('{~TIfAbs:GuestWelcome::AppData.User.Role^==^guest~}');
// '' (condition false)

// Compare against a literal number
_Pict.parseTemplate('{~TIfAbs:SuccessMsg::AppData.StatusCode^==^200~}');
```

This is the most common conditional pattern -- comparing a data value against a known constant.

---

## NotEmpty (NE)

Checks if a value is truthy. If so, outputs a literal string. Otherwise outputs nothing.

**Tags:** `{~NotEmpty:ADDRESS^LITERAL_OUTPUT~}` `{~NE:ADDRESS^LITERAL_OUTPUT~}`

**Parameters:**

| Parameter | Description |
|-----------|-------------|
| ADDRESS | Path to a value to check for truthiness |
| LITERAL_OUTPUT | A literal string to output if the value is truthy (separated by `^`) |

**Examples:**

```html
<!-- Add a line break after a value if it exists -->
{~D:Record.AddressLine2~}{~NE:Record.AddressLine2^<br/>~}

<!-- Show a separator between items -->
{~D:Record.FirstName~}{~NE:Record.MiddleName^ ~}{~D:Record.MiddleName~} {~D:Record.LastName~}

<!-- Conditional CSS class -->
<div class="item{~NE:Record.IsActive^ active~}">
```

```javascript
_Pict.AppData.Dog = { Name: 'Fido', Age: 5 };

_Pict.parseTemplate('Has name: {~NE:AppData.Dog.Name^yes~}');
// 'Has name: yes'

_Pict.parseTemplate('Has breed: {~NE:AppData.Dog.Breed^yes~}');
// 'Has breed: '
```

NotEmpty is lightweight and inline. It does not render a template -- it outputs a fixed string. Use it for small conditional fragments like separators, CSS classes, or HTML attributes. For larger conditional blocks, use TemplateIf or TemplateIfAbsolute.

## Combining Conditionals

Jellyfish does not have an `else` or `if/else` expression. Instead, use two complementary conditions or HTML comment toggling.

### Pattern: Two TemplateIf Expressions

```javascript
_Pict.TemplateProvider.addTemplate('ActiveBadge',
	'<span class="active">Active</span>');
_Pict.TemplateProvider.addTemplate('InactiveBadge',
	'<span class="inactive">Inactive</span>');

let tmpTemplate = [
	'{~TIfAbs:ActiveBadge::Record.Status^==^active~}',
	'{~TIfAbs:InactiveBadge::Record.Status^==^inactive~}'
].join('');
```

### Pattern: HTML Comment Toggling

```html
{~HCS:Record.IsAdmin~}
<div class="admin-controls">Admin only content</div>
{~HCE:Record.IsAdmin~}

{~HCS:Record.IsAdmin:1~}
<div class="user-controls">Regular user content</div>
{~HCE:Record.IsAdmin:1~}
```

When `IsAdmin` is true, the admin content is visible and the user content is commented out. When false, the opposite occurs.
