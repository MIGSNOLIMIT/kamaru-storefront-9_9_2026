import type { Article, Category, ColorOption, HomeSection, Product, ProductMaterial, SiteSettings } from '../types.ts'

const image = (id: string, alt: string, landscape = false) => ({
  id, alt, width: landscape ? 1600 : 900, height: landscape ? 900 : 1100,
})

export const colors: Record<string, ColorOption> = {
  black: { id: 'black', name: 'Black', hex: '#171717' },
  charcoal: { id: 'charcoal', name: 'Charcoal Gray', hex: '#4b4d4c' },
  blue: { id: 'blue', name: 'Giordano Blue', hex: '#233e63' },
  red: { id: 'red', name: 'Red', hex: '#8f2925' },
  olive: { id: 'olive', name: 'Olive', hex: '#596044' },
  violet: { id: 'violet', name: 'Violet', hex: '#66516e' },
}

const officialCategories = [
  ['duffel-bag', 'Duffel Bag', 'Spacious duffel carry for travel and sports.'],
  ['travelling-bag', 'Travelling Bag', 'Dependable bags built for longer trips.'],
  ['shoulder-bag', 'Shoulder Bag', 'Easy-access shoulder and sling carry.'],
  ['tote-pack', 'Tote Pack', 'Convertible tote and pack styles.'],
  ['back-pack', 'Back Pack', 'Everyday backpacks for work, school, and weekends.'],
  ['daypack', 'Daypack', 'Compact packs for daily movement.'],
  ['fullpack', 'Fullpack', 'Full-size packs for heavier loads.'],
  ['waistpack', 'Waistpack', 'Hands-free belt and waist bags.'],
  ['folder-and-clutch-bag', 'Folder and Clutch Bag', 'Compact organizers and clutch styles.'],
  ['ladies-bag', 'Ladies Bag', 'Everyday ladies carry collection.'],
  ['laptop-bag', 'Laptop Bag', 'Protective tech-friendly carry.'],
  ['sleeping-bag', 'Sleeping Bag', 'Outdoor sleeping gear from Kamaru.'],
  ['gun-holster', 'Gun Holster', 'Specialty holster bags.'],
  ['hanging-accessories', 'Hanging Accessories', 'Pouches, feed bags, and small organizers.'],
  ['body-bag', 'Body Bag', 'Lightweight body and string bags.'],
] as const

export const categories: Category[] = officialCategories.map(([slug, name, description], i) => ({
  id: slug,
  slug,
  name,
  description,
  image: image(`cat-${slug}`, `${name} collection`, true),
  sortOrder: i,
  status: 'published' as const,
}))

const legacyToOfficial: Record<string, string> = {
  'travel-bags': 'travelling-bag',
  'adventure-bags': 'travelling-bag',
  'daypacks': 'daypack',
  'regular-backpacks': 'back-pack',
  'backpacks': 'back-pack',
  'backpack-covers': 'back-pack',
  'tote-packs': 'tote-pack',
  'belt-bags': 'waistpack',
  'clutch-bags': 'folder-and-clutch-bag',
  'document-bags': 'folder-and-clutch-bag',
  'ladies-bags': 'ladies-bag',
  'laptop-backpacks': 'laptop-bag',
  'laptop-shoulder-bags': 'laptop-bag',
  'laptop-sleeves': 'laptop-bag',
  'laptop-bags': 'laptop-bag',
  'sleeping-bags': 'sleeping-bag',
  'gun-holster-bags': 'gun-holster',
  'feed-bags': 'hanging-accessories',
  'pouches': 'hanging-accessories',
  'accessories': 'hanging-accessories',
  'pencil-cases': 'hanging-accessories',
  'wallets': 'hanging-accessories',
  'body-bags': 'body-bag',
  'full-packs': 'fullpack',
  'classic-shoulder-bags': 'shoulder-bag',
  'sling-bags': 'shoulder-bag',
  'shoulder-bags': 'shoulder-bag',
  'sports-bags': 'duffel-bag',
  'bike-bags': 'shoulder-bag',
}

