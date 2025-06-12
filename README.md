# EasyLLMAssess

## Setup

1. Make sure to install dependencies:

```bash
pnpm install
```

2. Make sure you have a MySQL database running.

3. Create a `.env` file in the root directory and configure the necessary environment variables:

```text
NUXT_MYSQL_HOST=localhost
NUXT_MYSQL_PORT=3306
NUXT_MYSQL_USER=root
NUXT_MYSQL_PASSWORD=your_password
NUXT_MYSQL_DATABASE=EasyLLMAssess
```

4. Run the SQL Script in `create_table.sql` to create the necessary database tables.

## Development Server

Start the development server on `http://localhost:3000`:

```bash
pnpm dev
```
