# Content Management Scripts

This directory contains scripts for initializing and managing content in the database.

## Available Scripts

### `initializePageContent.js`

This script initializes the database with content from the following pages:
- Product Condition Guidelines
- Terms and Conditions
- Order Policy
- Privacy Policy
- Shipping and Delivery
- Buyer FAQ
- Seller FAQ

#### Usage

Run the script from the project root directory:

```bash
node src/scripts/initializePageContent.js
```

#### Important Notes

1. Before running the script, make sure to update the `ADMIN_ID` variable with a valid admin user ID from your database.

2. The script checks if content already exists for each page type before creating new content, so it's safe to run multiple times.

3. If you want to update existing content, use the Content Manager in the admin dashboard instead of running this script again.

## Content Management

After running the initialization script, you can manage all page content through the Content Manager in the admin dashboard:

1. Log in as an administrator
2. Navigate to `/admin/content`
3. Use the tabs to select the page you want to edit
4. Make your changes and click "Save Changes"

The changes will be immediately reflected on the public-facing pages.