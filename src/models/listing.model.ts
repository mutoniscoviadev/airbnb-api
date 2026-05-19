export interface Listing {
  id: number;
  title: string;
  description: string;
  location: string;
  pricePerNight: number;
  guests: number;
  type: "apartment" | "house" | "villa" | "cabin";
  amenities: string[];
  rating?: number;
  host: string;
}

export const listings: Listing[] = [
  {
    id: 1,
    title: "Cozy Downtown Apartment",
    description: "A beautiful apartment in the heart of the city.",
    location: "New York, NY",
    pricePerNight: 120,
    guests: 2,
    type: "apartment",
    amenities: ["WiFi", "Kitchen", "Air Conditioning"],
    rating: 4.8,
    host: "Alice Johnson",
  },
  {
    id: 2,
    title: "Sunny Beach House",
    description: "Relax and enjoy the ocean breeze from this lovely beach house.",
    location: "Miami, FL",
    pricePerNight: 250,
    guests: 6,
    type: "house",
    amenities: ["WiFi", "Pool", "BBQ", "Parking"],
    rating: 4.9,
    host: "Carol White",
  },
  {
    id: 3,
    title: "Mountain Cabin Retreat",
    description: "Escape the city and enjoy nature in this cozy cabin.",
    location: "Aspen, CO",
    pricePerNight: 180,
    guests: 4,
    type: "cabin",
    amenities: ["Fireplace", "Hiking Trails", "WiFi", "Kitchen"],
    rating: 4.7,
    host: "Alice Johnson",
  },
];