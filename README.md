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
- Addons management UI (inventory-backed upsells)
- Booking creation and management (packages + addons)
- Availability preview and validation (prevents oversells)
- Packing list viewing (package + addon totals)

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
- Addons
- Booking Detail (Packing List)

---

## Addons + Bookings Integration

Addons are optional extras that can be added to a booking (e.g. “Extra Chairs”, “Extra Table”).
Each addon is backed by inventory items and consumes stock during the booking window.

### Booking flow
1. Select **Start** and **End**
2. Select a **Package**
3. Select **Addons** and set quantity for each addon
4. Click **Check availability**
   - Shows required vs available inventory (includes addon consumption)
5. Click **Confirm booking**
   - Creates booking + reservations, then redirects to booking detail

### How addon quantity works
If an addon contains inventory items with `quantity_per_unit`:
- Selecting `Extra Chairs x 2` where `quantity_per_unit = 5` reserves **10 chairs**.

> Note: inactive addons are hidden from the booking addon selector and the default addons list.

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
- Real-time availability validation (packages + addons)
- Reservation-based conflict prevention
- Package expansion logic
- Addon selection with quantity multiplier support
- Packing list generation (includes addons)

---

## Future Improvements

- Booking lifecycle states
- Calendar view
- Dashboard reporting
- UI design improvements
- Production deployment configuration

---

## Author

Daniel Mourad

Frontend client for the Inventory Booking SaaS platform.
