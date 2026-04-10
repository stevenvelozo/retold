# Todo List: CLI Client

> Part of the [Todo List Application](examples/todolist/todo-list.md) example.
>
> **Source:** [`examples/todo-list/cli-client/`](../examples/todo-list/cli-client/)

The CLI client is a non-interactive command-line tool built on pict-service-commandlineutility. It demonstrates the command-per-folder pattern used by Quackage and other Retold CLI tools: each command lives in its own folder, shares a common API service, and registers itself with the Commander.js-based framework.

## Running

```bash
cd examples/todo-list/cli-client
npm install
npx todo --help
```

The server must be running on port 28086 (or configure a different URL in `.todo-cli.json`).

### Running with Docker

From the `examples/todo-list/` directory, run `./docker-shell.sh` for an interactive shell inside the container. Start the server in the background, then use the CLI:

```bash
node server/server.cjs &
cd /app/cli-client && npx todo list
```

See the [main quickstart](examples/todolist/todo-list.md) for details.

### User Interface

This is a pure command-line interface so each time you run it it does one thing.  Here is what listing events looks like:

```shell
MatchBookPro[08:11:36]~/Code/retold/examples/todo-list/cli-client: npm start -- ls

> retold-example-todo-cli@1.0.0 start
> node source/TodoCLI-Run.js ls

2026-04-10T15:11:46.892Z [info] (TodoCLI): Fetching tasks...
2026-04-10T15:11:46.906Z [info] (TodoCLI): 50 task(s):
2026-04-10T15:11:46.906Z [info] (TodoCLI):
2026-04-10T15:11:46.906Z [info] (TodoCLI): ID    Status        Due Date     Hours  Name
2026-04-10T15:11:46.906Z [info] (TodoCLI): ------------------------------------------------------------------------------
2026-04-10T15:11:46.906Z [info] (TodoCLI): 493   Pending       2026-04-18   4      Spring garden planting
2026-04-10T15:11:46.906Z [info] (TodoCLI): 492   Pending       2026-04-12   4      File taxes
2026-04-10T15:11:46.906Z [info] (TodoCLI): 507   Pending       2026-04-01   3      Easter brunch prep
2026-04-10T15:11:46.906Z [info] (TodoCLI): 508   Pending       2026-03-20   2      Q3 planning meeting
2026-04-10T15:11:46.906Z [info] (TodoCLI): 503   Pending       2026-03-15   4      Paint bedroom accent wall
2026-04-10T15:11:46.906Z [info] (TodoCLI): 509   In Progress   2026-03-15   4      Write API documentation
2026-04-10T15:11:46.906Z [info] (TodoCLI): 491   Pending       2026-03-14   2      Mom's birthday
2026-04-10T15:11:46.906Z [info] (TodoCLI): 504   Pending       2026-03-12   6      Organize garage
2026-04-10T15:11:46.906Z [info] (TodoCLI): 502   Pending       2026-03-10   0.25   Allergy meds refill
2026-04-10T15:11:46.907Z [info] (TodoCLI): 505   Pending       2026-03-09   1.5    Vet appointment for Max
2026-04-10T15:11:46.907Z [info] (TodoCLI): 501   Pending       2026-03-08   1      Set up kids' bikes for spring
2026-04-10T15:11:46.907Z [info] (TodoCLI): 500   Pending       2026-03-06   0.5    Review 401k contributions
2026-04-10T15:11:46.907Z [info] (TodoCLI): 499   Pending       2026-03-04   0.5    Schedule meeting with financial advisor
2026-04-10T15:11:46.907Z [info] (TodoCLI): 506   Pending       2026-03-02   0.5    Dog grooming appointment
2026-04-10T15:11:46.907Z [info] (TodoCLI): 498   Pending       2026-03-01   1      Renew homeowner's insurance
2026-04-10T15:11:46.907Z [info] (TodoCLI): 510   Pending       2026-03-01   1.5    Renew passport
2026-04-10T15:11:46.907Z [info] (TodoCLI): 490   Pending       2026-02-27   0.25   Replace windshield wipers
2026-04-10T15:11:46.907Z [info] (TodoCLI): 489   Pending       2026-02-26   2      Annual physical exam
2026-04-10T15:11:46.907Z [info] (TodoCLI): 497   Pending       2026-02-25   0.25   Update the home Wi-Fi password
2026-04-10T15:11:46.907Z [info] (TodoCLI): 488   Pending       2026-02-24   2      Book club meeting
2026-04-10T15:11:46.907Z [info] (TodoCLI): 487   Pending       2026-02-23   1.5    Dentist cleaning
2026-04-10T15:11:46.907Z [info] (TodoCLI): 486   Pending       2026-02-22   1      Oil change for the Honda
2026-04-10T15:11:46.907Z [info] (TodoCLI): 494   Pending       2026-02-22   3      Batch cook meals for the week
2026-04-10T15:11:46.907Z [info] (TodoCLI): 485   Pending       2026-02-21   8      Spring cleaning weekend
2026-04-10T15:11:46.907Z [info] (TodoCLI): 496   Pending       2026-02-20   1.5    Attend PTA meeting
2026-04-10T15:11:46.907Z [info] (TodoCLI): 495   In Progress   2026-02-19   0.5    Haircut appointment
2026-04-10T15:11:46.907Z [info] (TodoCLI): 482   In Progress   2026-02-16   4      Board meeting prep
2026-04-10T15:11:46.907Z [info] (TodoCLI): 483   In Progress   2026-02-16   0.5    Weekly team standup
2026-04-10T15:11:46.907Z [info] (TodoCLI): 484   In Progress   2026-02-16   0.25   Pay mortgage
2026-04-10T15:11:46.907Z [info] (TodoCLI): 832   Complete      2026-02-15   0.5    Wash and detail the car
2026-04-10T15:11:46.907Z [info] (TodoCLI): 481   Complete      2026-02-14   1.5    Coffee catch-up with Lisa
2026-04-10T15:11:46.907Z [info] (TodoCLI): 480   Complete      2026-02-13   0.25   Pay electric bill
2026-04-10T15:11:46.907Z [info] (TodoCLI): 479   Complete      2026-02-12   1.5    Stock up on pantry staples
2026-04-10T15:11:46.907Z [info] (TodoCLI): 478   Complete      2026-02-11   1.5    Grocery run for the week
2026-04-10T15:11:46.907Z [info] (TodoCLI): 477   Complete      2026-02-10   1      Valentine's Day reservation
2026-04-10T15:11:46.907Z [info] (TodoCLI): 831   Complete      2026-02-10   0.5    Pick up prescription refills
2026-04-10T15:11:46.907Z [info] (TodoCLI): 830   Complete      2026-02-09   1      Sprint retrospective
2026-04-10T15:11:46.907Z [info] (TodoCLI): 476   Complete      2026-02-07   3      Dinner with the Hendersons
2026-04-10T15:11:46.907Z [info] (TodoCLI): 829   Complete      2026-02-06   0.25   Pay credit card bill
2026-04-10T15:11:46.907Z [info] (TodoCLI): 828   Complete      2026-02-05   0.5    Replace smoke detector batteries
2026-04-10T15:11:46.907Z [info] (TodoCLI): 475   Complete      2026-02-04   1      1-on-1 with manager
2026-04-10T15:11:46.907Z [info] (TodoCLI): 474   Complete      2026-02-03   1      Submit expense report
2026-04-10T15:11:46.907Z [info] (TodoCLI): 473   Complete      2026-02-02   1      Car registration renewal
2026-04-10T15:11:46.907Z [info] (TodoCLI): 827   Complete      2026-02-01   0.25   Pay mortgage
2026-04-10T15:11:46.907Z [info] (TodoCLI): 472   Complete      2026-01-30   0.25   Pay credit card bill
2026-04-10T15:11:46.907Z [info] (TodoCLI): 471   Complete      2026-01-28   1.5    Sister's birthday
2026-04-10T15:11:46.907Z [info] (TodoCLI): 826   Complete      2026-01-25   3      Batch cook meals for the week
2026-04-10T15:11:46.907Z [info] (TodoCLI): 825   Complete      2026-01-24   1.5    Grocery run for the week
2026-04-10T15:11:46.907Z [info] (TodoCLI): 470   Complete      2026-01-23   2      Pizza night with kids
2026-04-10T15:11:46.907Z [info] (TodoCLI): 469   Complete      2026-01-22   0.25   Schedule kids' dental cleanings
2026-04-10T15:11:46.907Z [info] (TodoCLI):
MatchBookPro[08:11:46]~/Code/retold/examples/todo-list/cli-client:
```

