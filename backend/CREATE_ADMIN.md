# Creating a Default Admin User

This project includes a script to create a default administrator user in the database. This is useful for initial setup or recovery if no admin exists.

## Script Location

- **Path:** `backend/createDefaultAdmin.ts`

## What It Does
- Connects to the MongoDB database.
- Checks if an administrator user already exists.
- If not, creates a user with:
  - **Username:** `admin`
  - **Email:** `admin@foosball.local`
  - **Password:** `admin1234` (Change this after first login!)
  - **Role:** `administrator`

## Usage

1. Make sure your database is running and environment variables are set (see `backend/.env`).
2. Run the script from the project root:

   ```sh
   npx ts-node backend/createDefaultAdmin.ts
   ```

3. If an admin user already exists, the script will exit without making changes.
4. If not, it will create the default admin user and print a confirmation message.

**Important:**
- Change the default password immediately after first login for security.
- You can modify the credentials in the script before running if needed.

---

For more details, see the script source at `backend/createDefaultAdmin.ts`.
