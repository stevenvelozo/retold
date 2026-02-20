# Template Expressions

Jellyfish ships with 44 built-in template expressions organized into ten categories. Each expression follows the same syntax: `{~TAG:parameters~}`. Most expressions have a long form and a shorthand (e.g. `Data` and `D`).

This page provides an overview of each category with links to the full documentation and individual reference pages.

---

## Data Access Expressions

Data access expressions resolve values from Pict's address space and return them as strings. These are the most frequently used expressions in Jellyfish templates.

```html
<h1>{~D:AppData.PageTitle~}</h1>
<h1>{~DWAF:Record.Title^Untitled~}</h1>
<script>var config = {~DJ:AppData.Config~};</script>
```

[Data Access Expressions — Full Documentation](architecture/templating/data-access.md)

| Expression | Tags | Description |
|-----------|------|-------------|
| [Data](architecture/templating/ref-data.md) | `D` | Resolve a value from the address space |
| [DataWithTemplateFallback](architecture/templating/ref-dwtf.md) | `DWTF` | Data with template fallback if falsy |
| [DataWithAbsoluteFallback](architecture/templating/ref-dwaf.md) | `DWAF` | Data with literal fallback if falsy |
| [DataValueByKey](architecture/templating/ref-dvbk.md) | `DVBK` | Dynamic key lookup on an object |
| [DataJson](architecture/templating/ref-dj.md) | `DJ` | JSON-serialize a value |
| [DataEncodeJavascriptString](architecture/templating/ref-dejs.md) | `DEJS` | Escape a value for JS string literals |

---

## Data Formatting Expressions

Formatting expressions transform resolved values for display -- numbers, dates, currencies, and string manipulation.

```html
<span>{~Dollars:Record.Price~}</span>
<time>{~DateTimeFormat:Record.PublishedDate^MMMM Do, YYYY~}</time>
<p>{~J:, ^Record.City^Record.State^Record.Country~}</p>
```

[Data Formatting Expressions — Full Documentation](architecture/templating/data-formatting.md)

| Expression | Tags | Description |
|-----------|------|-------------|
| [Digits](architecture/templating/ref-digits.md) | `Digits` | Format number with 2 decimals and thousands separators |
| [Dollars](architecture/templating/ref-dollars.md) | `Dollars` | Format as US currency |
| [PascalCaseIdentifier](architecture/templating/ref-pascalcaseidentifier.md) | `PascalCaseIdentifier` | Convert string to PascalCase |
| [DateTimeYMD](architecture/templating/ref-datetimeymd.md) | `DateTimeYMD`, `DateYMD` | Format date as YYYY-MM-DD (timezone-aware) |
| [DateTimeFormat](architecture/templating/ref-datetimeformat.md) | `DateTimeFormat`, `DateFormat` | Format date with custom DayJS pattern |
| [DateOnlyYMD](architecture/templating/ref-dateonlyymd.md) | `DateOnlyYMD` | Format date-only as YYYY-MM-DD (UTC) |
| [DateOnlyFormat](architecture/templating/ref-dateonlyformat.md) | `DateOnlyFormat` | Format date-only with custom pattern (UTC) |
| [Join](architecture/templating/ref-join.md) | `J` | Join multiple values with a separator |
| [JoinUnique](architecture/templating/ref-joinunique.md) | `JU` | Join deduplicated values |
| [PluckJoinUnique](architecture/templating/ref-pluckjoinunique.md) | `PJU` | Pluck a property from array items, deduplicate, and join |
| [HtmlCommentStart](architecture/templating/ref-hcs.md) | `HCS` | Conditionally start an HTML comment |
| [HtmlCommentEnd](architecture/templating/ref-hce.md) | `HCE` | Conditionally end an HTML comment |

---

## Logic Expressions

Logic expressions evaluate conditions and control what content appears in the rendered output.

```html
{~TIfAbs:AdminPanel::AppData.UserRole^==^admin~}
{~NE:Record.HasAvatar^<img src="avatar.png">~}
```

[Logic Expressions — Full Documentation](architecture/templating/logic.md)

| Expression | Tags | Description |
|-----------|------|-------------|
| [TemplateIf](architecture/templating/ref-tif.md) | `TIf` | Compare two data values, render template if true |
| [TemplateIfAbsolute](architecture/templating/ref-tifabs.md) | `TIfAbs` | Compare data value against a literal |
| [NotEmpty](architecture/templating/ref-ne.md) | `NE` | Output literal text if value is truthy |

---

## Iteration Expressions

Iteration expressions render a template once for each item in a collection.

```html
<ul>{~TS:ProductRow:AppData.Products~}</ul>
{~TSWP:ItemRow:AppData.Items:AppData.DisplayConfig~}
{~TVS:ValueDisplay:AppData.Tags~}
```

[Iteration Expressions — Full Documentation](architecture/templating/iteration.md)