function mapCategoryIds(legacyIds: string[]): string[] {
  const mapped = legacyIds.map((id) => legacyToOfficial[id] ?? id).filter((id) => officialCategories.some(([slug]) => slug === id))
  return [...new Set(mapped)]
}

type Seed = [string, number, string[], string[], Partial<Product>]
const shared = ['Original Kamaru Accessories', 'Water resistant fabric']
const seeds: Seed[] = [
  ['ARGO',2349.50,['adventure-bags','travel-bags'],['Spacious main compartment','Spacious front compartment','Garterized side pockets','Adjustable straps',...shared],{}],
  ['AVEN',699.50,['backpacks','daypacks'],['Hand carry strap','Spacious main compartment','Zippered front pocket',...shared],{}],
  ['BENEDICT',2149.50,['backpacks','regular-backpacks'],['Spacious main compartment','Zippered front pocket','Extra side pockets','Adjustable back strap',...shared],{sku:'005-702',specs:{dimensions:'11.5 × 7.5 × 18.5 in',loadCapacity:'13.5 Kilos'},colors:[colors.black,colors.charcoal,colors.blue,colors.red]}],
  ['CAMRON',3299.50,['adventure-bags','travel-bags'],['Spacious main compartment','Zippered front pockets','Zippered side pockets','Adjustable shoulder strap','Tough and durable materials',...shared],{}],
  ['CHESNEY',999.50,['shoulder-bags','ladies-bags'],['Roomy main compartment','Adjustable shoulder strap',...shared],{}],
  ['DALLAS',1599.50,['adventure-bags','travel-bags'],['Spacious main compartment','Spacious front and side pocket','Front zippered pocket','Adjustable shoulder strap',...shared],{sku:'002-179',specs:{dimensions:'19 × 9 × 10 in',loadCapacity:'10 Kilos'},colors:[colors.black,colors.charcoal,colors.blue,colors.red,colors.violet]}],
  ['DUSTIN',1399.50,['backpacks','regular-backpacks'],['Spacious main compartment','Front organizer pocket','Adjustable padded straps',...shared],{}],
  ['EPHRAIM',1249.50,['backpacks','regular-backpacks'],['Spacious main compartment','Side pockets','Zippered front pocket','Adjustable strap',...shared],{specs:{dimensions:'12 × 6.5 × 17 in',loadCapacity:'10 Kilos'},colors:[colors.black,colors.charcoal,colors.blue,colors.red]}],
  ['FARLEY',799.50,['shoulder-bags','classic-shoulder-bags'],['Spacious main compartment','Adjustable strap',...shared],{}],
  ['FEED BAG',799.50,['accessories','feed-bags'],['Wide main compartment','Secure closure','Adjustable strap',...shared],{}],
  ['FILBERT',699.50,['accessories','clutch-bags'],['Compact organizer','Zippered compartment',...shared],{}],
  ['MILLARD',1399.50,['backpacks','regular-backpacks'],['Spacious main compartment','Front and side pockets','Adjustable straps',...shared],{}],
  ['FRANCES',1399.50,['backpacks','regular-backpacks'],['Spacious main compartment','Side pockets','Adjustable back strap','Tough and durable materials',...shared],{}],
  ['GRIMM',879.50,['backpacks','body-bags'],['Adjustable string strap','Spacious compartment','Stylish colors',...shared],{}],
  ['LANCELOT',1799.50,['backpacks','regular-backpacks'],['Spacious main compartment','Zippered front pocket','Net side pocket','Adjustable padded back strap',...shared],{}],
  ['RAMSE',999.50,['backpacks','regular-backpacks'],['Roomy main compartment','Zippered front pocket','Adjustable back strap','Durable materials',...shared],{}],
  ['KAYNE',699.50,['shoulder-bags','sling-bags'],['Adjustable shoulder strap','Spacious main compartment','Zippered back pocket','Zippered front pocket','Water resistant fabric'],{}],
  ['KING',679.50,['shoulder-bags','sling-bags'],['Adjustable shoulder strap','Wide main compartment','Ergonomic design',...shared],{}],
  ['TAMI',649.50,['shoulder-bags','sling-bags'],['Adjustable back strap','Zippered front pocket','Wide main compartment','Ergonomic design',...shared],{}],
  ['HARVEY LARGE',1249.50,['adventure-bags','belt-bags'],['Adjustable waist strap','Spacious compartment','Front zippered compartments','Organizer pocket inside','Water resistant fabric'],{specs:{dimensions:'9.75 × 4 × 6.25 in',loadCapacity:'4 Kilos'}}],
  ['HARVEY MEDIUM',1149.50,['adventure-bags','belt-bags'],['Adjustable waist strap','Spacious compartment','Front zippered compartments','Organizer pocket inside','Water resistant fabric'],{specs:{dimensions:'9 × 4 × 5.25 in',loadCapacity:'3.5 Kilos'}}],
  ['THOMAS',779.50,['adventure-bags','belt-bags'],['Adjustable waist strap','Roomy compartment','Organizer pocket inside','Converts to crossbody','Water resistant fabric'],{specs:{dimensions:'14.5 × 4 × 6 in',loadCapacity:'3 Kilos'}}],
  ['SMITH II',999.50,['adventure-bags','sports-bags'],['Designed to fit the legs perfectly','Zipped front pocket','Adjustable leg strap','Water resistant fabric'],{sku:'008-132',specs:{dimensions:'4 × 7 × 10 in',loadCapacity:'4 Kilos'}}],
  ['LUNA',899.50,['accessories','pouches'],['Compact everyday organizer','Durable construction','Water resistant fabric'],{}],
  ['MAGNUS',699.50,['accessories','pouches'],['Compact everyday organizer','Durable construction','Water resistant fabric'],{}],
  ['CALLEN',879.50,['accessories','pouches'],['Compact everyday organizer','Durable construction','Water resistant fabric'],{}],
  ['PALMER',1299.50,['backpacks','regular-backpacks'],['Spacious main compartment','Extra side pockets','Adjustable straps',...shared],{}],
  ['JAMILLE',899.50,['shoulder-bags','ladies-bags'],['Everyday main compartment','Comfortable shoulder strap','Water resistant fabric'],{}],
  ['JILLIAN',899.50,['shoulder-bags','ladies-bags'],['Everyday main compartment','Comfortable shoulder strap','Water resistant fabric'],{}],
  ['KATE',849.50,['shoulder-bags','ladies-bags'],['Compact main compartment','Adjustable strap','Water resistant fabric'],{}],
  ['LEWIS',1099.50,['backpacks','tote-packs'],['Convertible carry handles','Roomy compartment',...shared],{}],
  ['ASHER II',1499.50,['backpacks','tote-packs'],['Convertible tote pack','Organized storage',...shared],{}],
  ['BRYANT',699.50,['shoulder-bags','classic-shoulder-bags'],['Spacious main compartment','Roomy front pocket','Adjustable strap','Water resistant fabric'],{sku:'003-269',specs:{dimensions:'2.75 × 8 × 10 in',loadCapacity:'3 Kilos'}}],
  ['SHELDON II',2299.50,['adventure-bags','sports-bags'],['Sturdy heavy-duty materials','Very spacious main compartment','Extra side pockets','Adjustable shoulder strap','Water resistant fabric'],{sku:'029-010',specs:{dimensions:'20 × 9.5 × 10 in',loadCapacity:'10 Kilos'}}],
]

