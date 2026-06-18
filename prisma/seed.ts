import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env["DATABASE_URL"] });
const prisma = new PrismaClient({ adapter });

async function main() {
  // Get the existing host
  const host = await prisma.user.findFirst({ where: { role: "HOST" } });
  if (!host) {
    console.log("❌ No host user found. Create a host user first via /api/v1/auth/register");
    return;
  }

  console.log(`✅ Found host: ${host.name}`);

  const listings = [
    { title: "Beachfront Villa in Bali", description: "Stunning beachfront villa with ocean views and private beach access.", location: "Bali, Indonesia", pricePerNight: 350, guests: 6, type: "VILLA", amenities: ["wifi", "pool", "kitchen", "parking"] },
    { title: "Cozy Mountain Cabin", description: "A cozy cabin surrounded by mountains, perfect for skiing and hiking.", location: "Aspen, Colorado", pricePerNight: 185, guests: 4, type: "CABIN", amenities: ["wifi", "fireplace", "kitchen"] },
    { title: "Modern City Apartment", description: "Sleek modern apartment in the heart of the city close to everything.", location: "New York, USA", pricePerNight: 220, guests: 2, type: "APARTMENT", amenities: ["wifi", "gym", "kitchen"] },
    { title: "Countryside Farmhouse", description: "A charming farmhouse in the rolling hills of Tuscany.", location: "Tuscany, Italy", pricePerNight: 275, guests: 8, type: "HOUSE", amenities: ["wifi", "garden", "kitchen", "parking"] },
    { title: "Luxury Penthouse Suite", description: "Breathtaking views of Paris from this luxury penthouse.", location: "Paris, France", pricePerNight: 480, guests: 4, type: "APARTMENT", amenities: ["wifi", "pool", "concierge", "kitchen"] },
    { title: "Tropical Beach Bungalow", description: "Wake up to the sound of waves in this paradise bungalow.", location: "Maldives", pricePerNight: 420, guests: 2, type: "VILLA", amenities: ["wifi", "beach access", "pool"] },
    { title: "Historic City Center Flat", description: "Charming flat in a historic building steps from the Colosseum.", location: "Rome, Italy", pricePerNight: 160, guests: 3, type: "APARTMENT", amenities: ["wifi", "kitchen"] },
    { title: "Lakeside Retreat", description: "Peaceful lakeside cabin perfect for nature lovers and fishing.", location: "Lake Tahoe, USA", pricePerNight: 210, guests: 6, type: "CABIN", amenities: ["wifi", "kayaks", "fireplace", "kitchen"] },
    { title: "Desert Oasis Villa", description: "Stunning villa with private pool in the heart of the desert.", location: "Dubai, UAE", pricePerNight: 550, guests: 8, type: "VILLA", amenities: ["wifi", "pool", "kitchen", "gym"] },
    { title: "Charming Countryside Cottage", description: "A quaint cottage perfect for a romantic weekend getaway.", location: "Cotswolds, UK", pricePerNight: 145, guests: 2, type: "HOUSE", amenities: ["wifi", "garden", "fireplace"] },
    { title: "Ski-in Ski-out Chalet", description: "Hit the slopes right from your door in this luxury chalet.", location: "Zermatt, Switzerland", pricePerNight: 620, guests: 10, type: "CABIN", amenities: ["wifi", "hot tub", "fireplace", "kitchen"] },
    { title: "Bohemian Loft Downtown", description: "Artsy loft in the creative district surrounded by galleries.", location: "Berlin, Germany", pricePerNight: 130, guests: 2, type: "APARTMENT", amenities: ["wifi", "kitchen", "bike rental"] },
    { title: "Oceanfront Condo", description: "Stunning ocean views from every room in this modern condo.", location: "Miami, USA", pricePerNight: 295, guests: 4, type: "APARTMENT", amenities: ["wifi", "pool", "gym", "kitchen"] },
    { title: "Vineyard Guest House", description: "Stay among the vines in this beautiful Napa Valley guest house.", location: "Napa Valley, USA", pricePerNight: 320, guests: 4, type: "HOUSE", amenities: ["wifi", "wine tasting", "kitchen", "parking"] },
    { title: "Jungle Treehouse", description: "Unique treehouse experience surrounded by lush jungle.", location: "Costa Rica", pricePerNight: 190, guests: 2, type: "VILLA", amenities: ["wifi", "pool", "nature tours"] },
    { title: "Santorini Cliffside Suite", description: "Iconic white-washed suite with stunning caldera views.", location: "Santorini, Greece", pricePerNight: 395, guests: 2, type: "VILLA", amenities: ["wifi", "pool", "breakfast"] },
    { title: "Tokyo Studio Apartment", description: "Compact and stylish studio in the heart of Shibuya.", location: "Tokyo, Japan", pricePerNight: 110, guests: 2, type: "APARTMENT", amenities: ["wifi", "kitchen"] },
    { title: "Cape Town Beach House", description: "Gorgeous beach house with views of Table Mountain.", location: "Cape Town, South Africa", pricePerNight: 240, guests: 6, type: "HOUSE", amenities: ["wifi", "pool", "kitchen", "parking"] },
    { title: "Amsterdam Canal Apartment", description: "Classic Dutch apartment overlooking a beautiful canal.", location: "Amsterdam, Netherlands", pricePerNight: 175, guests: 3, type: "APARTMENT", amenities: ["wifi", "kitchen", "bike rental"] },
    { title: "Kigali Hilltop Villa", description: "Panoramic views of Kigali from this stunning hilltop villa.", location: "Kigali, Rwanda", pricePerNight: 165, guests: 6, type: "VILLA", amenities: ["wifi", "pool", "kitchen", "parking"] },
  ];

  let created = 0;
  for (const data of listings) {
    await prisma.listing.create({
      data: { ...data, hostId: host.id },
    });
    created++;
    console.log(`  ✅ Created: ${data.title} (${data.location})`);
  }

  console.log(`\n🎉 Successfully seeded ${created} listings!`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());