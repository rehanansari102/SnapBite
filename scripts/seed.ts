/**
 * Seed script — populates local dev databases with realistic data.
 *
 * Creates:
 *   - 1 restaurant_owner user (auth DB)
 *   - 1 customer user (auth DB)
 *   - 1 admin user (auth DB)
 *   - 3 restaurants with opening hours (restaurants DB)
 *   - menu items per restaurant (menus DB)
 *
 * Usage:
 *   npx ts-node -r tsconfig-paths/register scripts/seed.ts
 *
 * Prerequisites:
 *   - pnpm infra:up (Docker infra running)
 *   - auth-service running (to hash passwords via bcrypt)
 *     OR just run this script directly — it calls bcrypt itself
 */

import 'reflect-metadata';
import * as bcrypt from 'bcrypt';
import { DataSource } from 'typeorm';
import mongoose from 'mongoose';

// ── Config ───────────────────────────────────────────────────────────────────

const PG_URL = process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/snapbite_auth';
const MONGO_BASE = 'mongodb://localhost:27018/?replicaSet=rs0&directConnection=true';
const MONGO_RESTAURANTS_URL = `mongodb://localhost:27018/snapbite_restaurants?replicaSet=rs0&directConnection=true`;
const MONGO_MENUS_URL = `mongodb://localhost:27018/snapbite_menus?replicaSet=rs0&directConnection=true`;

// ── PostgreSQL setup ─────────────────────────────────────────────────────────

const dataSource = new DataSource({
  type: 'postgres',
  url: PG_URL,
  entities: [],
  synchronize: false,
});

// ── MongoDB schemas (inline — no NestJS deps needed) ─────────────────────────

const restaurantSchema = new mongoose.Schema({
  ownerId: String,
  name: String,
  description: String,
  cuisineTypes: [String],
  address: { street: String, city: String, country: String },
  location: { type: { type: String, default: 'Point' }, coordinates: [Number] },
  imageUrl: String,
  isOpen: { type: Boolean, default: true },
  isActive: { type: Boolean, default: true },
  isApproved: { type: Boolean, default: true },
  minimumOrder: { type: Number, default: 0 },
  deliveryFee: { type: Number, default: 30 },
  rating: { type: Number, default: 0 },
  reviewCount: { type: Number, default: 0 },
  openingHours: [{ day: Number, open: String, close: String, isClosed: Boolean }],
}, { timestamps: true });
restaurantSchema.index({ location: '2dsphere' });

const menuItemSchema = new mongoose.Schema({
  restaurantId: String,
  name: String,
  description: String,
  price: Number,
  category: String,
  imageUrl: String,
  isAvailable: { type: Boolean, default: true },
}, { timestamps: true });

// ── Seed data ────────────────────────────────────────────────────────────────

const OWNER_EMAIL    = 'owner@snapbite.dev';
const CUSTOMER_EMAIL = 'customer@snapbite.dev';
const ADMIN_EMAIL    = 'admin@snapbite.dev';
const DRIVER1_EMAIL  = 'driver1@snapbite.dev';
const DRIVER2_EMAIL  = 'driver2@snapbite.dev';
const SEED_PASSWORD  = 'Password123!';

const WEEKDAYS = [
  { day: 0, open: '10:00', close: '22:00', isClosed: false },
  { day: 1, open: '10:00', close: '22:00', isClosed: false },
  { day: 2, open: '10:00', close: '22:00', isClosed: false },
  { day: 3, open: '10:00', close: '22:00', isClosed: false },
  { day: 4, open: '10:00', close: '23:00', isClosed: false },
  { day: 5, open: '10:00', close: '23:00', isClosed: false },
  { day: 6, open: '11:00', close: '21:00', isClosed: false },
];

