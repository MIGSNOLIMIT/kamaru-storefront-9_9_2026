import { Link } from 'react-router-dom'
import { Breadcrumbs, Button } from '../components/UI'
import { Seo } from '../components/Seo'

export function Privacy() {
  return (
    <div className="container-site section-space max-w-3xl">
      <Seo title="Privacy Policy | Kamaru" />
      <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Privacy Policy' }]} />
      <h1 className="mt-8 text-4xl font-extrabold">Privacy Policy</h1>
      <p className="mt-6 leading-8 text-ink/65">This is a placeholder privacy policy for the Kamaru website rebuild. Official legal copy from Kamaru will replace this text before public launch.</p>
      <p className="mt-4 leading-8 text-ink/65">We collect account information for bulk orders, optional demographic fields for analytics, and contact form messages. Payment proofs are stored securely for order verification only.</p>
    </div>
  )
}

export function Terms() {
  return (
    <div className="container-site section-space max-w-3xl">
      <Seo title="Terms and Conditions | Kamaru" />
      <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Terms & Conditions' }]} />
      <h1 className="mt-8 text-4xl font-extrabold">Terms &amp; Conditions</h1>
      <p className="mt-6 leading-8 text-ink/65">Placeholder terms for staging. Bulk website orders are processed manually. Retail single-item purchases are completed on Shopee, Lazada, or TikTok.</p>
      <Link to="/contact" className="mt-8 inline-block"><Button>Contact us</Button></Link>
    </div>
  )
}
