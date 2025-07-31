# E-commerce Platform - Final Project

A full-stack e-commerce platform with Persian/RTL support, featuring a React/Next.js frontend and Python FastAPI backend.

## 🚀 Features

### Frontend (Next.js)
- **Modern UI/UX**: Responsive design with Persian language support
- **Product Management**: Browse, search, and filter products
- **Shopping Cart**: Add/remove items with persistent storage
- **User Authentication**: Phone/SMS-based authentication
- **Payment Integration**: ZarinPal payment gateway
- **Group Buying**: Collaborative purchasing feature
- **Admin Panel**: Complete product and order management
- **User Profiles**: Order history and favorites

### Backend (FastAPI)
- **RESTful API**: Complete CRUD operations
- **Authentication**: JWT-based authentication system
- **Database**: SQLite with comprehensive models
- **Payment Processing**: ZarinPal integration
- **SMS Integration**: MeliPayamak SMS service
- **File Upload**: Image handling for products
- **Admin Features**: User and order management

## 📁 Project Structure

```
final-project/
├── frontend/                 # Next.js React application
│   ├── src/
│   │   ├── app/             # Next.js 13+ app directory
│   │   │   ├── admin/       # Admin panel
│   │   │   ├── auth/        # Authentication pages
│   │   │   ├── cart/        # Shopping cart
│   │   │   ├── products/    # Product pages
│   │   │   └── ...
│   │   ├── components/      # Reusable components
│   │   ├── contexts/        # React contexts
│   │   ├── utils/           # Utility functions
│   │   └── services/        # API services
│   ├── public/              # Static assets
│   └── package.json
├── backend/                 # FastAPI Python application
│   ├── app/
│   │   ├── routes/          # API route handlers
│   │   ├── models.py        # Database models
│   │   ├── database.py      # Database configuration
│   │   ├── services/        # Business logic
│   │   └── utils/           # Utility functions
│   ├── migrations/          # Database migrations
│   └── pyproject.toml
└── README.md
```

## 🛠️ Setup Instructions

### Prerequisites
- Node.js 18+ 
- Python 3.8+
- npm or yarn

### Backend Setup

1. **Navigate to backend directory:**
   ```bash
   cd backend
   ```

2. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   # or using poetry
   poetry install
   ```

3. **Set up environment variables:**
   Create a `.env` file in the backend directory:
   ```env
   DATABASE_URL=sqlite:///./bahamm.db
   SECRET_KEY=your-secret-key-here
   ZARINPAL_MERCHANT_ID=your-zarinpal-merchant-id
   SMS_API_KEY=your-sms-api-key
   ```

4. **Run database migrations:**
   ```bash
   python -m alembic upgrade head
   ```

5. **Start the backend server:**
   ```bash
   uvicorn app.main:app --reload --port 8001
   ```

### Frontend Setup

1. **Navigate to frontend directory:**
   ```bash
   cd frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   Create a `.env.local` file in the frontend directory:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:8001/api
   NEXT_PUBLIC_ADMIN_API_URL=http://localhost:8001/api
   ```

4. **Start the development server:**
   ```bash
   npm run dev
   ```

5. **Access the application:**
   - Frontend: http://localhost:3000
   - Admin Panel: http://localhost:3000/admin
   - Backend API: http://localhost:8001
   - API Documentation: http://localhost:8001/docs

## 🔧 Development

### Running Both Servers
You can run both frontend and backend simultaneously:

```bash
# Terminal 1 - Backend
cd backend && uvicorn app.main:app --reload --port 8001

# Terminal 2 - Frontend  
cd frontend && npm run dev
```

### Key Technologies

**Frontend:**
- Next.js 15 (App Router)
- React 18
- TypeScript
- Tailwind CSS
- React Context API
- React Icons

**Backend:**
- FastAPI
- SQLAlchemy
- Pydantic
- SQLite
- JWT Authentication
- Python 3.8+

## 📱 Features Overview

### User Features
- Product browsing and search
- Shopping cart management
- User authentication via SMS
- Order placement and tracking
- Payment via ZarinPal
- Group buying functionality
- User profile and favorites

### Admin Features
- Product management (CRUD)
- Order management
- User management
- Category management
- Dashboard with statistics

## 🔐 Authentication
The system uses JWT-based authentication with SMS verification:
- Users register/login with phone numbers
- SMS OTP verification
- JWT tokens for session management

## 💳 Payment Integration
Integrated with ZarinPal payment gateway:
- Secure payment processing
- Payment verification
- Transaction tracking

## 🌐 API Endpoints

### Public Endpoints
- `GET /api/products` - Get products
- `GET /api/categories` - Get categories
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration

### Protected Endpoints
- `POST /api/orders` - Create order
- `GET /api/user/profile` - Get user profile
- `POST /api/cart` - Cart operations

### Admin Endpoints
- `GET /api/admin/dashboard` - Admin dashboard stats
- `POST /api/admin/products` - Create products
- `PUT /api/admin/products/{id}` - Update products
- `DELETE /api/admin/products/{id}` - Delete products

## 📝 License
This project is for educational purposes.

## 🤝 Contributing
This is a final project. For educational purposes only.

## 📞 Support
For questions or issues, please check the documentation or create an issue in the repository. 