const defaultMaterials: ProductMaterial[] = ['polyester', 'nylon-420-hd']

export const products: Product[] = seeds.map(([name, price, legacyCategoryIds, features, extra], i) => {
  const slug = name.toLowerCase().replace(/\s+/g, '-')
  const hasVerifiedSpecs = Boolean(extra.sku || extra.specs)
  const categoryIds = mapCategoryIds(legacyCategoryIds)
  const base: Product = {
    id: `product-${slug}`,
    slug,
    name,
    price,
    currency: 'PHP',
    categoryIds,
    images: [0, 1, 2, 3].map((n) => image(`${slug}-${n}`, `${name} ${n ? `view ${n + 1}` : 'bag'}`)),
    shortDescription: `${name} is practical Kamaru carry made for everyday movement and adventure.`,
    features,
    specs: {},
    colors: [colors.black, colors.charcoal, colors.red],
    materials: defaultMaterials,
    marketplace: {},
    inStock: !['KAYNE', 'KING', 'TAMI'].includes(name),
    flags: {
      featured: i < 8,
      newArrival: i < 12,
      bestSeller: [0, 2, 5, 7, 11, 14].includes(i),
      discontinued: false,
    },
    dataQuality: hasVerifiedSpecs ? 'verified' : 'placeholder',
    sortOrder: i,
    status: 'published',
  }
  return { ...base, ...extra, categoryIds, materials: extra.materials ?? base.materials, marketplace: extra.marketplace ?? base.marketplace, flags: { ...base.flags, ...extra.flags } }
})

