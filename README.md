# Grabite – Frontend

Frontend application for **Grabite**, a multi-tenant inventory and booking SaaS that prevents businesses from double-booking inventory across overlapping bookings.

This React application provides the user interface for managing organisations, inventory, packages, addons, and bookings.

---

## Live Application

https://grabite.co/

Backend Repository  
https://github.com/Danyy737/inventory-booking-saas

Frontend Repository  
https://github.com/Danyy737/inventory-booking-frontend

---

## Overview

Grabite is designed for businesses that need to manage physical inventory across bookings or reservations.

Examples include:

- Event hire companies
- Equipment rental services
- Party hire businesses
- Production or AV equipment rental
- Service businesses with limited stock

The platform ensures inventory cannot be reserved more than once for the same time window.

The frontend handles the full user workflow including onboarding, inventory management, booking creation, and availability validation.

---

## Core Features

### Authentication
- User registration
- Login and logout
- Protected routes
- Auth state management

### Organisation Onboarding
- Create an organisation
- Join an organisation via invite code
- Tenant-aware user interface

### Inventory Management
- Create inventory items
- Edit stock quantities
- Remove inventory items

### Package Management
- Build reusable bundles of inventory items
- Select packages during booking creation

### Addons
- Create optional extras backed by inventory
- Support quantity-based addon selection

### Booking Management
- Create bookings with start and end times
- View booking details
- Cancel bookings
- View packing lists

### Availability Checking
- Preview inventory availability before confirming a booking
- Display required vs available inventory
- Prevent invalid booking confirmation when stock is insufficient

---

## Booking Workflow

1. User selects booking start and end time
2. User selects a package
3. User optionally adds addons
4. The system checks inventory availability
5. Required vs available stock is displayed
6. If stock is available the booking can be confirmed
7. The user is redirected to the booking detail page

Addon quantities are included in the final inventory calculation.

---

## Tech Stack

- React
- React Router
- Axios
- Context API
- Vite
- Tailwind CSS
- Component-based UI architecture

---

## Project Structure

src/

api/  
client.js – Axios API client

auth/  
AuthContext.jsx – authentication state management

pages/  
Dashboard.jsx  
Inventory.jsx  
Packages.jsx  
Addons.jsx  
Bookings.jsx  
Availability.jsx  
BookingDetail.jsx  
Login.jsx  
Register.jsx  
Onboarding.jsx  

App.jsx – application routing

---

## API Integration

The frontend communicates with the Laravel backend using an Axios API client.

Base configuration can be found in:

src/api/client.js

Make sure the backend API URL is configured correctly in your environment variables.

Example:

VITE_API_URL=http://localhost:8000/api

---

## Local Development

Clone the repository

git clone https://github.com/Danyy737/inventory-booking-frontend.git

cd inventory-booking-frontend

Install dependencies

npm install

Create environment file

VITE_API_URL=http://localhost:8000/api

Start development server

npm run dev

Open the app

http://localhost:5173

---

## What This Project Demonstrates

This project demonstrates:

- building a full SaaS frontend with React
- authenticated route handling
- API integration with Laravel backend
- multi-tenant user flows
- inventory-aware booking workflows
- modern frontend development with Vite
- cloud deployment

---

## Author

Daniel Mourad

Full Stack Developer
