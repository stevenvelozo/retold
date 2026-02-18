# Testing

Retold modules use [Mocha](https://mochajs.org/) in TDD style with [Chai](https://www.chaijs.com/) assertions. Each module has its own test suite that runs independently.

## Running Module Tests

From any module directory:

```bash
npm test                  # Run the test suite
npm run coverage          # Run with code coverage (if available)
```

## Database Tests (Meadow)

The Meadow data access modules (`meadow`, `meadow-connection-mysql`, `meadow-connection-mssql`) require live database servers for their full test suites. Docker scripts in `modules/meadow/meadow/scripts/` manage disposable test containers on non-standard ports so they won't conflict with local database servers.

### Prerequisites

- [Docker](https://www.docker.com/) installed and running

### Ports

| Database | Container Name | Host Port | Standard Port |
|----------|---------------|-----------|---------------|
| MySQL 8.0 | `meadow-mysql-test` | **33306** | 3306 |
| MSSQL 2022 | `meadow-mssql-test` | **31433** | 1433 |

### Quick Start

From `modules/meadow/meadow/`:

```bash
# Start MySQL, seed the bookstore database, and run MySQL tests
npm run test-mysql

# Start MSSQL and run MSSQL tests
npm run test-mssql

# Start both and run the full suite
npm run test-all-providers
```

### Managing Containers

```bash
# MySQL
npm run docker-mysql-start     # Start container + seed data
npm run docker-mysql-stop      # Stop and remove container
npm run docker-mysql-status    # Check if container is running

# MSSQL
npm run docker-mssql-start
npm run docker-mssql-stop
npm run docker-mssql-status

# Both
npm run docker-cleanup         # Stop and remove both containers
```

Or call the scripts directly:

```bash
./scripts/mysql-test-db.sh start
./scripts/mssql-test-db.sh start
./scripts/meadow-test-cleanup.sh
```

### What the Scripts Do

**MySQL** (`mysql-test-db.sh start`):
1. Pulls and starts a `mysql:8.0` container on port 33306
2. Waits for MySQL to accept connections
3. Creates the `bookstore` database (via Docker `MYSQL_DATABASE` env)
4. Loads the bookstore schema (Book, Author, BookAuthorJoin, BookPrice, Review tables)
5. Seeds 20 books and 21 authors from the Retold test dataset

**MSSQL** (`mssql-test-db.sh start`):
1. Pulls and starts an `mcr.microsoft.com/mssql/server:2022-latest` container on port 31433
2. Waits for MSSQL to accept connections
3. Creates the `bookstore` database via `sqlcmd`

The MSSQL tests create their own tables in `suiteSetup`, so no additional schema loading is needed.

### Connection Details

**MySQL:**
- Host: `127.0.0.1`
- Port: `33306`
- User: `root`
- Password: `123456789`
- Database: `bookstore`

**MSSQL:**
- Host: `127.0.0.1`
- Port: `31433`
- User: `sa`
- Password: `1234567890abc.`
- Database: `bookstore`

### Running Individual Module Tests

Once the containers are running, you can also run the connection module tests directly:

```bash
# meadow-connection-mysql (requires MySQL container)
cd modules/meadow/meadow-connection-mysql && npm test

# meadow-connection-mssql (requires MSSQL container)
cd modules/meadow/meadow-connection-mssql && npm test
```

### Cleanup

When you're done testing, remove the containers:

```bash
cd modules/meadow/meadow
npm run docker-cleanup
```

This stops and removes both the MySQL and MSSQL test containers. The database data is ephemeral and does not persist between container restarts.
