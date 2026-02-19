# Solver Expressions

Solver expressions evaluate mathematical expressions using Fable's expression parser. They support arithmetic, built-in functions, string concatenation, and variable references resolved from data.

## Solve (S)

Evaluates a mathematical expression. Variables in the expression are resolved from the data at the given address.

**Tags:** `{~Solve:EXPRESSION~}` `{~S:EXPRESSION~}` or `{~S:EXPRESSION:DATA_ADDRESS~}`

**Parameters:**

| Parameter | Description |
|-----------|-------------|
| EXPRESSION | A math expression string |
| DATA_ADDRESS | Optional. Address of an object whose properties become variables in the expression. |

### Basic Arithmetic

```javascript
_Pict.parseTemplate('{~S:100+55~}');
// '155'

_Pict.parseTemplate('{~S:2*3+4~}');
// '10'

_Pict.parseTemplate('{~S:100/3~}');
// '33.333333333333336'
```

### Variables from Data

When you provide a data address, property names in the expression resolve against that object.

```javascript
_Pict.AppData.Order = { Quantity: 3, UnitPrice: 24.99, TaxRate: 0.08 };

_Pict.parseTemplate('{~S:Quantity*UnitPrice:AppData.Order~}');
// '74.97'

_Pict.parseTemplate('{~S:Quantity*UnitPrice*(1+TaxRate):AppData.Order~}');
// '80.9892'
```

### Built-in Functions

The expression parser supports several functions:

| Function | Description | Example |
|----------|-------------|---------|
| `ROUND(value, decimals)` | Round to N decimal places | `ROUND(3.14159, 2)` = `3.14` |
| `PI()` | The constant pi | `PI()` = `3.141592653589793` |
| `CONCAT(a, b, ...)` | String concatenation | `CONCAT("Hello", " ", "World")` = `Hello World` |

**Examples:**

```javascript
_Pict.AppData.Circle = { Radius: 10 };

// Area of a circle
_Pict.parseTemplate('{~S:ROUND(PI()*Radius*Radius, 2):AppData.Circle~}');
// '314.16'

// Formatted output with CONCAT
_Pict.AppData.Metrics = { Height: 48 };
_Pict.parseTemplate('{~S:CONCAT("Height is ", Height, " units."):AppData.Metrics~}');
// 'Height is 48 units.'
```

### Practical Patterns

**Invoice line totals:**

```javascript
_Pict.TemplateProvider.addTemplate('LineItem',
	'<tr><td>{~D:Record.Description~}</td><td>{~S:ROUND(Qty*Price,2):Record~}</td></tr>');

_Pict.AppData.Lines = [
	{ Description: 'Widget', Qty: 5, Price: 9.99 },
	{ Description: 'Gadget', Qty: 2, Price: 24.50 }
];

_Pict.parseTemplate('<table>{~TS:LineItem:AppData.Lines~}</table>');
```

**Percentage calculations:**

```javascript
_Pict.AppData.Progress = { Completed: 37, Total: 50 };

_Pict.parseTemplate(
	'{~S:ROUND(Completed/Total*100,1):AppData.Progress~}% complete');
// '74% complete'
```

---

## SolveByReference (SBR)

Resolves an equation string from a data address and evaluates it. The equation itself is stored in data rather than written directly in the template. Optionally resolves a data object and a Manyfest manifest for variable mapping.

**Tags:** `{~SolveByReference:EQUATION_ADDRESS~}` `{~SBR:EQUATION_ADDRESS~}` or `{~SBR:EQUATION_ADDRESS:DATA_ADDRESS:MANIFEST_ADDRESS~}`

**Parameters:**

| Parameter | Description |
|-----------|-------------|
| EQUATION_ADDRESS | Address containing the equation string |
| DATA_ADDRESS | Optional. Address of the data object for variable resolution |
| MANIFEST_ADDRESS | Optional. Address of a Manyfest instance for variable name mapping |

### Basic Usage

```javascript
_Pict.AppData.Formula = 'Width * Height';
_Pict.AppData.Dimensions = { Width: 100, Height: 50 };

_Pict.parseTemplate('{~SBR:AppData.Formula:AppData.Dimensions~}');
// '5000'
```

### With Manyfest Variable Mapping

When data uses nested addresses but the equation uses flat variable names, a Manyfest maps between them.

```javascript
_Pict.AppData.Equation = 'Area = Width * Height';
_Pict.AppData.RectangleData = { Size: { Width: 100, Height: 50 } };

// Create a Manyfest that maps nested paths to flat names
_Pict.AppData.RectangleManifest = _Pict.newManyfest({
	Scope: 'Rectangle',
	Descriptors: {
		'Size.Width': { Hash: 'Width' },
		'Size.Height': { Hash: 'Height' }
	}
});

_Pict.parseTemplate(
	'{~SBR:AppData.Equation:AppData.RectangleData:AppData.RectangleManifest~}');
// '5000'
```

SolveByReference is powerful for data-driven calculations where the formulas themselves are configurable. Pricing rules, scoring algorithms, or derived metrics can be stored as data and evaluated at render time without hardcoding the math in templates.

## When to Use Solve vs SolveByReference

| Scenario | Use |
|----------|-----|
| Fixed formula, data varies | `{~S:Qty*Price:Record~}` |
| Formula stored in data | `{~SBR:AppData.Formula:Record~}` |
| Nested data with variable mapping | `{~SBR:...^...^ManyfestInstance~}` |
| Simple constant math | `{~S:100+55~}` |
