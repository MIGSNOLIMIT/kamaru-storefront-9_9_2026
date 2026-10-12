import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import type { Article } from '../../../src/types'
import { api, slugify, type Snapshot } from '../api'
import { ImageField } from '../components/ImageField'
import { Button, Card, Field, Input, Notice, PageHeader, Select, Textarea } from '../ui'

export function ArticleList() {
  const [data, setData] = useState<Snapshot | null>(null)
  const [error, setError] = useState('')
  useEffect(() => { void api.snapshot().then(setData).catch((e: Error) => setError(e.message)) }, [])
  if (!data) return <p className="text-sm text-ink/50">{error || 'Loading journal…'}</p>
  return (
    <div>
      <PageHeader kicker="Journal" title="Articles">
        <Link to="/articles/new"><Button>New article</Button></Link>
      </PageHeader>
      <div className="grid gap-4">
        {data.articles.map((article) => (
          <Card key={article.id} className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <Link to={`/articles/${article.id}`} className="font-display text-xl font-bold hover:text-clay">{article.title}</Link>
              <p className="mt-1 text-sm text-ink/55">{article.category} · {article.publishedAt} · {article.status}</p>
            </div>
            <Link to={`/articles/${article.id}`} className="text-xs font-bold tracking-widest underline">Edit</Link>
          </Card>
        ))}
      </div>
    </div>
  )
}

const blank = (sortOrder: number): Article => ({
  id: '',
  slug: '',
  title: '',
  excerpt: '',
  body: [''],
  category: 'Gear Care',
  publishedAt: new Date().toISOString().slice(0, 10),
  image: { id: 'article-image', alt: '', width: 1600, height: 900 },
  sortOrder,
  status: 'draft',
})

export function ArticleEditor() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isNew = !id
  const [article, setArticle] = useState<Article | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    void api.snapshot().then((snapshot) => {
      setArticle(isNew ? blank(snapshot.articles.length) : snapshot.articles.find((a) => a.id === id) ?? null)
    }).catch((e: Error) => setError(e.message))
  }, [id, isNew])

  if (error) return <Notice>{error}</Notice>
  if (!article) return <p className="text-sm text-ink/50">{isNew ? 'Loading…' : 'Article not found.'}</p>

  const set = <K extends keyof Article>(key: K, value: Article[K]) => setArticle({ ...article, [key]: value })
  const save = async () => {
    setBusy(true)
    setError('')
    try {
      const slug = article.slug || slugify(article.title)
      await api.saveArticle({ ...article, slug, id: article.id || slug, body: article.body.filter(Boolean) }, isNew)
      navigate('/articles')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setBusy(false)
    }
  }
  const remove = async () => {
    if (isNew || !confirm(`Delete ${article.title}?`)) return
    await api.deleteArticle(article.id)
    navigate('/articles')
  }

  return (
    <div>
      <PageHeader kicker="Journal" title={isNew ? 'New article' : article.title}>
        <div className="flex gap-2">
          {!isNew && <Button type="button" variant="ghost" onClick={() => void remove()}>Delete</Button>}
          <Link to="/articles"><Button type="button" variant="outline">Back</Button></Link>
          <Button type="button" disabled={busy || !article.title} onClick={() => void save()}>Save</Button>
        </div>
      </PageHeader>
      {error && <div className="mb-5"><Notice>{error}</Notice></div>}
      <Card className="grid max-w-3xl gap-5">
        <Field label="Title"><Input value={article.title} onChange={(e) => {
          const title = e.target.value
          setArticle({ ...article, title, slug: isNew ? slugify(title) : article.slug })
        }} /></Field>
        <div className="grid gap-5 md:grid-cols-2">
          <Field label="Slug"><Input value={article.slug} onChange={(e) => set('slug', e.target.value)} /></Field>
          <Field label="Category"><Input value={article.category} onChange={(e) => set('category', e.target.value)} /></Field>
          <Field label="Published"><Input type="date" value={article.publishedAt} onChange={(e) => set('publishedAt', e.target.value)} /></Field>
          <Field label="Status">
            <Select value={article.status} onChange={(e) => set('status', e.target.value as Article['status'])}>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
            </Select>
          </Field>
        </div>
        <Field label="Excerpt"><Textarea rows={3} value={article.excerpt} onChange={(e) => set('excerpt', e.target.value)} /></Field>
        <Field label="Body (blank line starts a new paragraph)"><Textarea rows={10} value={article.body.join('\n\n')} onChange={(e) => set('body', e.target.value.split(/\n\s*\n/))} /></Field>
        <ImageField image={article.image} onChange={(image) => set('image', image)} label="Article image" />
      </Card>
    </div>
  )
}