// Restaurants are located in Islamabad, Pakistan for local dev geo search
const restaurants = [
  {
    name: 'Spice Garden',
    description: 'Authentic desi curries, karahi and tandoor specialities',
    cuisineTypes: ['Pakistani', 'Desi'],
    address: { street: 'F-7 Markaz', city: 'Islamabad', country: 'PK' },
    location: { type: 'Point', coordinates: [73.0479, 33.7215] }, // F-7
    minimumOrder: 500,
    deliveryFee: 80,
    rating: 4.5,
    reviewCount: 128,
    menuItems: [
      { name: 'Chicken Karahi', description: 'Wok-cooked chicken in tomato and ginger gravy', price: 950, category: 'Main Course' },
      { name: 'Mutton Handi', description: 'Slow-cooked mutton in a clay pot', price: 1200, category: 'Main Course' },
      { name: 'Garlic Naan', description: 'Freshly baked leavened bread with garlic butter', price: 60, category: 'Breads' },
      { name: 'Dal Makhani', description: 'Slow-cooked black lentils in butter and cream', price: 380, category: 'Main Course' },
      { name: 'Mango Lassi', description: 'Chilled yogurt drink with Chaunsa mango', price: 180, category: 'Beverages' },
      { name: 'Gulab Jamun', description: 'Soft milk-solid dumplings in rose syrup (2 pcs)', price: 120, category: 'Desserts' },
    ],
  },
  {
    name: 'Pizza Pronto',
    description: 'Wood-fired pizzas and fresh pasta in the heart of Islamabad',
    cuisineTypes: ['Italian', 'Pizza'],
    address: { street: 'Kohsar Market, F-6', city: 'Islamabad', country: 'PK' },
    location: { type: 'Point', coordinates: [73.0551, 33.7294] }, // F-6
    minimumOrder: 800,
    deliveryFee: 100,
    rating: 4.3,
    reviewCount: 94,
    menuItems: [
      { name: 'Margherita', description: 'San Marzano tomato, fresh mozzarella, basil', price: 950, category: 'Pizzas' },
      { name: 'BBQ Chicken Pizza', description: 'Smoky BBQ base, grilled chicken, red onion', price: 1150, category: 'Pizzas' },
      { name: 'Pasta Arrabbiata', description: 'Penne in spicy tomato sauce with garlic', price: 750, category: 'Pasta' },
      { name: 'Caesar Salad', description: 'Romaine, parmesan, croutons, house dressing', price: 620, category: 'Starters' },
      { name: 'Tiramisu', description: 'Classic Italian coffee dessert', price: 480, category: 'Desserts' },
      { name: 'Garlic Bread', description: 'Toasted ciabatta with herb butter (4 pcs)', price: 320, category: 'Starters' },
    ],
  },
  {
    name: 'Dragon Wok',
    description: 'Pan-Asian street food — Chinese, Thai and Vietnamese',
    cuisineTypes: ['Chinese', 'Thai', 'Asian'],
    address: { street: 'Centaurus Mall, F-8', city: 'Islamabad', country: 'PK' },
    location: { type: 'Point', coordinates: [73.0438, 33.7100] }, // F-8
    minimumOrder: 600,
    deliveryFee: 90,
    rating: 4.1,
    reviewCount: 76,
    menuItems: [
      { name: 'Kung Pao Chicken', description: 'Wok-tossed chicken with peanuts and dried chilies', price: 820, category: 'Main Course' },
      { name: 'Dim Sum Basket', description: 'Steamed prawn har gow and pork siu mai (6 pcs)', price: 680, category: 'Starters' },
      { name: 'Pad Thai Noodles', description: 'Rice noodles, bean sprouts, peanuts, lime', price: 750, category: 'Noodles' },
      { name: 'Veg Fried Rice', description: 'Wok-fried jasmine rice with seasonal vegetables', price: 580, category: 'Rice' },
      { name: 'Tom Yum Soup', description: 'Thai hot and sour prawn soup', price: 480, category: 'Soups' },
      { name: 'Spring Rolls', description: 'Crispy vegetable rolls with sweet chili dip (4 pcs)', price: 420, category: 'Starters' },
    ],
  },
];

// ── Main ─────────────────────────────────────────────────────────────────────

