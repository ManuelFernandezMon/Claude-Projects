import type { Category, ImportMode, Measures, Recipe, StorageSnapshot, StoredImage } from '../types'
import { safeHttpUrl } from '../lib/url'
import { recipeStore } from './recipeStore'

const APP_ID = 'recipe-box'
const FORMAT_VERSION = 1

interface BackupImage {
  id: string
  recipeId: string
  createdAt: number
  dataUrl: string
}

interface BackupFile {
  app: typeof APP_ID
  version: typeof FORMAT_VERSION
  exportedAt: string
  categories: Category[]
  recipes: Recipe[]
  images: BackupImage[]
}

export interface ImportSummary {
  recipes: number
  categories: number
  images: number
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error ?? new Error('Could not read image data.'))
    reader.readAsDataURL(blob)
  })
}

function dataUrlToBlob(dataUrl: string): Blob {
  const match = /^data:([^;,]+)?(;base64)?,(.*)$/s.exec(dataUrl)
  if (!match || !match[2]) throw new Error('Backup contains an invalid image.')
  const bin = atob(match[3])
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return new Blob([bytes], { type: match[1] || 'image/jpeg' })
}

export async function buildBackup(): Promise<Blob> {
  const snap = await recipeStore.exportSnapshot()
  const images: BackupImage[] = []
  for (const img of snap.images) {
    images.push({
      id: img.id,
      recipeId: img.recipeId,
      createdAt: img.createdAt,
      dataUrl: await blobToDataUrl(img.blob),
    })
  }
  const file: BackupFile = {
    app: APP_ID,
    version: FORMAT_VERSION,
    exportedAt: new Date().toISOString(),
    categories: snap.categories,
    recipes: snap.recipes,
    images,
  }
  return new Blob([JSON.stringify(file)], { type: 'application/json' })
}

export function backupFilename(): string {
  return `recipe-box-backup-${new Date().toISOString().slice(0, 10)}.json`
}

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null
}

function parseBackup(text: string): StorageSnapshot {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    throw new Error('This file is not valid JSON.')
  }
  if (!isObj(raw) || raw.app !== APP_ID) throw new Error('This is not a recipe-box backup file.')
  if (raw.version !== FORMAT_VERSION) {
    throw new Error(`Unsupported backup version: ${String(raw.version)}.`)
  }
  if (!Array.isArray(raw.recipes) || !Array.isArray(raw.categories) || !Array.isArray(raw.images)) {
    throw new Error('Backup file is incomplete.')
  }

  const categories = raw.categories.map((c: unknown, i): Category => {
    if (!isObj(c) || typeof c.id !== 'string' || typeof c.name !== 'string') {
      throw new Error(`Invalid category at position ${i + 1}.`)
    }
    return {
      id: c.id,
      name: c.name,
      color: typeof c.color === 'string' ? c.color : '#f5b642',
      order: typeof c.order === 'number' ? c.order : i,
    }
  })

  const shortText = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, 60) : undefined)
  const cleanCredits = (v: unknown, imageIds: unknown[]): Recipe['photoCredits'] => {
    if (!isObj(v)) return undefined
    const out: NonNullable<Recipe['photoCredits']> = {}
    for (const [imageId, c] of Object.entries(v)) {
      if (!imageIds.includes(imageId) || !isObj(c)) continue
      const url = typeof c.url === 'string' ? safeHttpUrl(c.url) : undefined
      const name = typeof c.name === 'string' && c.name.trim() ? c.name.trim().slice(0, 80) : undefined
      if (url && name) out[imageId] = { name, url }
    }
    return Object.keys(out).length ? out : undefined
  }
  const cleanMeasures = (v: unknown): Measures | undefined => {
    if (!isObj(v)) return undefined
    const metric = shortText(v.metric)
    const us = shortText(v.us)
    const cups = shortText(v.cups)
    const volume = v.volume === true
    if (!metric && !us && !cups && !volume) return undefined
    return {
      ...(metric ? { metric } : {}),
      ...(us ? { us } : {}),
      ...(cups ? { cups } : {}),
      ...(v.approx === true ? { approx: true } : {}),
      ...(volume ? { volume: true as const } : {}),
    }
  }
  const arr = (v: unknown) => (Array.isArray(v) ? v : [])
  const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : undefined)
  const recipes = raw.recipes.map((r: unknown, i): Recipe => {
    if (!isObj(r) || typeof r.id !== 'string' || typeof r.title !== 'string') {
      throw new Error(`Invalid recipe at position ${i + 1}.`)
    }
    const now = Date.now()
    return {
      id: r.id,
      title: r.title,
      description: typeof r.description === 'string' ? r.description : '',
      steps: arr(r.steps).filter((s): s is string => typeof s === 'string'),
      ingredients: arr(r.ingredients).flatMap((g) =>
        isObj(g) && typeof g.id === 'string' && typeof g.name === 'string'
          ? [
              {
                id: g.id,
                name: g.name,
                quantity: typeof g.quantity === 'string' ? g.quantity : undefined,
                measures: cleanMeasures(g.measures),
              },
            ]
          : [],
      ),
      checked: arr(r.checked).filter((s): s is string => typeof s === 'string'),
      categoryIds: arr(r.categoryIds).filter((s): s is string => typeof s === 'string'),
      prepMinutes: num(r.prepMinutes),
      cookMinutes: num(r.cookMinutes),
      servings: num(r.servings),
      imageIds: arr(r.imageIds).filter((s): s is string => typeof s === 'string'),
      sourceUrl: typeof r.sourceUrl === 'string' ? safeHttpUrl(r.sourceUrl) : undefined,
      photoCredits: cleanCredits(r.photoCredits, arr(r.imageIds)),
      aiGenerated: r.aiGenerated === true ? true : undefined,
      aiEdited: r.aiEdited === true ? true : undefined,
      isSample: r.isSample === true ? true : undefined,
      createdAt: num(r.createdAt) ?? now,
      updatedAt: num(r.updatedAt) ?? now,
    }
  })

  const images = raw.images.map((m: unknown, i): StoredImage => {
    if (
      !isObj(m) ||
      typeof m.id !== 'string' ||
      typeof m.recipeId !== 'string' ||
      typeof m.dataUrl !== 'string'
    ) {
      throw new Error(`Invalid image at position ${i + 1}.`)
    }
    return {
      id: m.id,
      recipeId: m.recipeId,
      createdAt: num(m.createdAt) ?? Date.now(),
      blob: dataUrlToBlob(m.dataUrl),
    }
  })

  return { recipes, categories, images }
}

export async function importBackup(file: File, mode: ImportMode): Promise<ImportSummary> {
  // Parse and validate fully before touching the database.
  const snapshot = parseBackup(await file.text())
  await recipeStore.importSnapshot(snapshot, mode)
  return {
    recipes: snapshot.recipes.length,
    categories: snapshot.categories.length,
    images: snapshot.images.length,
  }
}
