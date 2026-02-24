# Inventory Booking SaaS – Frontend

Frontend application for the Inventory Booking SaaS platform.

This React application connects to the Laravel backend API and provides the user interface for managing inventory, packages, bookings, and availability checks.

Backend Repository:
https://github.com/Danyy737/inventory-booking-saas

---

## Overview

This frontend provides:

- Authentication (login / register)
- Organisation selection
- Inventory management UI
- Package management UI
- Booking creation and management
- Standalone availability checker
- Packing list viewing

The application communicates with the backend API using Axios and is protected using Sanctum authentication tokens.

---

## Tech Stack

- React
- React Router
- Axios
- Context API (Auth Context)
- Vite (or your current build tool)

---

## How It Connects to the Backend

The frontend communicates with the Laravel backend via an Axios API client.

The base URL is configured in:

```
src/api/client.js
```

Make sure your backend is running before starting the frontend.

---

## Installation

Clone the repository:

```
git clone <your-frontend-repo-url>
cd inventory-booking-frontend
```

Install dependencies:

```
npm install
```

Run the development server:

```
npm run dev
```

Ensure the backend server is running at the configured base URL.

---

## Core Pages

- Dashboard
- Inventory
- Packages
- Bookings
- Availability
- Booking Detail (Packing List)

---

## Project Structure

```
src/
 ├── api/
 │    └── client.js
 ├── auth/
 │    └── AuthContext.jsx
 ├── pages/
 │    ├── Availability.jsx
 │    ├── Bookings.jsx
 │    ├── BookingDetail.jsx
 │    ├── Inventory.jsx
 │    ├── Packages.jsx
 │    └── Dashboard.jsx
 └── App.jsx
```

---

## Status

MVP Complete.

This frontend integrates with the backend to provide:

- Multi-tenant organisation support
- Real-time availability validation
- Reservation-based conflict prevention
- Package expansion logic
- Packing list generation

---

## Future Improvements

- Package addons UI
- Booking lifecycle states
- Calendar view
- Dashboard reporting
- UI design improvements
- Production deployment configuration

---

## Author

Daniel Mourad

Frontend client for the Inventory Booking SaaS platform.
