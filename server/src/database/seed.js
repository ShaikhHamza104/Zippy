// server/src/database/seed.js
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { logger } from '../config/logger.js';
import { Banner, Category, Product, Review } from '../models/index.js';
import { connectMongoDB, disconnectMongoDB } from './mongo.js';
import { prisma } from './prisma.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const categoriesData = [
  {
    name: 'Dairy, Bread & Eggs',
    slug: 'dairy-bread-eggs',
    icon: '🥛',
    description: 'Fresh milk, paneer, butter, curd, bread, and farm eggs delivered in minutes.',
    image:
      'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=600&q=80',
    displayOrder: 1,
  },
  {
    name: 'Fresh Fruits & Vegetables',
    slug: 'fruits-vegetables',
    icon: '🥑',
    description: 'Farm-fresh green vegetables, seasonal fruits, and exotic organics.',
    image:
      'https://images.unsplash.com/photo-1610832958506-aa56368176cf?auto=format&fit=crop&w=600&q=80',
    displayOrder: 2,
  },
  {
    name: 'Snacks & Munchies',
    slug: 'snacks-munchies',
    icon: '🍿',
    description: 'Crisps, chips, namkeen, roasted nuts, and delicious party snacks.',
    image:
      'https://images.unsplash.com/photo-1566478989037-eec170784d0b?auto=format&fit=crop&w=600&q=80',
    displayOrder: 3,
  },
  {
    name: 'Beverages & Juices',
    slug: 'beverages-juices',
    icon: '🧃',
    description: 'Cold drinks, juices, energy beverages, craft sodas, and mineral water.',
    image:
      'https://images.unsplash.com/photo-1527661591475-527312dd65f5?auto=format&fit=crop&w=600&q=80',
    displayOrder: 4,
  },
  {
    name: 'Atta, Rice & Dals',
    slug: 'atta-rice-dals',
    icon: '🌾',
    description: 'Premium flours, basmati rice, lentils, pulses, and kitchen staples.',
    image:
      'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=600&q=80',
    displayOrder: 5,
  },
  {
    name: 'Bakery & Biscuits',
    slug: 'bakery-biscuits',
    icon: '🍪',
    description: 'Artisan buns, toast, cookies, cream biscuits, and cakes.',
    image:
      'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=600&q=80',
    displayOrder: 6,
  },
  {
    name: 'Instant & Frozen Food',
    slug: 'instant-frozen-food',
    icon: '🍜',
    description: 'Noodles, pasta, frozen green peas, French fries, and instant meals.',
    image:
      'https://images.unsplash.com/photo-1612927601601-6638404737ce?auto=format&fit=crop&w=600&q=80',
    displayOrder: 7,
  },
  {
    name: 'Personal Care & Cleaning',
    slug: 'personal-care-cleaning',
    icon: '🧼',
    description: 'Detergents, soaps, shampoos, disinfectants, and paper towels.',
    image:
      'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=600&q=80',
    displayOrder: 8,
  },
];

const couponsData = [
  {
    code: 'WELCOME50',
    discountType: 'PERCENTAGE',
    discountValue: 50.0,
    minOrderAmount: 199.0,
    maxDiscountAmount: 100.0,
    usageLimit: 10000,
    validFrom: new Date('2026-01-01'),
    validUntil: new Date('2027-12-31'),
    isActive: true,
  },
  {
    code: 'ZIPPY100',
    discountType: 'FLAT',
    discountValue: 100.0,
    minOrderAmount: 499.0,
    maxDiscountAmount: 100.0,
    usageLimit: 5000,
    validFrom: new Date('2026-01-01'),
    validUntil: new Date('2027-12-31'),
    isActive: true,
  },
  {
    code: 'FREESHIP',
    discountType: 'FLAT',
    discountValue: 25.0,
    minOrderAmount: 149.0,
    maxDiscountAmount: 25.0,
    usageLimit: 20000,
    validFrom: new Date('2026-01-01'),
    validUntil: new Date('2027-12-31'),
    isActive: true,
  },
];

const bannersData = [
  {
    title: 'Super Fresh Morning Milk & Dairy',
    imageUrl:
      'https://images.unsplash.com/photo-1528750997573-59b89d56f4f7?auto=format&fit=crop&w=1200&q=80',
    linkUrl: '/categories',
    badgeText: 'MORNING ESSENTIALS',
    displayOrder: 1,
    isActive: true,
  },
  {
    title: 'Crunchy Munchies & Beverage Mania',
    imageUrl:
      'https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&w=1200&q=80',
    linkUrl: '/categories',
    badgeText: 'UP TO 40% OFF',
    displayOrder: 2,
    isActive: true,
  },
  {
    title: 'Farm Fresh Organic Fruits & Veggies',
    imageUrl:
      'https://images.unsplash.com/photo-1610348725531-843dff563e2c?auto=format&fit=crop&w=1200&q=80',
    linkUrl: '/categories',
    badgeText: 'DIRECT FROM FARMS',
    displayOrder: 3,
    isActive: true,
  },
];

