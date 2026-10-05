export type Locale = 'en' | 'tl'

const dict = {
  en: {
    home: 'HOME',
    shop: 'SHOP',
    about: 'ABOUT US',
    blog: 'BLOG',
    contact: 'CONTACT',
    account: 'Account',
    cart: 'Cart',
    wishlist: 'Wishlist',
    signIn: 'Sign in',
    signOut: 'Sign out',
    bulkSignUp: 'For bulk orders, please sign up',
    addToCart: 'Add to cart',
    buyNow: 'Buy now',
    shopShopee: 'Shop on Shopee',
    shopLazada: 'Shop on Lazada',
    shopTiktok: 'Shop on TikTok',
    bulkCartTitle: 'Bulk order cart',
    checkout: 'Proceed to bulk checkout',
    retailNote: 'Single-item orders are completed on Shopee, Lazada, or TikTok for shipping discounts.',
  },
  tl: {
    home: 'HOME',
    shop: 'SHOP',
    about: 'TUNGKOL SA AMIN',
    blog: 'BLOG',
    contact: 'MAKIPAG-UGNAYAN',
    account: 'Account',
    cart: 'Cart',
    wishlist: 'Wishlist',
    signIn: 'Mag-sign in',
    signOut: 'Mag-sign out',
    bulkSignUp: 'Para sa bulk orders, mag-sign up muna',
    addToCart: 'Idagdag sa cart',
    buyNow: 'Bumili ngayon',
    shopShopee: 'Bumili sa Shopee',
    shopLazada: 'Bumili sa Lazada',
    shopTiktok: 'Bumili sa TikTok',
    bulkCartTitle: 'Bulk order cart',
    checkout: 'Magpatuloy sa bulk checkout',
    retailNote: 'Ang single orders ay sa Shopee, Lazada, o TikTok para sa shipping discount.',
  },
} as const

export type TranslationKey = keyof typeof dict.en

export function t(locale: Locale, key: TranslationKey): string {
  return dict[locale][key]
}
