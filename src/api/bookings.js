// src/api/bookings.js
import { api } from "./client";

export async function listBookings() {
  const res = await api.get("/bookings");
  return res.data?.data ?? res.data;
}

export async function getBooking(id) {
  const res = await api.get(`/bookings/${id}`);
  return res.data?.data ?? res.data;
}

/**
 * Backend response shape:
 * { available, window, requirements, availability, shortages }
 */
export async function previewBookingAvailability(payload) {
  const res = await api.post("/bookings/preview-availability", payload);
  return res.data?.data ?? res.data;
}

export async function createBooking(payload) {
  const res = await api.post("/bookings", payload);
  return res.data?.data ?? res.data;
}

export async function cancelBooking(id) {
  const res = await api.patch(`/bookings/${id}/cancel`);
  return res.data?.data ?? res.data;
}

export async function getPackingList(id) {
  const res = await api.get(`/bookings/${id}/packing-list`);
  return res.data?.data ?? res.data;
}