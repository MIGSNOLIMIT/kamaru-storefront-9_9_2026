export type ContentStatus = 'published' | 'draft'
export type DataQuality = 'verified' | 'placeholder'
export type ProductMaterial = 'polyester' | 'nylon-420-hd' | 'kipling'
export type UserRole = 'customer' | 'content' | 'orders' | 'admin' | 'super_admin'
export type PaymentMethod = 'qr' | 'bank_transfer' | 'pickup'
export type FulfillmentMethod = 'lbc' | 'lalamove' | 'pickup'
export type OrderStatus =
  | 'pending'
  | 'payment_review'
  | 'confirmed'
  | 'preparing'
  | 'shipped'
  | 'completed'
  | 'cancelled'

export interface ImageRef {
  id: string
  src?: string
  alt: string
  width: number
  height: number
}

export interface ColorOption {
  id: string
  name: string
  hex: string
}

export interface MarketplaceLinks {
  shopee?: string
  lazada?: string
  tiktok?: string
}

export interface Product {
  id: string
  slug: string
  name: string
  price: number
  currency: 'PHP'
  categoryIds: string[]
  images: ImageRef[]
  shortDescription: string
  features: string[]
  specs: { dimensions?: string; loadCapacity?: string; weight?: string }
  colors: ColorOption[]
  materials: ProductMaterial[]
  marketplace: MarketplaceLinks
  sku?: string
  inStock: boolean
  flags: { featured: boolean; newArrival: boolean; bestSeller: boolean; discontinued: boolean }
  dataQuality: DataQuality
  sortOrder: number
  status: ContentStatus
}

export interface Category {
  id: string
  slug: string
  name: string
  parentId?: string
  description: string
  image: ImageRef
  sortOrder: number
  status: ContentStatus
}

export type ArticleBlock = { type: 'heading' | 'paragraph'; text: string }

export interface Article {
  id: string
  slug: string
  title: string
  excerpt: string
  body: ArticleBlock[]
  category: string
  publishedAt: string
  image: ImageRef
  sortOrder: number
  status: ContentStatus
}

export interface ProductQuery {
  search?: string
  category?: string
  color?: string
  material?: ProductMaterial
  minPrice?: number
  maxPrice?: number
  sort?: 'featured' | 'newest' | 'price-asc' | 'price-desc' | 'name'
  flag?: 'newArrival' | 'bestSeller' | 'featured'
  limit?: number
  offset?: number
}

export interface SectionContent {
  headline?: string
  subheadline?: string
  body?: string
  image?: ImageRef
  ctaLabel?: string
  ctaHref?: string
}

export interface AboutPageContent {
  hero: { kicker: string; title: string; image: ImageRef }
  story: { title: string; paragraphs: string[] }
  vision: { title: string; body: string }
  mission: { title: string; body: string }
  values: { title: string; items: string[] }
}

export interface Paginated<T> { items: T[]; total: number }

export interface BankDetails {
  bankName: string
  accountName: string
  accountNumber: string
  branch?: string
}

export interface SiteSettings {
  brandName: string
  tagline: string
  email: string
  phones: string[]
  fax: string
  address: string
  social: { label: string; href: string }[]
  inquiryEmail: string
  gcashNumber?: string
  gcashAccountName?: string
  qrImageUrl?: string
  bankDetails?: BankDetails
  marketplaceStores: MarketplaceLinks
  bulkMoq?: number
  ga4MeasurementId?: string
}

type HomeSectionBase = { id: string; sortOrder: number; content?: SectionContent }

export type HomeSection =
  | (HomeSectionBase & { type: 'hero' })
  | (HomeSectionBase & { type: 'benefits' })
  | (HomeSectionBase & { type: 'categories' })
  | (HomeSectionBase & { type: 'new-arrivals' })
  | (HomeSectionBase & { type: 'editorial' })
  | (HomeSectionBase & { type: 'water-resistant' })
  | (HomeSectionBase & { type: 'story' })
  | (HomeSectionBase & { type: 'best-sellers' })
  | (HomeSectionBase & { type: 'lifestyle' })
  | (HomeSectionBase & { type: 'journal' })
  | (HomeSectionBase & { type: 'newsletter' })

export interface Profile {
  id: string
  email: string
  fullName: string
  phone?: string
  ageRange?: string
  gender?: string
  city?: string
  province?: string
  role: UserRole
  createdAt: string
  lastActiveAt?: string
}

export interface OrderItem {
  productId: string
  productName: string
  productSlug: string
  colorId: string
  quantity: number
  unitPrice: number
}

export interface BulkOrder {
  id: string
  userId: string
  items: OrderItem[]
  companyName?: string
  deliveryAddress?: string
  paymentMethod: PaymentMethod
  fulfillmentMethod: FulfillmentMethod
  status: OrderStatus
  paymentProofUrl?: string
  staffNotes?: string
  customerNotes?: string
  subtotal: number
  createdAt: string
  updatedAt: string
}

export interface Inquiry {
  id: string
  name: string
  email: string
  subject: string
  message: string
  createdAt: string
}

export interface CatalogStats {
  minPrice: number
  maxPrice: number
  materials: ProductMaterial[]
}

export interface ContentSource {
  listProducts(query?: ProductQuery): Promise<Paginated<Product>>
  getProductsByIds(ids: string[]): Promise<Product[]>
  getProduct(slug: string): Promise<Product | null>
  getCategoryTree(): Promise<Category[]>
  listColors(): Promise<ColorOption[]>
  getCatalogStats(): Promise<CatalogStats>
  listArticles(): Promise<Paginated<Article>>
  getArticle(slug: string): Promise<Article | null>
  listSections(pageKey: string): Promise<HomeSection[]>
  getSiteSettings(): Promise<SiteSettings>
  getAboutPage(): Promise<AboutPageContent | null>
}
