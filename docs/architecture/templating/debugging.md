# Debugging Expressions

Debugging expressions help during development by logging values, inserting breakpoints, and rendering object structures as HTML. They produce no visible output in the rendered template (except DataTree, which renders an HTML representation).

## Breakpoint

Inserts a JavaScript `debugger` statement and logs a stack trace. When browser DevTools are open, execution pauses at this point. Returns an empty string.

**Tags:** `{~Breakpoint~}` or `{~Breakpoint:LABEL~}`

**Parameters:**

| Parameter | Description |
|-----------|-------------|
| LABEL | Optional. A label logged with the breakpoint for identification. |

**Examples:**

```html
<!-- Pause execution here when DevTools are open -->
<div>{~Breakpoint~}{~D:Record.Title~}</div>

<!-- Labeled breakpoint -->
{~Breakpoint:before-user-render~}
{~T:UserCard:AppData.CurrentUser~}
```

Breakpoint is a development tool. It does not affect the rendered output -- the expression always returns an empty string. Remove breakpoints before deploying to production.

---

## LogStatement (LS)

Logs a literal message to the trace log. Returns an empty string.

**Tags:** `{~LogStatement:MESSAGE~}` `{~LS:MESSAGE~}`

**Parameters:**

| Parameter | Description |
|-----------|-------------|
| MESSAGE | A literal string to log |

**Examples:**

```html
{~LS:Starting product list render~}
<ul>{~TS:ProductRow:AppData.Products~}</ul>
{~LS:Finished product list render~}
```

```javascript
_Pict.parseTemplate('{~LS:Processing order data~}');
// Logs: 'Processing order data' at trace level
// Returns: ''
```

LogStatement logs at the **trace** level. You need `LogLevel: 0` in your Pict configuration to see trace messages. Use it to mark execution flow through templates -- which template set started, which branch was taken.

---

## LogValue (LV)

Resolves a value from the address space and logs it with type information. Returns an empty string.

**Tags:** `{~LogValue:ADDRESS~}` `{~LV:ADDRESS~}`

**Parameters:**

| Parameter | Description |
|-----------|-------------|
| ADDRESS | Path to the value to log |

**Examples:**

```html
{~LV:AppData.CurrentUser~}
{~LV:Record.OrderTotal~}
```

```javascript
_Pict.AppData.User = { Name: 'Alice', Role: 'admin' };
_Pict.parseTemplate('{~LV:AppData.User~}');
// Logs: 'PICT Template Log Value: [AppData.User] is an object.' + the object
// Returns: ''
```

The log output includes the address, the JavaScript type (`typeof`), and the resolved value. This helps identify whether a value is the expected type (string vs number vs object vs undefined).

---

## LogValueTree (LVT)

Recursively logs all keys and values of an object to the trace log, up to a specified depth. Returns an empty string.

**Tags:** `{~LogValueTree:ADDRESS~}` `{~LVT:ADDRESS~}` or `{~LVT:ADDRESS^DEPTH~}`

**Parameters:**

| Parameter | Description |
|-----------|-------------|
| ADDRESS | Path to the object to log |
| DEPTH | Optional. Maximum depth to traverse (default: 1). Separated by `^`. |

**Examples:**

```html
<!-- Log top-level keys -->
{~LVT:AppData.Config~}

<!-- Log two levels deep -->
{~LVT:AppData.User^2~}
```

```javascript
_Pict.AppData.Config = {
	database: { host: 'localhost', port: 3306 },
	cache: { enabled: true, ttl: 300 }
};

_Pict.parseTemplate('{~LVT:AppData.Config^2~}');
// Logs all nested keys and values up to 2 levels
// Returns: ''
```

LogValueTree is useful when you are unsure of an object's structure. Rather than serializing it with `{~DJ:...~}` (which can be unwieldy for large objects), LVT gives a formatted log output showing the tree structure.

---

## DataTree (DT)

Renders an object tree as interactive HTML `<div>` elements for visual debugging. Unlike the other debugging expressions, DataTree produces visible output.

**Tags:** `{~DataTree:ADDRESS~}` `{~DT:ADDRESS~}` or `{~DT:ADDRESS^DEPTH~}`

**Parameters:**

| Parameter | Description |
|-----------|-------------|
| ADDRESS | Path to the object to render |
| DEPTH | Optional. Maximum depth to traverse (default: 1). Separated by `^`. |

**Examples:**

```html
<!-- Render object tree in the page -->
<div class="debug-panel">
	{~DT:AppData.CurrentOrder~}
</div>

<!-- Two levels deep -->
{~DT:AppData.UserProfile^2~}
```

```javascript
_Pict.AppData.Data = { title: 'Test', count: 42 };
_Pict.parseTemplate('{~DT:AppData.Data~}');
// Returns HTML like:
// <div class="PICT PICTObjectSet">
//   <div class="PICTObjectBranchDepth_0">
//     <div class="PICTObjectBranch">title</div>
//     <div class="PICTObjectBranchValue">Test</div>
//   </div>
//   <div class="PICTObjectBranchDepth_0">
//     <div class="PICTObjectBranch">count</div>
//     <div class="PICTObjectBranchValue">42</div>
//   </div>
// </div>
```

The rendered HTML uses CSS classes (`PICTObjectSet`, `PICTObjectBranch`, `PICTObjectBranchValue`, `PICTObjectBranchDepth_N`) that you can style for your debugging panel. DataTree uses customizable templates internally -- `PICT-Object-Wrap` and `PICT-Object-Branch` -- which can be overridden by registering templates with those hashes.

### When to Use Each Debugging Expression

| Need | Expression | Produces Output? |
|------|------------|-----------------|
| Pause execution in DevTools | `{~Breakpoint~}` | No |
| Log a message during rendering | `{~LS:message~}` | No |
| Log a resolved value with type info | `{~LV:address~}` | No |
| Log an object tree to console | `{~LVT:address~}` | No |
| Render an object tree as HTML | `{~DT:address~}` | Yes |
