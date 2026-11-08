import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import type { Article, ArticleBlock } from '../../../src/types'

function blocksToText(blocks: ArticleBlock[]) {
  return blocks.map((b) => (b.type === 'heading' ? `## ${b.text}` : b.text)).join('\n\n')
}

function textToBlocks(text: string): ArticleBlock[] {
  return text
    .split(/\n\s*\n/)
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) => (chunk.startsWith('## ') ? { type: 'heading' as const, text: chunk.slice(3) } : { type: 'paragraph' as const, text: chunk }))
}
import { api, slugify, type Snapshot } from '../api'
import { ImageField } from '../components/ImageField'
import { useConfirm } from '../confirm'
import { Button, Card, Field, Input, Notice, PageHeader, Select, Textarea } from '../ui'
import { isSlug } from '../validate'

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
  body: [{ type: 'paragraph', text: '' }],
  category: 'Gear Care',
  publishedAt: new Date().toISOString().slice(0, 10),
  image: { id: 'article-image', alt: '', width: 1600, height: 900 },
  sortOrder,
  status: 'draft',
})

export function ArticleEditor() {
  const { id } = useParams()
  const navigate = useNavigate()
  const confirm = useConfirm()
  const isNew = !id
  const [article, setArticle] = useState<Article | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    void api.snapshot().then((snapshot) => {
      setArticle(isNew ? blank(snapshot.articles.length) : snapshot.articles.find((a) => a.id === id) ?? null)
    }).catch((e: Error) => setError(e.message))
  }, [id, isNew])

  if (!article) return error ? <Notice>{error}</Notice> : <p className="text-sm text-ink/50">{isNew ? 'Loading…' : 'Article not found.'}</p>

  const set = <K extends keyof Article>(key: K, value: Article[K]) => setArticle({ ...article, [key]: value })
  const slug = article.slug.trim() || slugify(article.title)
  const titleError = article.title.trim() ? '' : 'Title is required.'
  const slugError = isSlug(slug) ? '' : 'Use lowercase letters, numbers, and hyphens.'
  const dateError = article.publishedAt ? '' : 'Published date is required.'
  const save = async () => {
    if (titleError || slugError || dateError) {
      setError(titleError || slugError || dateError)
      return
    }
    const ok = await confirm({ title: 'Save article?', message: `Save “${article.title.trim()}”.`, confirmLabel: 'Save' })
    if (!ok) return
    setBusy(true)
    setError('')
    try {
      await api.saveArticle({ ...article, slug, id: article.id || slug, body: article.body.filter(Boolean) }, isNew)
      navigate('/articles')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setBusy(false)
    }
  }
  const remove = async () => {
    if (isNew) return
    const ok = await confirm({ title: 'Delete article?', message: `Delete “${article.title}”.`, confirmLabel: 'Delete', tone: 'danger' })
    if (!ok) return
    try {
      await api.deleteArticle(article.id)
      navigate('/articles')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed')
    }
  }

  return (
    <div>
      <PageHeader kicker="Journal" title={isNew ? 'New article' : article.title}>
        <div className="flex gap-2">
          {!isNew && <Button type="button" variant="ghost" onClick={() => void remove()}>Delete</Button>}
          <Link to="/articles"><Button type="button" variant="outline">Back</Button></Link>
          <Button type="button" disabled={busy || !article.title.trim()} onClick={() => void save()}>{busy ? 'Saving…' : 'Save'}</Button>
        </div>
      </PageHeader>
      {error && <div className="mb-5"><Notice>{error}</Notice></div>}
      <Card className="grid max-w-3xl gap-5">
        <Field label="Title" error={error ? titleError : ''}><Input value={article.title} onChange={(e) => {
          const title = e.target.value
          setArticle({ ...article, title, slug: isNew ? slugify(title) : article.slug })
        }} /></Field>
        <div className="grid gap-5 md:grid-cols-2">
          <Field label="Slug" error={error ? slugError : ''}><Input value={article.slug} onChange={(e) => set('slug', e.target.value)} /></Field>
          <Field label="Category"><Input value={article.category} onChange={(e) => set('category', e.target.value)} /></Field>
          <Field label="Published" error={error ? dateError : ''}><Input type="date" value={article.publishedAt} onChange={(e) => set('publishedAt', e.target.value)} /></Field>
          <Field label="Status">
            <Select value={article.status} onChange={(e) => set('status', e.target.value as Article['status'])}>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
            </Select>
          </Field>
        </div>
        <Field label="Excerpt"><Textarea rows={3} value={article.excerpt} onChange={(e) => set('excerpt', e.target.value)} /></Field>
        <Field label="Body (blank line = new block; prefix ## for headings)">
          <Textarea rows={10} value={blocksToText(article.body)} onChange={(e) => set('body', textToBlocks(e.target.value))} />
        </Field>
        <ImageField image={article.image} onChange={(image) => set('image', image)} label="Article image" />
      </Card>
    </div>
  )
}
