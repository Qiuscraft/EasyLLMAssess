# EasyLLMAssess

## Setup

1. Run the SQL Script in `create_table.sql` to create the necessary database tables.

2. Make sure to install dependencies:

```bash
# pnpm
pnpm install
```

3. Create a `.env` file in the root directory and configure the necessary environment variables:

```text
NUXT_MYSQL_HOST=localhost
NUXT_MYSQL_PORT=3306
NUXT_MYSQL_USER=root
NUXT_MYSQL_PASSWORD=your_password
NUXT_MYSQL_DATABASE=EasyLLMAssess
```

## Development Server

Start the development server on `http://localhost:3000`:

```bash
# pnpm
pnpm dev
```

## 需求整理

1. 一个原始问题可能有多个原始回答
2. 众包数据集的构建
3. 数据集、标准问题可以变化
4. 标准问题存在，标准答案不一定存在
5. 标准问题：分类、标签
6. 记录众包回答的质量(Optional)

## TODO

1. json src question change
2. mysql add src answer, src question change
