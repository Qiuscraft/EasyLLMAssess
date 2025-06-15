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

## Project File Structure

```text
.
├── assets # Static assets like images and styles
├── components # Vue components
├── pages # Nuxt.js pages
├── public # Publicly accessible files
├── server # Server-side code
|   ├── api # API endpoints
|   ├── db # Database connection and operations
|   |   ├── connection.ts # MySQL connection provider
|   |   └── ... # Other database-related operations
|   └── types # Type definitions for server-side code
├── stores # Pinia stores for state management
├── utils # Utility functions
├── .gitignore # Git ignore file
├── app.vue # Main Vue app file
├── create_table.sql # SQL script to create database tables
├── nuxt.config.js # Nuxt.js configuration file
├── package.json # Project dependencies and scripts
├── pnpm-lock.yaml # Lock file for dependencies
├── README.md # Project documentation
├── tsconfig.json # TypeScript configuration file
```