export const articles: Article[] = [
  { id:'pack-right', slug:'pack-it-right-fit-it-right', title:'Pack it right.. Fit it right!', excerpt:'A balanced pack protects your back and makes every trip more comfortable.', body:['Keep your backpack’s center of gravity close to your body. Place bulky, lighter items at the bottom, heavy items close to your back, and frequently used items near the top.','Balance the load from left to right and tighten compression straps so it does not shift as you move.'], category:'Packing Guides', publishedAt:'2026-07-18', image:image('article-pack','A carefully packed Kamaru bag',true), sortOrder:0,status:'published' },
  { id:'fit-bag', slug:'five-easy-steps-fit-mountain-bag', title:'5 Easy Steps to Fit Your Kamaru Mountain Bag', excerpt:'Set your straps in the right order for comfort on longer trails.', body:['Loosen every strap before putting the pack on. Settle the hip belt over your hip bones, tighten the shoulder straps, then adjust the load lifters and sternum strap.','Walk for a few minutes and make small adjustments. The load should feel stable without restricting your breathing.'], category:'Trail Skills', publishedAt:'2026-06-29', image:image('article-fit','Hiker adjusting a mountain bag',true), sortOrder:1,status:'published' },
  { id:'rain-ready', slug:'keep-your-gear-rain-ready', title:'Keep Your Gear Rain-Ready', excerpt:'Simple habits that protect essentials when the weather turns.', body:['Water-resistant fabric helps with everyday splashes, but thoughtful packing matters too. Keep electronics in sealed pouches and use a pack cover during prolonged rain.','Air-dry your bag fully after wet trips and brush away dirt before storing it.'], category:'Gear Care', publishedAt:'2026-05-12', image:image('article-rain','Kamaru bag ready for rain',true), sortOrder:2,status:'published' },
]

export const homeSections: HomeSection[] = ['hero','benefits','categories','new-arrivals','editorial','water-resistant','story','best-sellers','lifestyle','journal','newsletter'].map((type, i) => ({ id:type, type, sortOrder:i } as HomeSection))

export const siteSettings: SiteSettings = {
  brandName:'KAMARU',
  tagline:'GAWANG PINOY. TIBAY PINOY!',
  email:'info@kamaru.com.ph',
  inquiryEmail:'info@kamaru.com.ph',
  phones:['(02) 689-9376','(02) 998-5334'],
  fax:'(02) 534-5387',
  address:'4 Monzon St. Gate III, Vista Verde Executive Village, Cainta, Rizal',
  social:[{label:'Facebook',href:'https://facebook.com/kamarugear'},{label:'Instagram',href:'https://instagram.com/'}],
  marketplaceStores: {},
  bankDetails: {
    bankName: 'Pending bank name',
    accountName: 'Kamaru Philippines',
    accountNumber: '0000-0000-0000',
    branch: 'Pending branch',
  },
  bulkMoq: 10,
  ga4MeasurementId: '',
}