| Expression | Tags | Description |
|-----------|------|-------------|
| [TemplateSet](architecture/templating/ref-ts.md) | `TS` | Render template for each item in an array |
| [TemplateSetFromMap](architecture/templating/ref-tsfm.md) | `TSFM` | Look up array by key in map, render each item |
| [TemplateSetWithPayload](architecture/templating/ref-tswp.md) | `TSWP` | Render with extra payload data per item |
| [TemplateValueSet](architecture/templating/ref-tvs.md) | `TVS` | Iterate over values with Key/Value/Index/Count metadata |

---

## Template Composition Expressions

Composition expressions render other templates, enabling modular and reusable template designs.

```html
{~T:UserCard:AppData.CurrentUser~}
{~TBR:Record.TemplateName~}
{~TFM:DinoCard:AppData.DinosaurMap:Record.IDDinosaur~}
```

[Template Composition Expressions — Full Documentation](architecture/templating/template-composition.md)

| Expression | Tags | Description |
|-----------|------|-------------|
| [Template](architecture/templating/ref-template.md) | `T` | Render a registered template by hash |
| [TemplateByDataAddress](architecture/templating/ref-tbda.md) | `TBDA` | Parse template content from a data address |
| [TemplateFromAddress](architecture/templating/ref-tfa.md) | `TFA` | Same as TBDA |
| [TemplateByReference](architecture/templating/ref-tbr.md) | `TBR` | Resolve template hash from data, render it |
| [TemplateFromMap](architecture/templating/ref-tfm.md) | `TFM` | Look up record in map, render template with it |
| [TemplateByType](architecture/templating/ref-tbt.md) | `TBT` | Render template based on value's JavaScript type |

---

## Solver Expressions

Solver expressions evaluate mathematical expressions using Fable's expression parser, with support for arithmetic, built-in functions, and variable references.

```html
<span>Total: {~S:Price*Quantity:Record~}</span>
<span>Area: {~S:ROUND(PI()*Radius*Radius,2):Record~}</span>
{~SBR:AppData.PricingFormula:AppData.OrderData~}
```

[Solver Expressions — Full Documentation](architecture/templating/solvers.md)

| Expression | Tags | Description |
|-----------|------|-------------|
| [Solve](architecture/templating/ref-solve.md) | `S` | Evaluate a math expression |
| [SolveByReference](architecture/templating/ref-sbr.md) | `SBR` | Evaluate an equation string from data |

---

## Entity Expressions

Entity expressions integrate with Pict's Meadow API layer to fetch records from REST endpoints and render them with templates. These are inherently asynchronous.

```html
{~E:Book^42^BookCard~}
{~E:Book^Record.IDBook^BookCard~}
```

[Entity Expressions — Full Documentation](architecture/templating/entity.md)

| Expression | Tags | Description |
|-----------|------|-------------|
| [Entity](architecture/templating/ref-entity.md) | `E` | Fetch an entity by type and ID, render with template |

---

## View and Self-Reference Expressions

These expressions bridge templates with Pict's view system and JavaScript runtime.

```html
{~V:HeaderView~}
{~VRS:ChildView~}
<button onclick="{~P~}.views['MyView'].doSomething()">Click</button>
```

[View and Self-Reference Expressions — Full Documentation](architecture/templating/views.md)

| Expression | Tags | Description |
|-----------|------|-------------|
| [View](architecture/templating/ref-view.md) | `V` | Render a Pict view inline |
| [ViewRetainingScope](architecture/templating/ref-vrs.md) | `VRS` | Render a view while carrying scope through |
| [Pict](architecture/templating/ref-pict.md) | `P` | Reference to the Pict instance for event handlers |

---

## Debugging Expressions

Debugging expressions help during development by logging values, inserting breakpoints, and rendering object structures.

```html
{~LS:Processing user section~}
{~LV:AppData.CurrentUser~}
{~Breakpoint~}
{~DT:AppData.DebugData~}
```

[Debugging Expressions — Full Documentation](architecture/templating/debugging.md)

| Expression | Tags | Description |
|-----------|------|-------------|
| [Breakpoint](architecture/templating/ref-breakpoint.md) | `Breakpoint` | Insert a debugger breakpoint |
| [LogStatement](architecture/templating/ref-ls.md) | `LS` | Log a literal message |
| [LogValue](architecture/templating/ref-lv.md) | `LV` | Log a resolved value with type info |
| [LogValueTree](architecture/templating/ref-lvt.md) | `LVT` | Log an object tree to console |
| [DataTree](architecture/templating/ref-dt.md) | `DT` | Render an object tree as HTML |

---

## Data Generation Expressions

Data generation expressions produce random values for testing, unique IDs, or placeholder content.

```html
<span>{~RN:1,100~}</span>
<code>REF-{~RNS:6~}</code>
```

[Data Generation Expressions — Full Documentation](architecture/templating/data-generation.md)

| Expression | Tags | Description |
|-----------|------|-------------|
| [RandomNumber](architecture/templating/ref-rn.md) | `RN` | Generate a random integer |
| [RandomNumberString](architecture/templating/ref-rns.md) | `RNS` | Generate a zero-padded random numeric string |
