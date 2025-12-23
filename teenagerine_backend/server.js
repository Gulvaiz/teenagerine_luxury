const dotenv = require("dotenv");
dotenv.config();

const fs = require("fs");
const path = require("path");
const connectDB = require("./src/config/db");
const app = require("./src/app");

const PORT = process.env.PORT || 5000;

// Ensure required directories exist
const requiredDirs = [
  path.join(__dirname, "uploads"),
  path.join(__dirname, "uploads/invoices"),
  path.join(__dirname, "uploads/images"),
  path.join(__dirname, "uploads/products"),
  path.join(__dirname, "uploads/vendors")
];

requiredDirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`✅ Created directory: ${dir}`);
  }
});

connectDB();

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Server running on http://127.0.0.1:${PORT}`);
});
