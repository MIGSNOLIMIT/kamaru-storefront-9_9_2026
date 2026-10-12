import { useEffect, useState } from 'react'
import type { AboutPageContent } from '../../../src/types'
import { api } from '../api'
import { ImageField } from '../components/ImageField'
import { Button, Card, Field, Input, Notice, PageHeader, Textarea } from '../ui'

const defaultAbout = (): AboutPageContent => ({
  hero: { kicker: 'GAWANG PINOY. TIBAY PINOY.', title: 'ABOUT KAMARU', image: { id: 'about-hero', alt: 'About Kamaru', width: 1600, height: 900 } },
  story: {
    title: 'A FILIPINO STORY BUILT TO CARRY ON',
    paragraphs: [
      'Kamaru is associated with GLPPI, a 100% Filipino-owned company established in 1988.',
      'The Kamaru brand became known for dependable, practical carry made for Filipino life.',
    ],
  },
  vision: { title: 'World-class quality, proudly Filipino.', body: 'To be recognized as a highly respected, leading marketing organization distributing world-class QUALITY products.' },
  mission: { title: 'Committed to total customer satisfaction.', body: 'Through competent and values-oriented employees, ensuring growth and profitability while contributing to the country\'s economic stability.' },
  values: {
    title: 'VALUES THAT GUIDE US',
    items: ['Commitment to Excellence', 'Integrity', 'Respect for Individual and Teamwork', 'Kaizen', 'Sense of Urgency and Determination'],
  },
})

export function AboutPageEditor() {
  const [content, setContent] = useState<AboutPageContent>(defaultAbout())
  const [error, setError] = useState('')
  const [saved, setSaved] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    void api.getAbout().then((c) => c && setContent(c)).catch((e: Error) => setError(e.message))
  }, [])

  const save = async () => {
    setBusy(true)
    setError('')
    try {
      await api.saveAbout(content)
      setSaved('About page saved.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <PageHeader kicker="Storefront" title="About page">
        <Button type="button" disabled={busy} onClick={() => void save()}>Save</Button>
      </PageHeader>
      {error && <div className="mb-4"><Notice>{error}</Notice></div>}
      {saved && <p className="mb-4 text-sm text-olive">{saved}</p>}
      <Card className="mb-6 space-y-4">
        <Field label="Hero kicker"><Input value={content.hero.kicker} onChange={(e) => setContent({ ...content, hero: { ...content.hero, kicker: e.target.value } })} /></Field>
        <Field label="Hero title"><Input value={content.hero.title} onChange={(e) => setContent({ ...content, hero: { ...content.hero, title: e.target.value } })} /></Field>
        <ImageField label="Hero image" image={content.hero.image} onChange={(image) => setContent({ ...content, hero: { ...content.hero, image } })} />
      </Card>
      <Card className="mb-6 space-y-4">
        <Field label="Story title"><Input value={content.story.title} onChange={(e) => setContent({ ...content, story: { ...content.story, title: e.target.value } })} /></Field>
        <Field label="Story paragraphs (one per line)"><Textarea rows={6} value={content.story.paragraphs.join('\n')} onChange={(e) => setContent({ ...content, story: { ...content.story, paragraphs: e.target.value.split('\n').map((l) => l.trim()).filter(Boolean) } })} /></Field>
      </Card>
      <Card className="space-y-4">
        <Field label="Values (one per line)"><Textarea rows={5} value={content.values.items.join('\n')} onChange={(e) => setContent({ ...content, values: { ...content.values, items: e.target.value.split('\n').map((l) => l.trim()).filter(Boolean) } })} /></Field>
      </Card>
    </div>
  )
}