async function seed() {
  console.log('🌱 Starting seed...\n');

  // ── PostgreSQL ──────────────────────────────────────────────────────────────
  console.log('Connecting to PostgreSQL...');
  await dataSource.initialize();
  const queryRunner = dataSource.createQueryRunner();

  const passwordHash = await bcrypt.hash(SEED_PASSWORD, 12);

  // Upsert owner
  await queryRunner.query(`
    INSERT INTO users (id, email, "passwordHash", role, "isActive", "isEmailVerified")
    VALUES (gen_random_uuid(), $1, $2, 'restaurant_owner', true, true)
    ON CONFLICT (email) DO NOTHING
  `, [OWNER_EMAIL, passwordHash]);

  // Upsert customer
  await queryRunner.query(`
    INSERT INTO users (id, email, "passwordHash", role, "isActive", "isEmailVerified")
    VALUES (gen_random_uuid(), $1, $2, 'customer', true, true)
    ON CONFLICT (email) DO NOTHING
  `, [CUSTOMER_EMAIL, passwordHash]);

  // Upsert admin
  await queryRunner.query(`
    INSERT INTO users (id, email, "passwordHash", role, "isActive", "isEmailVerified")
    VALUES (gen_random_uuid(), $1, $2, 'admin', true, true)
    ON CONFLICT (email) DO NOTHING
  `, [ADMIN_EMAIL, passwordHash]);

  // Upsert drivers
  await queryRunner.query(`
    INSERT INTO users (id, email, "passwordHash", role, "isActive", "isEmailVerified")
    VALUES (gen_random_uuid(), $1, $2, 'driver', true, true)
    ON CONFLICT (email) DO NOTHING
  `, [DRIVER1_EMAIL, passwordHash]);

  await queryRunner.query(`
    INSERT INTO users (id, email, "passwordHash", role, "isActive", "isEmailVerified")
    VALUES (gen_random_uuid(), $1, $2, 'driver', true, true)
    ON CONFLICT (email) DO NOTHING
  `, [DRIVER2_EMAIL, passwordHash]);

  const ownerRow = await queryRunner.query(`SELECT id FROM users WHERE email = $1`, [OWNER_EMAIL]);
  const ownerId: string = ownerRow[0].id;

  console.log(`✅ PostgreSQL — owner: ${OWNER_EMAIL}, customer: ${CUSTOMER_EMAIL}, admin: ${ADMIN_EMAIL}, drivers: ${DRIVER1_EMAIL}, ${DRIVER2_EMAIL}`);
  console.log(`   owner id: ${ownerId}\n`);

  await queryRunner.release();
  await dataSource.destroy();

  // ── MongoDB restaurants ──────────────────────────────────────────────────────
  console.log('Connecting to MongoDB (restaurants)...');
  const restaurantConn = await mongoose.createConnection(MONGO_RESTAURANTS_URL).asPromise();
  const RestaurantModel = restaurantConn.model('Restaurant', restaurantSchema, 'restaurants');

  console.log('Connecting to MongoDB (menus)...');
  const menuConn = await mongoose.createConnection(MONGO_MENUS_URL).asPromise();
  const MenuItemModel = menuConn.model('MenuItem', menuItemSchema, 'menuitems');

  for (const r of restaurants) {
    const { menuItems, ...restaurantData } = r;

    const restaurant = await RestaurantModel.findOneAndUpdate(
      { name: r.name, ownerId },
      { ...restaurantData, ownerId, openingHours: WEEKDAYS },
      { upsert: true, new: true },
    );

    console.log(`✅ Restaurant: ${restaurant.name} (${restaurant._id})`);

    await MenuItemModel.deleteMany({ restaurantId: restaurant._id.toString() });
    const items = menuItems.map((item) => ({ ...item, restaurantId: restaurant._id.toString() }));
    await MenuItemModel.insertMany(items);
    console.log(`   ${items.length} menu items seeded`);
  }

  await restaurantConn.close();
  await menuConn.close();

  console.log('\n✅ Seed complete!');
  console.log(`\nLogin credentials:`);
  console.log(`  Owner:    ${OWNER_EMAIL} / ${SEED_PASSWORD}`);
  console.log(`  Customer: ${CUSTOMER_EMAIL} / ${SEED_PASSWORD}`);
  console.log(`  Admin:    ${ADMIN_EMAIL} / ${SEED_PASSWORD}`);
  console.log(`  Driver 1: ${DRIVER1_EMAIL} / ${SEED_PASSWORD}`);
  console.log(`  Driver 2: ${DRIVER2_EMAIL} / ${SEED_PASSWORD}`);
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