## Commands

### `todo list`

List tasks with optional search, sort, and filter.

```bash
npx todo list                                   # Default: newest first, up to 50
npx todo list --search garden --limit 10        # Search name + description
npx todo list --column Name --direction ASC     # Sort alphabetically
npx todo list --status Pending                  # Client-side status filter
```

| Option | Description | Default |
|--------|-------------|---------|
| `-s, --search [text]` | LIKE search across Name and Description | (none) |
| `-c, --column [column]` | Sort column: DueDate, Name, Status, LengthInHours, IDTask | DueDate |
| `-d, --direction [dir]` | Sort direction: ASC or DESC | DESC |
| `-n, --limit [count]` | Maximum records to return | 50 |
| `--status [status]` | Client-side filter by status (Pending, In Progress, Complete) | (none) |

**Aliases:** `ls`, `l`

### `todo add`

Create a new task.

```bash
npx todo add "Water the plants" --due 2026-03-15 --hours 0.5
npx todo add "Team standup" --status "In Progress" --description "Daily 9am sync"
```

| Option | Description | Default |
|--------|-------------|---------|
| `-D, --description [text]` | Task description | (empty) |
| `-d, --due [date]` | Due date (YYYY-MM-DD) | (empty) |
| `-h, --hours [hours]` | Estimated hours | 0 |
| `-s, --status [status]` | Initial status | Pending |