const productsTemplate = [
  // 1. Dairy, Bread & Eggs (8 products)
  {
    category: 'dairy-bread-eggs',
    name: 'Amul Taaza Homogenised Toned Milk',
    slug: 'amul-taaza-toned-milk-1l',
    brand: 'Amul',
    description:
      'Fresh and pure toned milk with 3.0% fat and 8.5% SNF, fortified with Vitamin A and D.',
    variants: [
      { unit: '1L', price: 54, mrp: 56, stock: 120, sku: 'AMUL-TZ-1L' },
      { unit: '500ml', price: 27, mrp: 28, stock: 150, sku: 'AMUL-TZ-500ML' },
    ],
    image:
      'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=500&q=80',
    tags: ['milk', 'dairy', 'amul', 'breakfast', 'toned milk'],
  },
  {
    category: 'dairy-bread-eggs',
    name: 'Mother Dairy Fresh Paneer',
    slug: 'mother-dairy-fresh-paneer-200g',
    brand: 'Mother Dairy',
    description: 'Soft, creamy and rich in protein cottage cheese made from pasteurized milk.',
    variants: [{ unit: '200g', price: 92, mrp: 95, stock: 80, sku: 'MD-PAN-200G' }],
    image:
      'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=500&q=80',
    tags: ['paneer', 'dairy', 'cottage cheese', 'protein'],
  },
  {
    category: 'dairy-bread-eggs',
    name: 'Amul Salted Butter',
    slug: 'amul-salted-butter-500g',
    brand: 'Amul',
    description: 'The classic Utterly Butterly Delicious pasteurized salted table butter.',
    variants: [
      { unit: '500g', price: 275, mrp: 285, stock: 95, sku: 'AMUL-BUT-500G' },
      { unit: '100g', price: 58, mrp: 60, stock: 140, sku: 'AMUL-BUT-100G' },
    ],
    image:
      'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?auto=format&fit=crop&w=500&q=80',
    tags: ['butter', 'amul', 'dairy', 'breakfast'],
  },
  {
    category: 'dairy-bread-eggs',
    name: 'Harvest Gold 100% Atta Bread',
    slug: 'harvest-gold-atta-bread-400g',
    brand: 'Harvest Gold',
    description: 'Healthy whole wheat whole grain brown bread, packed with fibre and nutrients.',
    variants: [{ unit: '400g', price: 50, mrp: 55, stock: 65, sku: 'HG-ATTA-400G' }],
    image:
      'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=500&q=80',
    tags: ['bread', 'atta bread', 'brown bread', 'breakfast'],
  },
  {
    category: 'dairy-bread-eggs',
    name: 'Eggoz Farm Fresh White Eggs',
    slug: 'eggoz-farm-fresh-white-eggs-pack-of-6',
    brand: 'Eggoz',
    description: 'UV sanitized, odorless, protein-rich farm fresh brown/white eggs.',
    variants: [
      { unit: 'Pack of 6', price: 59, mrp: 65, stock: 110, sku: 'EGG-PK-6' },
      { unit: 'Pack of 12', price: 115, mrp: 125, stock: 85, sku: 'EGG-PK-12' },
    ],
    image:
      'https://images.unsplash.com/photo-1516467508483-a7212febe31a?auto=format&fit=crop&w=500&q=80',
    tags: ['eggs', 'protein', 'breakfast', 'farm fresh'],
  },
  {
    category: 'dairy-bread-eggs',
    name: 'Epigamia Greek Yogurt Natural',
    slug: 'epigamia-greek-yogurt-natural-85g',
    brand: 'Epigamia',
    description: 'Low fat, high protein strained Greek yogurt with zero preservatives.',
    variants: [{ unit: '85g', price: 40, mrp: 45, stock: 70, sku: 'EP-GY-NAT-85G' }],
    image:
      'https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=500&q=80',
    tags: ['yogurt', 'greek yogurt', 'dairy', 'snack'],
  },
  {
    category: 'dairy-bread-eggs',
    name: 'Amul Masti Dahi Curd',
    slug: 'amul-masti-dahi-curd-400g',
    brand: 'Amul',
    description: 'Thick, creamy and delicious curd made from pasteurized toned milk.',
    variants: [{ unit: '400g', price: 35, mrp: 35, stock: 130, sku: 'AMUL-DAHI-400G' }],
    image:
      'https://images.unsplash.com/photo-1571212515416-fef01fc43637?auto=format&fit=crop&w=500&q=80',
    tags: ['curd', 'dahi', 'amul', 'dairy'],
  },
  {
    category: 'dairy-bread-eggs',
    name: 'Britannia Processed Cheese Slices',
    slug: 'britannia-cheese-slices-pack-of-10',
    brand: 'Britannia',
    description: 'Deliciously creamy cheese slices ideal for sandwiches and burgers.',
    variants: [{ unit: '200g (10 Slices)', price: 145, mrp: 160, stock: 90, sku: 'BRIT-CH-10S' }],
    image:
      'https://images.unsplash.com/photo-1624806992066-5ffcf7ca186b?auto=format&fit=crop&w=500&q=80',
    tags: ['cheese', 'cheese slices', 'dairy', 'britannia'],
  },

  // 2. Fresh Fruits & Vegetables (8 products)
  {
    category: 'fruits-vegetables',
    name: 'Fresh Hybrid Tomato',
    slug: 'fresh-hybrid-tomato-1kg',
    brand: 'Farm Fresh',
    description: 'Juicy, plump red tomatoes perfect for curries, salads, and soups.',
    variants: [
      { unit: '1kg', price: 34, mrp: 45, stock: 200, sku: 'VEG-TOM-1KG' },
      { unit: '500g', price: 18, mrp: 24, stock: 250, sku: 'VEG-TOM-500G' },
    ],
    image:
      'https://images.unsplash.com/photo-1546470427-227c7369a94d?auto=format&fit=crop&w=500&q=80',
    tags: ['tomato', 'vegetables', 'fresh', 'cooking'],
  },
  {
    category: 'fruits-vegetables',
    name: 'Fresh Red Onion (Pyaz)',
    slug: 'fresh-red-onion-1kg',
    brand: 'Farm Fresh',
    description: 'Crisp and pungent premium quality red onions with long shelf life.',
    variants: [
      { unit: '1kg', price: 42, mrp: 50, stock: 300, sku: 'VEG-ONI-1KG' },
      { unit: '2kg', price: 80, mrp: 98, stock: 180, sku: 'VEG-ONI-2KG' },
    ],
    image:
      'https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?auto=format&fit=crop&w=500&q=80',
    tags: ['onion', 'pyaz', 'vegetables', 'staple'],
  },
  {
    category: 'fruits-vegetables',
    name: 'Fresh Potato (Aloo)',
    slug: 'fresh-potato-1kg',
    brand: 'Farm Fresh',
    description: 'Versatile farm-harvested potatoes suitable for boiling, baking and frying.',
    variants: [
      { unit: '1kg', price: 28, mrp: 35, stock: 350, sku: 'VEG-POT-1KG' },
      { unit: '2kg', price: 52, mrp: 68, stock: 200, sku: 'VEG-POT-2KG' },
    ],
    image:
      'https://images.unsplash.com/photo-1518977676601-b53f82aba655?auto=format&fit=crop&w=500&q=80',
    tags: ['potato', 'aloo', 'vegetables', 'staple'],
  },
  {
    category: 'fruits-vegetables',
    name: 'Fresh Shimla Green Capsicum',
    slug: 'fresh-green-capsicum-500g',
    brand: 'Farm Fresh',
    description: 'Crisp bell peppers rich in vitamins A & C, ideal for stir fries.',
    variants: [{ unit: '500g', price: 48, mrp: 60, stock: 120, sku: 'VEG-CAP-500G' }],
    image:
      'https://images.unsplash.com/photo-1563565375-f3fdfdbefa83?auto=format&fit=crop&w=500&q=80',
    tags: ['capsicum', 'bell pepper', 'vegetables', 'green'],
  },
  {
    category: 'fruits-vegetables',
    name: 'Fresh Robusta Bananas',
    slug: 'fresh-robusta-bananas-pack-of-6',
    brand: 'Farm Fresh',
    description: 'Naturally ripened, sweet bananas loaded with potassium and quick energy.',
    variants: [
      { unit: 'Pack of 6', price: 45, mrp: 55, stock: 220, sku: 'FRT-BAN-6P' },
      { unit: 'Pack of 12', price: 85, mrp: 105, stock: 130, sku: 'FRT-BAN-12P' },
    ],
    image:
      'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?auto=format&fit=crop&w=500&q=80',
    tags: ['banana', 'fruits', 'potassium', 'energy'],
  },
  {
    category: 'fruits-vegetables',
    name: 'Fresh Royal Gala Apple',
    slug: 'fresh-royal-gala-apple-4-pcs',
    brand: 'Farm Fresh',
    description: 'Crisp, sweet and aromatic apples imported fresh from orchards.',
    variants: [
      { unit: '4 pcs (approx 600g)', price: 165, mrp: 190, stock: 140, sku: 'FRT-APP-4P' },
    ],
    image:
      'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?auto=format&fit=crop&w=500&q=80',
    tags: ['apple', 'fruits', 'healthy', 'fresh'],
  },
  {
    category: 'fruits-vegetables',
    name: 'Fresh Alphonso Mangoes (Ratnagiri)',
    slug: 'fresh-alphonso-mangoes-1-dozen',
    brand: 'Farm Fresh',
    description: 'The king of mangoes, sweet, succulent and full of tropical aroma.',
    variants: [{ unit: '1 Dozen', price: 850, mrp: 999, stock: 45, sku: 'FRT-MNG-12P' }],
    image:
      'https://images.unsplash.com/photo-1553279768-865429fa0078?auto=format&fit=crop&w=500&q=80',
    tags: ['mango', 'alphonso', 'fruits', 'seasonal'],
  },
  {
    category: 'fruits-vegetables',
    name: 'Fresh Coriander (Dhaniya)',
    slug: 'fresh-coriander-dhaniya-100g',
    brand: 'Farm Fresh',
    description: 'Fragrant fresh green coriander leaves for garnishing and chutney.',
    variants: [{ unit: '100g', price: 12, mrp: 18, stock: 210, sku: 'VEG-COR-100G' }],
    image:
      'https://images.unsplash.com/photo-1589135233689-d562f447087f?auto=format&fit=crop&w=500&q=80',
    tags: ['coriander', 'dhaniya', 'herbs', 'vegetables'],
  },

  // 3. Snacks & Munchies (8 products)
  {
    category: 'snacks-munchies',
    name: "Lay's India's Magic Masala Potato Chips",
    slug: 'lays-magic-masala-chips-90g',
    brand: "Lay's",
    description: 'Crispy ridged potato chips infused with mouthwatering Indian spices.',
    variants: [
      { unit: '90g', price: 40, mrp: 40, stock: 240, sku: 'LAYS-MM-90G' },
      { unit: '50g', price: 20, mrp: 20, stock: 320, sku: 'LAYS-MM-50G' },
    ],
    image:
      'https://images.unsplash.com/photo-1566478989037-eec170784d0b?auto=format&fit=crop&w=500&q=80',
    tags: ['lays', 'chips', 'snacks', 'potato chips', 'masala'],
  },
  {
    category: 'snacks-munchies',
    name: 'Kurkure Masala Munch',
    slug: 'kurkure-masala-munch-85g',
    brand: 'Kurkure',
    description: 'Tedha hai par mera hai! Crispy puffed rice and corn snacks.',
    variants: [{ unit: '85g', price: 20, mrp: 20, stock: 290, sku: 'KURK-MM-85G' }],
    image:
      'https://images.unsplash.com/photo-1621447504864-d8686e12698c?auto=format&fit=crop&w=500&q=80',
    tags: ['kurkure', 'snacks', 'namkeen', 'munchies'],
  },
  {
    category: 'snacks-munchies',
    name: 'Haldiram Aloo Bhujia',
    slug: 'haldiram-aloo-bhujia-400g',
    brand: "Haldiram's",
    description: 'Spicy potato mint noodles snack, an all-time Indian favourite.',
    variants: [
      { unit: '400g', price: 110, mrp: 120, stock: 160, sku: 'HALD-AB-400G' },
      { unit: '200g', price: 58, mrp: 60, stock: 210, sku: 'HALD-AB-200G' },
    ],
    image:
      'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=500&q=80',
    tags: ['haldiram', 'bhujia', 'namkeen', 'snacks'],
  },
  {
    category: 'snacks-munchies',
    name: 'Doritos Cheese Supreme Nachos',
    slug: 'doritos-cheese-supreme-nachos-140g',
    brand: 'Doritos',
    description: 'Bold crunch triangular corn tortilla chips smothered in nacho cheese.',
    variants: [{ unit: '140g', price: 60, mrp: 60, stock: 140, sku: 'DOR-CH-140G' }],
    image:
      'https://images.unsplash.com/photo-1513456852971-30c0b8199d4d?auto=format&fit=crop&w=500&q=80',
    tags: ['doritos', 'nachos', 'cheese', 'chips', 'snacks'],
  },
  {
    category: 'snacks-munchies',
    name: 'Act II Golden Sizzle Butter Popcorn',
    slug: 'act-ii-butter-popcorn-instant-150g',
    brand: 'Act II',
    description: 'Hot, fresh, aromatic stovetop popcorn ready in under 3 minutes.',
    variants: [{ unit: '150g', price: 50, mrp: 55, stock: 130, sku: 'ACT-POP-150G' }],
    image:
      'https://images.unsplash.com/photo-1578849278619-e73505e9610f?auto=format&fit=crop&w=500&q=80',
    tags: ['popcorn', 'act ii', 'snacks', 'movie snack'],
  },
  {
    category: 'snacks-munchies',
    name: 'Happilo Premium California Almonds',
    slug: 'happilo-premium-california-almonds-200g',
    brand: 'Happilo',
    description: 'Crunchy, nutrient-rich raw whole California badam.',
    variants: [
      { unit: '200g', price: 219, mrp: 295, stock: 100, sku: 'HAP-ALM-200G' },
      { unit: '500g', price: 499, mrp: 699, stock: 65, sku: 'HAP-ALM-500G' },
    ],
    image:
      'https://images.unsplash.com/photo-1508061252966-f720fb609789?auto=format&fit=crop&w=500&q=80',
    tags: ['almonds', 'dry fruits', 'happilo', 'healthy', 'nuts'],
  },
  {
    category: 'snacks-munchies',
    name: 'Pringles Sour Cream & Onion',
    slug: 'pringles-sour-cream-onion-107g',
    brand: 'Pringles',
    description: 'Iconic stackable potato crisps seasoned with savory sour cream and herb onion.',
    variants: [{ unit: '107g', price: 119, mrp: 125, stock: 95, sku: 'PRIN-SCO-107G' }],
    image:
      'https://images.unsplash.com/photo-1527842891421-42eec6e703ea?auto=format&fit=crop&w=500&q=80',
    tags: ['pringles', 'chips', 'snacks', 'imported'],
  },
  {
    category: 'snacks-munchies',
    name: 'Haldiram Moong Dal Roasted',
    slug: 'haldiram-moong-dal-200g',
    brand: "Haldiram's",
    description: 'Light, crunchy and salty yellow lentils snack.',
    variants: [{ unit: '200g', price: 55, mrp: 60, stock: 150, sku: 'HALD-MD-200G' }],
    image:
      'https://images.unsplash.com/photo-1613728913341-8f29b0151cd5?auto=format&fit=crop&w=500&q=80',
    tags: ['moong dal', 'haldiram', 'namkeen', 'snacks'],
  },

  // 4. Beverages & Juices (8 products)
  {
    category: 'beverages-juices',
    name: 'Coca-Cola Original Taste',
    slug: 'coca-cola-original-taste-750ml',
    brand: 'Coca-Cola',
    description: 'The world favourite sparkling refreshing soft drink served chilled.',
    variants: [
      { unit: '750ml', price: 40, mrp: 40, stock: 280, sku: 'COKE-750ML' },
      { unit: '300ml Can', price: 40, mrp: 40, stock: 190, sku: 'COKE-300ML-CAN' },
    ],
    image:
      'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=500&q=80',
    tags: ['coca-cola', 'coke', 'cold drink', 'beverages', 'soda'],
  },
  {
    category: 'beverages-juices',
    name: 'Real Fruit Power Mixed Fruit Juice',
    slug: 'real-mixed-fruit-juice-1l',
    brand: 'Real',
    description: 'Nutritious blend of 9 fruits with no added preservatives or colors.',
    variants: [{ unit: '1L', price: 120, mrp: 135, stock: 140, sku: 'REAL-MF-1L' }],
    image:
      'https://images.unsplash.com/photo-1613478223719-2ab802602423?auto=format&fit=crop&w=500&q=80',
    tags: ['juice', 'real', 'beverages', 'mixed fruit'],
  },
  {
    category: 'beverages-juices',
    name: 'Red Bull Energy Drink',
    slug: 'red-bull-energy-drink-250ml',
    brand: 'Red Bull',
    description:
      'Vitalizes body and mind with high quality caffeine, taurine and B-group vitamins.',
    variants: [
      { unit: '250ml Can', price: 125, mrp: 125, stock: 180, sku: 'RB-250ML' },
      { unit: 'Pack of 4 (250ml)', price: 480, mrp: 500, stock: 75, sku: 'RB-4PK' },
    ],
    image:
      'https://images.unsplash.com/photo-1543257580-7269da773bf5?auto=format&fit=crop&w=500&q=80',
    tags: ['red bull', 'energy drink', 'beverages', 'caffeine'],
  },
  {
    category: 'beverages-juices',
    name: 'Bisleri Packaged Drinking Water',
    slug: 'bisleri-packaged-drinking-water-5l',
    brand: 'Bisleri',
    description:
      'Enriched with essential minerals and passed through 10-step purification process.',
    variants: [
      { unit: '5L Jar', price: 70, mrp: 75, stock: 110, sku: 'BIS-5L' },
      { unit: '1L Bottle', price: 20, mrp: 20, stock: 350, sku: 'BIS-1L' },
    ],
    image:
      'https://images.unsplash.com/photo-1548839140-29a749e1bc4e?auto=format&fit=crop&w=500&q=80',
    tags: ['water', 'bisleri', 'beverages', 'mineral water'],
  },
  {
    category: 'beverages-juices',
    name: 'Thums Up Charged Soft Drink',
    slug: 'thums-up-charged-750ml',
    brand: 'Thums Up',
    description: 'Taste the thunder with strong fizz and extra spicy carbonated cola punch.',
    variants: [{ unit: '750ml', price: 40, mrp: 40, stock: 260, sku: 'TU-750ML' }],
    image:
      'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?auto=format&fit=crop&w=500&q=80',
    tags: ['thums up', 'cola', 'cold drink', 'beverages'],
  },
  {
    category: 'beverages-juices',
    name: 'Tropicana 100% Orange Juice',
    slug: 'tropicana-orange-juice-1l',
    brand: 'Tropicana',
    description: 'Pure squeezed sweet oranges packed with natural vitamin C.',
    variants: [{ unit: '1L', price: 130, mrp: 145, stock: 90, sku: 'TROP-OR-1L' }],
    image:
      'https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?auto=format&fit=crop&w=500&q=80',
    tags: ['orange juice', 'tropicana', 'beverages', 'juice'],
  },
  {
    category: 'beverages-juices',
    name: 'Paper Boat Aamras Mango Drink',
    slug: 'paper-boat-aamras-250ml',
    brand: 'Paper Boat',
    description: 'Nostalgic real mango pulp beverage with authentic Indian mango flavor.',
    variants: [{ unit: '250ml', price: 35, mrp: 35, stock: 170, sku: 'PB-AAM-250ML' }],
    image:
      'https://images.unsplash.com/photo-1546173159-315724a31696?auto=format&fit=crop&w=500&q=80',
    tags: ['paper boat', 'aamras', 'mango', 'beverages'],
  },
  {
    category: 'beverages-juices',
    name: 'Minute Maid Pulpy Orange',
    slug: 'minute-maid-pulpy-orange-1l',
    brand: 'Minute Maid',
    description: 'Refreshing fruit juice loaded with real chewable orange pulps.',
    variants: [{ unit: '1L', price: 90, mrp: 95, stock: 120, sku: 'MM-PULP-1L' }],
    image:
      'https://images.unsplash.com/photo-1600271886742-f049cd451bba?auto=format&fit=crop&w=500&q=80',
    tags: ['minute maid', 'pulpy orange', 'juice', 'beverages'],
  },

  // 5. Atta, Rice & Dals (8 products)
  {
    category: 'atta-rice-dals',
    name: 'Aashirvaad Shudh Chakki Whole Wheat Atta',
    slug: 'aashirvaad-whole-wheat-atta-5kg',
    brand: 'Aashirvaad',
    description: '100% whole wheat grains ground with traditional stone chakki technology.',
    variants: [
      { unit: '5kg', price: 235, mrp: 260, stock: 150, sku: 'AASH-ATTA-5KG' },
      { unit: '10kg', price: 449, mrp: 495, stock: 90, sku: 'AASH-ATTA-10KG' },
    ],
    image:
      'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=500&q=80',
    tags: ['atta', 'aashirvaad', 'wheat flour', 'staples', 'roti'],
  },
  {
    category: 'atta-rice-dals',
    name: 'Fortune Sunlite Refined Sunflower Oil',
    slug: 'fortune-refined-sunflower-oil-1l',
    brand: 'Fortune',
    description: 'Light and heart-healthy refined cooking oil enriched with vitamins A, D, and E.',
    variants: [
      { unit: '1L Pouch', price: 135, mrp: 155, stock: 180, sku: 'FORT-OIL-1L' },
      { unit: '5L Can', price: 650, mrp: 740, stock: 60, sku: 'FORT-OIL-5L' },
    ],
    image:
      'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=500&q=80',
    tags: ['oil', 'cooking oil', 'sunflower oil', 'fortune', 'staples'],
  },
  {
    category: 'atta-rice-dals',
    name: 'Daawat Rozana Super Basmati Rice',
    slug: 'daawat-rozana-super-basmati-rice-5kg',
    brand: 'Daawat',
    description: 'Fluffy, pearly white long grains with delicate aroma for everyday cooking.',
    variants: [
      { unit: '5kg', price: 395, mrp: 450, stock: 85, sku: 'DAAW-RICE-5KG' },
      { unit: '1kg', price: 89, mrp: 105, stock: 160, sku: 'DAAW-RICE-1KG' },
    ],
    image:
      'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=500&q=80',
    tags: ['rice', 'basmati rice', 'daawat', 'staples'],
  },
  {
    category: 'atta-rice-dals',
    name: 'Tata Sampann Unpolished Toor Dal',
    slug: 'tata-sampann-unpolished-toor-dal-1kg',
    brand: 'Tata Sampann',
    description: 'Nutritious yellow arhar dal, unpolished and naturally rich in dietary protein.',
    variants: [{ unit: '1kg', price: 165, mrp: 185, stock: 120, sku: 'TATA-TOOR-1KG' }],
    image:
      'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=500&q=80',
    tags: ['dal', 'toor dal', 'tata sampann', 'protein', 'staples'],
  },
  {
    category: 'atta-rice-dals',
    name: 'Tata Salt Vacuum Evaporated Iodized Salt',
    slug: 'tata-salt-iodized-1kg',
    brand: 'Tata',
    description: 'Desh Ka Namak! India’s leading vacuum-evaporated pure iodized salt.',
    variants: [{ unit: '1kg', price: 28, mrp: 30, stock: 320, sku: 'TATA-SALT-1KG' }],
    image:
      'https://images.unsplash.com/photo-1518110925495-5fe2fda0442c?auto=format&fit=crop&w=500&q=80',
    tags: ['salt', 'tata salt', 'iodized salt', 'staples'],
  },
  {
    category: 'atta-rice-dals',
    name: 'Madhur Pure & Hygienic Sugar',
    slug: 'madhur-pure-sugar-1kg',
    brand: 'Madhur',
    description: 'Sulphur-free sparkling white refined sugar crystals prepared hygienically.',
    variants: [
      { unit: '1kg', price: 52, mrp: 58, stock: 240, sku: 'MAD-SUG-1KG' },
      { unit: '5kg', price: 245, mrp: 275, stock: 110, sku: 'MAD-SUG-5KG' },
    ],
    image:
      'https://images.unsplash.com/photo-1581441363689-1f3c3c414635?auto=format&fit=crop&w=500&q=80',
    tags: ['sugar', 'madhur', 'sweetener', 'staples'],
  },
  {
    category: 'atta-rice-dals',
    name: 'Tata Sampann Chana Dal',
    slug: 'tata-sampann-chana-dal-1kg',
    brand: 'Tata Sampann',
    description: 'Wholesome unpolished split chickpeas, rich in protein and fiber.',
    variants: [{ unit: '1kg', price: 110, mrp: 125, stock: 130, sku: 'TATA-CHANA-1KG' }],
    image:
      'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=500&q=80',
    tags: ['chana dal', 'dal', 'tata sampann', 'staples'],
  },
  {
    category: 'atta-rice-dals',
    name: 'Fortune Premium Kachi Ghani Mustard Oil',
    slug: 'fortune-kachi-ghani-mustard-oil-1l',
    brand: 'Fortune',
    description: 'Cold-pressed traditional pungent sarson tel with authentic aroma.',
    variants: [{ unit: '1L', price: 145, mrp: 165, stock: 140, sku: 'FORT-MUST-1L' }],
    image:
      'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=500&q=80',
    tags: ['mustard oil', 'sarson oil', 'fortune', 'cooking oil'],
  },

  // 6. Bakery & Biscuits (8 products)
  {
    category: 'bakery-biscuits',
    name: 'Oreo Original Vanilla Creme Sandwich Biscuits',
    slug: 'oreo-vanilla-creme-biscuits-120g',
    brand: 'Cadbury',
    description: 'Twist, lick and dunk! Crispy chocolate biscuits with sweet vanilla cream.',
    variants: [
      { unit: '120g', price: 35, mrp: 40, stock: 190, sku: 'OREO-VAN-120G' },
      { unit: '300g Family Pack', price: 85, mrp: 95, stock: 110, sku: 'OREO-FP-300G' },
    ],
    image:
      'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?auto=format&fit=crop&w=500&q=80',
    tags: ['oreo', 'biscuits', 'cookies', 'bakery', 'cadbury'],
  },
  {
    category: 'bakery-biscuits',
    name: 'Parle-G Original Gluco Biscuits',
    slug: 'parle-g-gluco-biscuits-800g',
    brand: 'Parle',
    description: 'India’s most loved chai companion, packed with goodness of wheat and milk.',
    variants: [
      { unit: '800g Value Pack', price: 80, mrp: 85, stock: 260, sku: 'PARLE-G-800G' },
      { unit: '250g', price: 25, mrp: 25, stock: 350, sku: 'PARLE-G-250G' },
    ],
    image:
      'https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?auto=format&fit=crop&w=500&q=80',
    tags: ['parle-g', 'biscuits', 'chai biscuit', 'bakery'],
  },
  {
    category: 'bakery-biscuits',
    name: 'Britannia Good Day Cashew Cookies',
    slug: 'britannia-good-day-cashew-cookies-200g',
    brand: 'Britannia',
    description: 'Smile more with rich buttery cookies studded with crunchy cashews.',
    variants: [{ unit: '200g', price: 45, mrp: 50, stock: 210, sku: 'BRIT-GD-200G' }],
    image:
      'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?auto=format&fit=crop&w=500&q=80',
    tags: ['good day', 'britannia', 'cookies', 'cashew', 'bakery'],
  },
  {
    category: 'bakery-biscuits',
    name: 'Sunfeast Dark Fantasy Choco Fills',
    slug: 'sunfeast-dark-fantasy-choco-fills-300g',
    brand: 'Sunfeast',
    description: 'Crisp cookie crust with warm molten chocolate indulgence inside.',
    variants: [{ unit: '300g', price: 120, mrp: 150, stock: 120, sku: 'SF-DF-300G' }],
    image:
      'https://images.unsplash.com/photo-1548848221-0c2e497ed557?auto=format&fit=crop&w=500&q=80',
    tags: ['dark fantasy', 'chocolate', 'cookies', 'biscuits'],
  },
  {
    category: 'bakery-biscuits',
    name: 'Britannia Milk Bikis Biscuits',
    slug: 'britannia-milk-bikis-biscuits-300g',
    brand: 'Britannia',
    description: 'Nutritious milk biscuits enriched with calcium and vitamin D for kids.',
    variants: [{ unit: '300g', price: 40, mrp: 45, stock: 180, sku: 'BRIT-MB-300G' }],
    image:
      'https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?auto=format&fit=crop&w=500&q=80',
    tags: ['milk bikis', 'biscuits', 'britannia', 'bakery'],
  },
  {
    category: 'bakery-biscuits',
    name: 'Britannia Toastea Premium Bake Rusk',
    slug: 'britannia-toastea-rusk-400g',
    brand: 'Britannia',
    description: 'Crispy, crunchy double baked wheat rusk infused with aromatic cardamom.',
    variants: [{ unit: '400g', price: 65, mrp: 70, stock: 140, sku: 'BRIT-RUSK-400G' }],
    image:
      'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=500&q=80',
    tags: ['rusk', 'toastea', 'britannia', 'tea snack'],
  },
  {
    category: 'bakery-biscuits',
    name: 'Britannia Fruit Cake',
    slug: 'britannia-fruit-cake-140g',
    brand: 'Britannia',
    description: 'Moist and spongy tea cake loaded with candied fruity bits.',
    variants: [{ unit: '140g', price: 30, mrp: 30, stock: 160, sku: 'BRIT-CAKE-140G' }],
    image:
      'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=500&q=80',
    tags: ['cake', 'fruit cake', 'britannia', 'bakery'],
  },
  {
    category: 'bakery-biscuits',
    name: 'Monaco Salted Crackers',
    slug: 'parle-monaco-salted-crackers-200g',
    brand: 'Parle',
    description: 'Light, crunchy salty crackers perfect for pairing with cheese or toppings.',
    variants: [{ unit: '200g', price: 35, mrp: 40, stock: 220, sku: 'PARLE-MON-200G' }],
    image:
      'https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?auto=format&fit=crop&w=500&q=80',
    tags: ['monaco', 'crackers', 'salted biscuits', 'parle'],
  },

  // 7. Instant & Frozen Food (8 products)
  {
    category: 'instant-frozen-food',
    name: 'Maggi 2-Minute Masala Instant Noodles',
    slug: 'maggi-2-minute-masala-noodles-pack-of-4',
    brand: 'Nestle',
    description: 'India’s favorite instant comfort food with authentic roasted spices.',
    variants: [
      { unit: 'Pack of 4 (280g)', price: 56, mrp: 60, stock: 350, sku: 'MAG-PK-4' },
      { unit: 'Pack of 12 (840g)', price: 160, mrp: 180, stock: 180, sku: 'MAG-PK-12' },
    ],
    image:
      'https://images.unsplash.com/photo-1612927601601-6638404737ce?auto=format&fit=crop&w=500&q=80',
    tags: ['maggi', 'noodles', 'instant food', 'nestle', 'snack'],
  },
  {
    category: 'instant-frozen-food',
    name: 'Safal Frozen Green Peas (Matar)',
    slug: 'safal-frozen-green-peas-1kg',
    brand: 'Safal',
    description: 'Tender, sweet green peas harvested and instantly flash-frozen.',
    variants: [
      { unit: '1kg', price: 140, mrp: 160, stock: 110, sku: 'SAF-PEAS-1KG' },
      { unit: '500g', price: 75, mrp: 85, stock: 170, sku: 'SAF-PEAS-500G' },
    ],
    image:
      'https://images.unsplash.com/photo-1587735243615-c03f25aaff15?auto=format&fit=crop&w=500&q=80',
    tags: ['peas', 'frozen peas', 'safal', 'vegetables', 'frozen food'],
  },
  {
    category: 'instant-frozen-food',
    name: 'McCain French Fries Crispy',
    slug: 'mccain-french-fries-420g',
    brand: 'McCain',
    description: 'Golden crispy potato fingers ready to deep fry or air fry in minutes.',
    variants: [{ unit: '420g', price: 115, mrp: 130, stock: 95, sku: 'MCC-FF-420G' }],
    image:
      'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=500&q=80',
    tags: ['mccain', 'french fries', 'frozen food', 'snacks'],
  },
  {
    category: 'instant-frozen-food',
    name: 'Top Ramen Curry Noodles Instant',
    slug: 'top-ramen-curry-noodles-280g',
    brand: 'Nissin',
    description: 'Flat saucy noodles infused with savory curry flavors.',
    variants: [{ unit: '280g (Pack of 4)', price: 55, mrp: 60, stock: 130, sku: 'NIS-TR-280G' }],
    image:
      'https://images.unsplash.com/photo-1612927601601-6638404737ce?auto=format&fit=crop&w=500&q=80',
    tags: ['top ramen', 'noodles', 'curry noodles', 'instant food'],
  },
  {
    category: 'instant-frozen-food',
    name: 'Knorr Classic Mixed Vegetable Soup',
    slug: 'knorr-mixed-vegetable-soup-43g',
    brand: 'Knorr',
    description: 'Warm and comforting restaurant-quality soup with real vegetable bits.',
    variants: [{ unit: '43g', price: 35, mrp: 40, stock: 160, sku: 'KNR-SOUP-43G' }],
    image:
      'https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=500&q=80',
    tags: ['soup', 'knorr', 'instant soup', 'comfort food'],
  },
  {
    category: 'instant-frozen-food',
    name: 'Yippee Magic Masala Noodles',
    slug: 'sunfeast-yippee-noodles-pack-of-4',
    brand: 'Sunfeast',
    description: 'Long, non-sticky round noodles infused with a blend of 5 lively Indian spices.',
    variants: [{ unit: 'Pack of 4 (260g)', price: 54, mrp: 60, stock: 200, sku: 'YIP-4PK' }],
    image:
      'https://images.unsplash.com/photo-1612927601601-6638404737ce?auto=format&fit=crop&w=500&q=80',
    tags: ['yippee', 'noodles', 'sunfeast', 'instant food'],
  },
  {
    category: 'instant-frozen-food',
    name: 'McCain Smiles Crispy Mashed Potato Shapes',
    slug: 'mccain-smiles-415g',
    brand: 'McCain',
    description: 'Fun smile-shaped potato bites seasoned lightly, a kids favorite snack.',
    variants: [{ unit: '415g', price: 125, mrp: 140, stock: 85, sku: 'MCC-SML-415G' }],
    image:
      'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=500&q=80',
    tags: ['mccain', 'smiles', 'potato bites', 'frozen food'],
  },
  {
    category: 'instant-frozen-food',
    name: 'Ching’s Secret Schezwan Instant Hakka Noodles',
    slug: 'chings-schezwan-noodles-240g',
    brand: "Ching's",
    description: 'Fiery Desi Chinese noodles loaded with garlic, ginger, and red chilies.',
    variants: [{ unit: '240g (Pack of 4)', price: 55, mrp: 60, stock: 140, sku: 'CHG-SCH-240G' }],
    image:
      'https://images.unsplash.com/photo-1612927601601-6638404737ce?auto=format&fit=crop&w=500&q=80',
    tags: ['chings', 'schezwan', 'noodles', 'desi chinese'],
  },

  // 8. Personal Care & Cleaning (8 products)
  {
    category: 'personal-care-cleaning',
    name: 'Dettol Original Liquid Handwash Refill',
    slug: 'dettol-original-handwash-refill-675ml',
    brand: 'Dettol',
    description: 'Trusted 99.9% germ protection with pine fragrance for everyday hand hygiene.',
    variants: [
      { unit: '675ml Pouch', price: 99, mrp: 119, stock: 150, sku: 'DET-HW-675ML' },
      { unit: '1500ml Can', price: 199, mrp: 240, stock: 80, sku: 'DET-HW-1500ML' },
    ],
    image:
      'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=500&q=80',
    tags: ['dettol', 'handwash', 'hygiene', 'personal care', 'cleaning'],
  },
  {
    category: 'personal-care-cleaning',
    name: 'Surf Excel Quick Wash Detergent Powder',
    slug: 'surf-excel-quick-wash-powder-1kg',
    brand: 'Surf Excel',
    description: 'Superior stain removal in washing machines with less lather and faster rinse.',
    variants: [
      { unit: '1kg', price: 145, mrp: 160, stock: 170, sku: 'SURF-QW-1KG' },
      { unit: '2kg', price: 285, mrp: 310, stock: 95, sku: 'SURF-QW-2KG' },
    ],
    image:
      'https://images.unsplash.com/photo-1610557892470-55d9e80c0bce?auto=format&fit=crop&w=500&q=80',
    tags: ['surf excel', 'detergent', 'laundry', 'cleaning'],
  },
  {
    category: 'personal-care-cleaning',
    name: 'Vim Lemon Dishwash Liquid Gel',
    slug: 'vim-dishwash-gel-lemon-750ml',
    brand: 'Vim',
    description:
      'Concentrated gel with the power of 100 lemons, cuts through tough grease instantly.',
    variants: [{ unit: '750ml Bottle', price: 135, mrp: 155, stock: 160, sku: 'VIM-GEL-750ML' }],
    image:
      'https://images.unsplash.com/photo-1585837575652-267c041d77d4?auto=format&fit=crop&w=500&q=80',
    tags: ['vim', 'dishwash', 'kitchen cleaning', 'cleaning'],
  },
  {
    category: 'personal-care-cleaning',
    name: 'Harpic Power Plus Toilet Cleaner Original',
    slug: 'harpic-power-plus-toilet-cleaner-1l',
    brand: 'Harpic',
    description: '10x better stain and limescale removal, kills 99.9% germs leaving bowl spotless.',
    variants: [{ unit: '1L Bottle', price: 175, mrp: 195, stock: 140, sku: 'HARP-1L' }],
    image:
      'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=500&q=80',
    tags: ['harpic', 'toilet cleaner', 'bathroom', 'cleaning'],
  },
  {
    category: 'personal-care-cleaning',
    name: 'Colgate Strong Teeth Dental Toothpaste',
    slug: 'colgate-strong-teeth-toothpaste-500g',
    brand: 'Colgate',
    description: 'Amino Shakti formula adds natural calcium for 2x stronger teeth.',
    variants: [{ unit: '500g Saver Pack', price: 195, mrp: 220, stock: 160, sku: 'COLG-ST-500G' }],
    image:
      'https://images.unsplash.com/photo-1559591937-e1032c525f24?auto=format&fit=crop&w=500&q=80',
    tags: ['colgate', 'toothpaste', 'dental care', 'personal care'],
  },
  {
    category: 'personal-care-cleaning',
    name: 'Head & Shoulders Cool Menthol Anti-Dandruff Shampoo',
    slug: 'head-shoulders-cool-menthol-shampoo-650ml',
    brand: 'Head & Shoulders',
    description:
      'Invigorating menthol freshness that cleans scalp and eliminates up to 100% dandruff.',
    variants: [{ unit: '650ml', price: 449, mrp: 550, stock: 75, sku: 'HS-COOL-650ML' }],
    image:
      'https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?auto=format&fit=crop&w=500&q=80',
    tags: ['shampoo', 'hair care', 'head & shoulders', 'personal care'],
  },
  {
    category: 'personal-care-cleaning',
    name: 'Lizol Floral Floor Cleaner Disinfectant',
    slug: 'lizol-floral-disinfectant-floor-cleaner-2l',
    brand: 'Lizol',
    description:
      'Kills 99.9% germs, removes tough stains and leaves a long lasting floral fragrance.',
    variants: [{ unit: '2L Bottle', price: 340, mrp: 380, stock: 90, sku: 'LIZ-FL-2L' }],
    image:
      'https://images.unsplash.com/photo-1585837575652-267c041d77d4?auto=format&fit=crop&w=500&q=80',
    tags: ['lizol', 'floor cleaner', 'disinfectant', 'cleaning'],
  },
  {
    category: 'personal-care-cleaning',
    name: 'Dove Deeply Nourishing Body Wash',
    slug: 'dove-deeply-nourishing-body-wash-800ml',
    brand: 'Dove',
    description:
      'NutriumMoisture technology delivers natural nutrients to skin for instant softness.',
    variants: [{ unit: '800ml', price: 375, mrp: 450, stock: 85, sku: 'DOVE-BW-800ML' }],
    image:
      'https://images.unsplash.com/photo-1608248597359-28c460113f89?auto=format&fit=crop&w=500&q=80',
    tags: ['dove', 'body wash', 'soap', 'personal care'],
  },
];

