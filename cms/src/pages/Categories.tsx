import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import type { Category } from '../../../src/types'
import { api, slugify, type Snapshot } from '../api'
import { ImageField } from '../components/ImageField'
import { Button, Card, Field, Input, Notice, PageHeader, Select, Textarea } from '../ui'

export function CategoryList() {
  const [data, setData] = useState<Snapshot | null>(null)
  const [error, setError] = useState('')
  const reload = () => void api.snapshot().then(setData).catch((e: Error) => setError(e.message))
  useEffect(() => { reload() }, [])
  const remove = async (category: Category) => {
    if (!confirm(`Delete ${category.name}?`)) return
    setError('')
    try {
      await api.deleteCategory(category.id)
      reload()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed')
    }
  }
  if (!data) return <p className="text-sm text-ink/50">{error || 'Loading categories…'}</p>
  const roots = data.categories.filter((c) => !c.parentId)
  return (
    <div>
      <PageHeader kicker="Catalog" title="Categories">
        <Link to="/categories/new"><Button>New category</Button></Link>
      </PageHeader>
      {error && <div className="mb-5"><Notice>{error}</Notice></div>}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {roots.map((root) => (
          <Card key={root.id}>
            <div className="flex items-start justify-between gap-2">
              <Link to={`/categories/${root.id}`} className="font-display text-lg font-bold hover:text-clay">{root.name}</Link>
              <Button type="button" variant="ghost" onClick={() => void remove(root)}>Delete</Button>
            </div>
            <p className="mt-2 text-sm text-ink/55">{root.description}</p>
            <ul className="mt-4 space-y-2 text-sm">
              {data.categories.filter((c) => c.parentId === root.id).map((child) => (
                <li key={child.id} className="flex items-center justify-between gap-2">
                  <Link className="hover:text-clay" to={`/categories/${child.id}`}>{child.name}</Link>
                  <Button type="button" variant="ghost" onClick={() => void remove(child)}>Delete</Button>
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>
    </div>
  )
}

const blank = (sortOrder: number): Category => ({
  id: '',
  slug: '',
  name: '',
  description: '',
  image: { id: 'category-image', alt: '', width: 1600, height: 900 },
  sortOrder,
  status: 'draft',
})

export function CategoryEditor() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isNew = !id
  const [data, setData] = useState<Snapshot | null>(null)
  const [category, setCategory] = useState<Category | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    setData(null)
    setCategory(null)
    setError('')
    void api.snapshot().then((snapshot) => {
      setData(snapshot)
      setCategory(isNew ? blank(snapshot.categories.length) : snapshot.categories.find((c) => c.id === id) ?? null)
    }).catch((e: Error) => setError(e.message))
  }, [id, isNew])

  if (error) return <Notice>{error}</Notice>
  if (!data) return <p className="text-sm text-ink/50">Loading…</p>
  if (!isNew && !category) return <p className="text-sm text-ink/50">Category not found.</p>
  if (!category) return <p className="text-sm text-ink/50">Loading…</p>

  const set = <K extends keyof Category>(key: K, value: Category[K]) => setCategory({ ...category, [key]: value })
  const save = async () => {
    setBusy(true)
    setError('')
    try {
      const slug = category.slug || slugify(category.name)
      await api.saveCategory({ ...category, slug, id: category.id || slug }, isNew)
      navigate('/categories')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setBusy(false)
    }
  }
  const remove = async () => {
    if (isNew || !confirm(`Delete ${category.name}?`)) return
    try {
      await api.deleteCategory(category.id)
      navigate('/categories')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed')
    }
  }

  return (
    <div>
      <PageHeader kicker="Catalog" title={isNew ? 'New category' : category.name}>
        <div className="flex gap-2">
          {!isNew && <Button type="button" variant="ghost" onClick={() => void remove()}>Delete</Button>}
          <Link to="/categories"><Button type="button" variant="outline">Back</Button></Link>
          <Button type="button" disabled={busy || !category.name} onClick={() => void save()}>Save</Button>
        </div>
      </PageHeader>
      {error && <div className="mb-5"><Notice>{error}</Notice></div>}
      <Card className="grid max-w-3xl gap-5">
        <Field label="Name"><Input value={category.name} onChange={(e) => {
          const name = e.target.value
          setCategory({ ...category, name, slug: isNew ? slugify(name) : category.slug })
        }} /></Field>
        <div className="grid gap-5 md:grid-cols-2">
          <Field label="Slug"><Input value={category.slug} onChange={(e) => set('slug', e.target.value)} /></Field>
          <Field label="Parent">
            <Select value={category.parentId ?? ''} onChange={(e) => set('parentId', e.target.value || undefined)}>
              <option value="">Top level</option>
              {data.categories.filter((c) => c.id !== category.id).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </Field>
          <Field label="Status">
            <Select value={category.status} onChange={(e) => set('status', e.target.value as Category['status'])}>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
            </Select>
          </Field>
          <Field label="Sort order"><Input type="number" value={category.sortOrder} onChange={(e) => set('sortOrder', Number(e.target.value))} /></Field>
        </div>
        <Field label="Description"><Textarea rows={4} value={category.description} onChange={(e) => set('description', e.target.value)} /></Field>
        <ImageField image={category.image} onChange={(image) => set('image', image)} label="Category image" />
      </Card>
    </div>
  )
}