**Aliases:** `new`, `create`

### `todo complete`

Mark a task as complete by ID. Fetches the task first and skips if already complete.

```bash
npx todo complete 42
```

**Aliases:** `done`, `finish`

### `todo remove`

Delete a task by ID.

```bash
npx todo remove 42
```

**Aliases:** `rm`, `delete`, `del`

### `todo explain-config`

Built-in command from pict-service-commandlineutility. Shows the resolved configuration after merging defaults with any `.todo-cli.json` files found in the home directory or current working directory.

## Architecture

```mermaid
graph TB
    subgraph cli["TodoCLI-CLIProgram"]
        commander["Commander.js<br/><i>Argument parsing</i>"]
        config["Configuration<br/><i>.todo-cli.json</i>"]
    end

    subgraph service["TodoCLI-Service-API"]
        http["http.request()<br/><i>JSON over HTTP</i>"]
        urlbuilder["buildFilteredPath()<br/><i>Meadow query URL construction</i>"]
    end

    subgraph commands["Commands"]
        list["list<br/><i>Tabular output</i>"]
        add["add<br/><i>POST /1.0/Task</i>"]
        remove["remove<br/><i>DELETE /1.0/Task/:id</i>"]
        complete["complete<br/><i>GET then PUT</i>"]
    end

    cli --> service
    cli --> commands
    commands --> service
    service --> server["API Server<br/>http://localhost:28086"]
```

### Command-per-folder Pattern

Each command lives in its own folder under `source/commands/`:

```
source/commands/
    list/       TodoCLI-Command-List.js
    add/        TodoCLI-Command-Add.js
    remove/     TodoCLI-Command-Remove.js
    complete/   TodoCLI-Command-Complete.js
```

This is the same pattern used by Quackage and other Retold CLI tools. Each command file exports a class that extends `ServiceCommandLineCommand`, sets its keyword, description, arguments, and options in the constructor, and implements `onRunAsync(fCallback)` for the command logic.

### Shared API Service

`TodoCLI-Service-API.js` extends `fable-serviceproviderbase` and provides two methods used by all commands:

- **`request(method, path, body, callback)`** -- makes an HTTP request to the API server, parses the JSON response, and returns it through the callback
- **`buildFilteredPath(sortColumn, sortDirection, searchText, limit)`** -- constructs a Meadow FilteredTo URL with sort stanzas and optional LIKE search filters (with `%` wildcards)

The service reads its base URL from `this.fable.settings.ApiBaseURL`, which defaults to `http://localhost:28086` and can be overridden in `.todo-cli.json`.

### Bootstrap

`TodoCLI-CLIProgram.js` creates a `pict-service-commandlineutility` instance with settings and an array of command class prototypes. The framework iterates the array, instantiates each command, and registers it with Commander.js. The `TodoAPI` service is registered separately using `addAndInstantiateServiceType`.

`TodoCLI-Run.js` is the shebang entry point (`#!/usr/bin/env node`) that requires the program module and calls `.run()`.

### Configuration

The framework automatically searches for `.todo-cli.json` in the user's home directory and the current working directory. Configuration from all sources is merged in order (defaults, home, CWD). The only setting is the API base URL:

```json
{
    "ApiBaseURL": "http://localhost:28086"
}
```

## Dependencies

| Module | Role |
|--------|------|
| `pict-service-commandlineutility` | CLI framework (Commander.js + Fable service container) |
| `fable-serviceproviderbase` | Base class for the API service (transitive dependency) |

## Files

| File | Purpose |
|------|---------|
| `source/TodoCLI-Run.js` | Shebang entry point for the `todo` bin command |
| `source/TodoCLI-CLIProgram.js` | Bootstrap -- registers commands and the API service |
| `source/services/TodoCLI-Service-API.js` | Shared HTTP client with JSON parsing and FilteredTo URL builder |
| `source/commands/list/TodoCLI-Command-List.js` | `todo list` -- tabular output with search, sort, filter, limit |
| `source/commands/add/TodoCLI-Command-Add.js` | `todo add <name>` -- create a task with options |
| `source/commands/remove/TodoCLI-Command-Remove.js` | `todo remove <id>` -- delete a task |
| `source/commands/complete/TodoCLI-Command-Complete.js` | `todo complete <id>` -- mark a task as complete |
