# Bahamm Frontend Application

## Features

### Favorites Feature
The application now supports a favorites feature that allows users to:
- View their favorite products
- Add products to their favorites
- Remove products from their favorites

#### Implementation Details
1. **Backend API Integration**:
   - Backend endpoints for fetching user's favorites (`GET /favorites/user`)
   - Adding products to favorites (`POST /favorites/add`)
   - Removing products from favorites (`POST /favorites/remove`)

2. **Favorites Service**:
   - Centralized service for handling favorite-related operations (`src/services/favoriteService.ts`)
   - Provides functions for adding, removing, checking, and fetching favorites
   - Includes error handling and fallback mechanisms

3. **FavoritesPage Component**:
   - Displays a grid of the user's favorite products
   - Includes loading states and error handling
   - Empty state when the user has no favorites
   - Ability to remove products from favorites

4. **ProductInfo Component**:
   - Heart icon button for adding/removing products from favorites
   - Visually indicates when a product is in the user's favorites
   - Updates in real-time when the user toggles favorite status

#### Error Handling
- The implementation includes comprehensive error handling at both the backend and frontend levels
- Backend errors are logged and properly formatted for the client
- Frontend provides fallback mechanisms when the API fails
- Optimistic UI updates for a responsive user experience

#### User Authentication Integration
- Favorites are associated with the current authenticated user
- Uses the AuthContext to get the current user's ID
- Adds the authentication token to API requests

#### Future Improvements
- Add caching for favorites to reduce API calls
- Implement offline support for adding favorites
- Add analytics to track popular favorites
- Provide recommendations based on favorite products

## Environment Configuration

The application uses environment variables to configure the backend API URL. These are centralized in the `src/utils/api.ts` file:

```typescript
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
```

### Setting Up Environment Variables

1. In development, create or modify a `.env.local` file (for local overrides):
   ```
   NEXT_PUBLIC_API_URL=http://localhost:8000/api
   ```

2. For production deployment, set the environment variable in your hosting platform:
   ```
   NEXT_PUBLIC_API_URL=https://api.your-production-domain.com/api
   ```

3. For testing or staging environments, use appropriate URLs for those environments.

This centralized approach makes it easy to change the API URL across the entire application without modifying code.

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
