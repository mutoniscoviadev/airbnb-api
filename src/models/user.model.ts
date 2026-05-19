export interface User {
  id: number;
  name: string;
  email: string;
  username: string;
  phone: string;
  role: "host" | "guest";
  avatar?: string;
  bio?: string;
}

export const users: User[] = [
  {
    id: 1,
    name: "Alice Johnson",
    email: "alice@example.com",
    username: "alicej",
    phone: "+1-555-0101",
    role: "host",
    avatar: "https://i.pravatar.cc/150?img=1",
    bio: "Love hosting travelers from around the world!",
  },
  {
    id: 2,
    name: "Bob Smith",
    email: "bob@example.com",
    username: "bobsmith",
    phone: "+1-555-0102",
    role: "guest",
    avatar: "https://i.pravatar.cc/150?img=2",
    bio: "Avid traveler and food lover.",
  },
  {
    id: 3,
    name: "Carol White",
    email: "carol@example.com",
    username: "carolw",
    phone: "+1-555-0103",
    role: "host",
    bio: "Superhost with 5 years of experience.",
  },
];