async function seed() {
  logger.info('=============================================');
  logger.info('  Starting Zippy Phase 2 Database Seed Script  ');
  logger.info('=============================================');

  // 1. Seed MySQL Super Admin
  const adminEmail = process.env.SUPER_ADMIN_EMAIL || 'admin@zippy.local';
  const adminPassword = process.env.SUPER_ADMIN_PASSWORD;
  const adminName = process.env.SUPER_ADMIN_NAME || 'Hamza Shaikh';

  if (!adminPassword) {
    throw new Error('SUPER_ADMIN_PASSWORD environment variable is missing.');
  }

  logger.info(`Seeding Super Admin user: ${adminEmail}...`);
  const passwordHash = await bcrypt.hash(adminPassword, 12);

  const superAdmin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      name: adminName,
      role: 'SUPER_ADMIN',
      passwordHash,
      emailVerified: true,
      isBlocked: false,
    },
    create: {
      email: adminEmail,
      name: adminName,
      role: 'SUPER_ADMIN',
      passwordHash,
      emailVerified: true,
      isBlocked: false,
    },
  });
  logger.info(`Super Admin verified in MySQL: ID=${superAdmin.id}, Role=${superAdmin.role}`);

  // 2. Seed MySQL Sample Coupons
  logger.info('Seeding sample promotional coupons into MySQL...');
  for (const coupon of couponsData) {
    await prisma.coupon.upsert({
      where: { code: coupon.code },
      update: {
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        minOrderAmount: coupon.minOrderAmount,
        maxDiscountAmount: coupon.maxDiscountAmount,
        usageLimit: coupon.usageLimit,
        validFrom: coupon.validFrom,
        validUntil: coupon.validUntil,
        isActive: coupon.isActive,
      },
      create: coupon,
    });
  }
  const couponCount = await prisma.coupon.count();
  logger.info(`Total active coupons in MySQL: ${couponCount}`);

  // 3. Connect to MongoDB
  logger.info('Connecting to MongoDB for catalog seed...');
  await connectMongoDB();

  // 4. Seed MongoDB Categories
  logger.info('Seeding 8 realistic grocery categories into MongoDB...');
  const categoryMap = new Map();

  for (const cat of categoriesData) {
    const updated = await Category.findOneAndUpdate(
      { slug: cat.slug },
      { $set: cat },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    categoryMap.set(cat.slug, updated._id);
  }
  const totalCategories = await Category.countDocuments();
  logger.info(`Total categories verified in MongoDB: ${totalCategories}`);

  // 5. Seed MongoDB Products (64+ realistic grocery items)
  logger.info('Seeding 64+ realistic grocery products into MongoDB...');
  let productUpsertCount = 0;

  for (const item of productsTemplate) {
    const categoryId = categoryMap.get(item.category);
    if (!categoryId) {
      logger.warn(`Category slug ${item.category} not found for product ${item.name}`);
      continue;
    }

    const totalStock = item.variants.reduce((acc, v) => acc + (v.stock || 0), 0);
    const primaryPrice = item.variants[0].price;
    const primaryMrp = item.variants[0].mrp;

    const productPayload = {
      name: item.name,
      slug: item.slug,
      description: item.description,
      categoryId,
      categorySlug: item.category,
      brand: item.brand,
      images: [{ url: item.image, alt: item.name, isPrimary: true }],
      variants: item.variants,
      primaryPrice,
      primaryMrp,
      totalStock,
      tags: item.tags,
      pincodeServiceable: ['*'],
      isAvailable: totalStock > 0,
      ratingAverage: 4.5 + Math.round(Math.random() * 0.4 * 10) / 10,
      reviewCount: 15 + Math.floor(Math.random() * 85),
    };

    await Product.findOneAndUpdate(
      { slug: item.slug },
      { $set: productPayload },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    productUpsertCount++;
  }
  const totalProducts = await Product.countDocuments();
  logger.info(
    `Total products verified in MongoDB: ${totalProducts} (upserted: ${productUpsertCount})`
  );

  // 6. Seed Promotional Banners in MongoDB
  logger.info('Seeding promotional banners into MongoDB...');
  for (const banner of bannersData) {
    await Banner.findOneAndUpdate(
      { title: banner.title },
      { $set: banner },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }
  const totalBanners = await Banner.countDocuments();
  logger.info(`Total banners verified in MongoDB: ${totalBanners}`);

  // 7. Seed Sample Reviews
  logger.info('Seeding sample reviews into MongoDB...');
  const sampleProduct = await Product.findOne({ slug: 'amul-taaza-toned-milk-1l' });
  if (sampleProduct) {
    await Review.findOneAndUpdate(
      { productId: sampleProduct._id, userId: superAdmin.id },
      {
        $set: {
          productId: sampleProduct._id,
          userId: superAdmin.id,
          userName: superAdmin.name,
          rating: 5,
          comment: 'Fresh, delivered in 8 minutes, chilled and great packaging!',
          isVerifiedPurchase: true,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    logger.info(`Sample review seeded for product: ${sampleProduct.name}`);
  }

  logger.info('=============================================');
  logger.info('  Idempotent Database Seed Complete!          ');
  logger.info('=============================================');
}

seed()
  .catch((err) => {
    logger.fatal({ err }, 'Error executing database seed script');
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await disconnectMongoDB();
  });
