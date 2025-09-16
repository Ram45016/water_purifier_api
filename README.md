# Express NeonDB API (sample)

This is a minimal Express.js API configured to work with Neon (Postgres).  
It includes a `data/products.json` file (provided by you) and a seed script that inserts sample products into a `products` table.

## Setup

1. Copy `.env.example` to `.env` and set `DATABASE_URL` to your Neon Postgres connection string.
2. Install dependencies:
   ```
   npm install
   ```
3. Create the `products` table in your Postgres database. Example SQL (psql or any client):
   ```sql
   CREATE TABLE products (
     id TEXT PRIMARY KEY,
     name TEXT,
     brandName TEXT,
     buyingPrice INTEGER,
     sellingPrice INTEGER,
     vendorPrice INTEGER,
     quantity INTEGER,
     date DATE,
     images JSONB,
     isTopSelling BOOLEAN,
     isFeatured BOOLEAN,
     isBudgetFriendly BOOLEAN,
     customFields JSONB
   );
   ```
4. Run the seed script:
   ```
   npm run seed
   ```
5. Start the server:
   ```
   npm run dev
   ```
6. API endpoints:
   - `GET /api/products` - list products
   - `GET /api/products/:id` - get product by id
   - `POST /api/products` - create product (expects JSON body)
   - `PUT /api/products/:id` - update product
   - `DELETE /api/products/:id` - delete product

## Notes
- This project uses `pg` and expects a Postgres-compatible connection (Neon). Make sure `sslmode=require` or appropriate SSL params for Neon.
- Seed script reads `data/products.json` and inserts rows; it will skip if a primary key already exists.
"# water_purifier_api" 
