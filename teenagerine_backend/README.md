# 🛍️ Teenagerine Luxury Ecommerce Backend

A full-featured Node.js backend for **Teenagerine** — a luxury ecommerce platform for teenagers.
Built with **Express, MongoDB, JWT, Razorpay**, and equipped with advanced features like wishlist, reviews, returns, and personalized recommendations.

---

## 🚀 Features

- ✅ User Authentication (JWT + role-based access)
- ✅ Product & Category Management
- ✅ Cart & Order Management with Stock Sync
- ✅ Wishlist & Product Reviews
- ✅ Returns and Refund Requests
- ✅ Admin Dashboard (users, orders, inventory, revenue)
- ✅ Razorpay Payment Gateway Integration
- ✅ Personalized Product Recommendations
- ✅ Secure, Modular & Ready for Production

---

## 🧱 Tech Stack

- **Backend**: Node.js, Express
- **Database**: MongoDB + Mongoose
- **Auth**: JWT + bcrypt
- **Payments**: Razorpay
- **Image Uploads**: Cloudinary (planned)
- **Docs**: Swagger or Postman collection
- **Deploy**: Render / Railway / Docker-ready

---

## 📦 Installation

```bash
git clone https://github.com/your-username/teenagerine-backend.git
cd teenagerine-backend
npm install
```

---

## 🧪 Environment Variables

Create a `.env` file in the root:

```
PORT=5000
MONGO_URI=your-mongodb-uri
JWT_SECRET=your-secret
JWT_EXPIRES_IN=7d

RAZORPAY_KEY_ID=your-razorpay-key-id
RAZORPAY_KEY_SECRET=your-razorpay-key-secret
```

---

## 📂 Project Structure

```
src/
├── config/          # Database, Razorpay config
├── controllers/     # All business logic
├── models/          # Mongoose schemas
├── routes/          # All API routes
├── middlewares/     # Auth and security middlewares
├── utils/           # Helpers (e.g. logger, invoice)
├── app.js           # Express app setup
server.js            # Entry point
```

---

## 🧪 API Endpoints

| Route                                   | Description                     |
|----------------------------------------|---------------------------------|
| `POST /api/auth/signup`                | Register user                   |
| `POST /api/auth/login`                 | Login user                      |
| `GET  /api/products`                   | List all products               |
| `POST /api/cart/add`                   | Add product to cart             |
| `POST /api/orders`                     | Place order from cart           |
| `POST /api/payment/create-order`       | Create Razorpay order           |
| `POST /api/payment/verify`             | Verify payment                  |
| `GET  /api/recommendations`            | Personalized recommendations    |
| `GET  /api/admin/stats`                | Admin dashboard summary         |

Use `/api-docs` if Swagger is configured.

---

## 💳 Razorpay Integration

1. `POST /api/payment/create-order` → Create order in Razorpay.
2. Frontend opens Razorpay Checkout and obtains signature.
3. `POST /api/payment/verify` → Validate payment server‑side and mark order **Paid**.

---

## 🔐 Security

- Helmet, CORS, XSS Clean, Rate Limiting
- JWT authentication with refresh‑token pattern
- Admin‑only routes protected

---

## 🛠️ Scripts

```bash
npm run dev     # Start in development with nodemon
npm start       # Start in production
```

---

## 🛠️ Future Improvements

- 📦 Cloudinary for image uploads
- ✉️ Nodemailer for transactional emails
- 📊 ElasticSearch or Redis for faster filtering
- 🤖 ML‑powered product recommendations

---

## 📄 License

MIT

---

## 👨‍💻 Author

Made with ❤️ by [Suman kumar](https://github.com/Joe-Watson)
