**# Invoice Master - Web Application**



**Professional invoice management system with PostgreSQL backend.**



**## Features**



**- 🔐 User Authentication**

**- 📄 Invoice Management (Create, Edit, Delete, PDF Export)**

**- 👥 Customer Management**

**- 📦 Product Management with Stock Tracking**

**- ⚙️ Company Settings**

**- 💳 Payment Recording**

**- 📊 Advanced Filtering \& Search**



**## Tech Stack**



**\*\*Frontend:\*\***

**- HTML5, CSS3, JavaScript (Vanilla)**

**- jsPDF for PDF generation**



**\*\*Backend:\*\***

**- Node.js + Express**

**- PostgreSQL Database**

**- JWT Authentication**

**- bcrypt for password hashing**



**## Local Development**



**### Prerequisites**

**- Node.js 16+**

**- PostgreSQL 13+**



**### Setup**



**1. Clone the repository**

**```bash**

**git clone <your-repo-url>**

**cd invoice-master-web**

**```**



**2. Install backend dependencies**

**```bash**

**cd backend**

**npm install**

**```**



**3. Create `.env` file**

**```bash**

**DATABASE\_URL=postgresql://user:password@localhost:5432/invoice\_master**

**JWT\_SECRET=your-secret-key**

**PORT=5000**

**FRONTEND\_URL=http://localhost:5000**

**NODE\_ENV=development**

**```**



**4. Initialize database**

**```bash**

**# The schema will be auto-created on first run**

**npm run dev**

**```**



**5. Access the application**

**```**

**http://localhost:5000**

**```**



**Default credentials:**

**- Username: `admin`**

**- Password: `admin123`**



**## Railway Deployment**



**### Step 1: Create Railway Account**

**1. Go to \[Railway.app](https://railway.app)**

**2. Sign up with GitHub**



**### Step 2: Create New Project**

**1. Click "New Project"**

**2. Select "Deploy from GitHub repo"**

**3. Connect your repository**



**### Step 3: Add PostgreSQL**

**1. In your project, click "New"**

**2. Select "Database" → "PostgreSQL"**

**3. Railway will automatically provision the database**



**### Step 4: Configure Environment Variables**

**1. Click on your service**

**2. Go to "Variables" tab**

**3. Add:**

   **- `DATABASE\_URL` (automatically set by Railway)**

   **- `JWT\_SECRET` (generate a random string)**

   **- `NODE\_ENV=production`**

   **- `FRONTEND\_URL` (will be your Railway URL)**



**### Step 5: Deploy**

**1. Railway will automatically deploy**

**2. Get your public URL from the "Settings" → "Networking"**



**## Project Structure**

**```**

**invoice-master-web/**

**├── frontend/**

**│   ├── index.html**

**│   ├── dashboard.html**

**│   ├── css/**

**│   ├── js/**

**│   └── assets/**

**├── backend/**

**│   ├── server.js**

**│   ├── config/**

**│   ├── routes/**

**│   ├── middleware/**

**│   ├── models/**

**│   └── package.json**

**├── .env**

**├── .gitignore**

**├── Procfile**

**└── README.md**

**```**



**## API Endpoints**



**### Authentication**

**- `POST /api/auth/register` - Register new user**

**- `POST /api/auth/login` - Login**

**- `POST /api/auth/logout` - Logout**

**- `GET /api/auth/me` - Get current user**



**### Invoices**

**- `GET /api/invoices` - Get all invoices**

**- `GET /api/invoices/:id` - Get single invoice**

**- `POST /api/invoices` - Create invoice**

**- `PUT /api/invoices/:id` - Update invoice**

**- `DELETE /api/invoices/:id` - Delete invoice**

**- `POST /api/invoices/:id/payment` - Record payment**



**### Customers**

**- `GET /api/customers` - Get all customers**

**- `POST /api/customers` - Create customer**

**- `PUT /api/customers/:id` - Update customer**

**- `DELETE /api/customers/:id` - Delete customer**



**### Products**

**- `GET /api/products` - Get all products**

**- `POST /api/products` - Create product**

**- `PUT /api/products/:id` - Update product**

**- `PATCH /api/products/:id/stock` - Update stock**

**- `DELETE /api/products/:id` - Delete product**



**### Settings**

**- `GET /api/settings` - Get all settings**

**- `PUT /api/settings/:key` - Update setting**

**- `POST /api/settings/bulk` - Bulk update**



**## License**



**MIT**



**## Support**



**For issues and questions, please open an issue on GitHub.**

