# Water Purifier API

API endpoints:
   - `GET /api/products` - list products
   - `GET /api/products/:id` - get product by id
   - `POST /api/products` - create product (expects JSON body)
   - `PUT /api/products/:id` - update product
   - `DELETE /api/products/:id` - delete product

## Notes
- This project uses `pg` and expects a Postgres-compatible connection (Neon). Make sure `sslmode=require` or appropriate SSL params for Neon.
- Seed script reads `data/products.json` and inserts rows; it will skip if a primary key already exists.
"# water_purifier_api" 
