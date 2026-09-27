'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { useField } from '@payloadcms/ui'
import 'vditor/dist/index.css'
import styles from './MarkdownEditor.module.css'

/**
 * Payload field component for `posts.bodyMarkdown`.
 *
 * Vditor runs in IR (instant rendering) mode so the author sees the rendered
 * result while typing, but the stored value stays plain Markdown — the front
 * end keeps rendering it through `components/MarkdownBody.tsx`.
 *
 * Runtime assets are self-hosted (see scripts/sync-vditor-assets.mjs), so the
 * editor never reaches an external CDN. If the editor script cannot load, the
 * component degrades to a plain textarea instead of blocking the author.
 */

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif']
const MAX_FILE_BYTES = 10 * 1024 * 1024
const SYNC_DELAY_MS = 600
const HLJS_STYLE = 'agate'
const TOOLBAR = [
  'headings', 'bold', 'italic', 'strike', '|',
  'list', 'ordered-list', 'check', '|',
  'quote', 'code', 'inline-code', '|',
  'link', 'table', 'line', '|',
  'upload', '|',
  'undo', 'redo', '|',
  'edit-mode', 'fullscreen',
]

type VditorInstance = {
  destroy: () => void
  getValue: () => string
  insertValue: (value: string, render?: boolean) => void
  setValue: (markdown: string, clearStack?: boolean) => void
  tip: { show: (text: string, time?: number) => void }
}

type MarkdownEditorFieldProps = {
  path: string
  readOnly?: boolean
  field?: {
    label?: unknown
    required?: boolean
    admin?: { description?: unknown; placeholder?: string }
  }
}

function textOf(value: unknown): string | undefined {
  if (typeof value === 'string' && value.trim()) return value
  if (value && typeof value === 'object') {
    const localized = value as Record<string, unknown>
    if (typeof localized.zh === 'string' && localized.zh.trim()) return localized.zh
  }
  return undefined
}

/** Uploads one image to the site media library and returns its public URL. */
function uploadMedia(file: File): Promise<{ url: string; alt: string }> {
  const form = new FormData()
  form.append('file', file)
  // `alt` is required by the Media collection — the file name is a sane default.
  form.append('alt', file.name.replace(/\.[^.]+$/, '') || file.name)
  return fetch('/api/media', { method: 'POST', body: form, credentials: 'include' }).then(async (response) => {
    const data = (await response.json().catch(() => null)) as
      | { doc?: { url?: string; alt?: string }; errors?: { message?: string }[]; message?: string }
      | null
    if (!response.ok || !data?.doc?.url) {
      throw new Error(data?.errors?.[0]?.message || data?.message || `媒体库返回 ${response.status}`)
    }
    return { url: data.doc.url, alt: data.doc.alt || file.name }
  })
}

export function MarkdownEditorField({ path, readOnly, field }: MarkdownEditorFieldProps) {
  const { value, setValue, showError, errorMessage } = useField<string>({ path })
  const holderRef = useRef<HTMLDivElement | null>(null)
  const instanceRef = useRef<VditorInstance | null>(null)
  /** Latest editor content (what the author sees). */
  const latestRef = useRef<string>(value ?? '')
  /** Latest form value, so the editor can be created/refreshed with it. */
  const valueRef = useRef<string>(value ?? '')
  /** Last value we wrote into the form — used to ignore our own echo. */
  const pushedRef = useRef<string | null>(null)
  const setValueRef = useRef(setValue)
  const syncTimerRef = useRef<number | null>(null)
  const [unavailable, setUnavailable] = useState(false)
  const labelId = useId()

  const label = textOf(field?.label) ?? 'Markdown 正文'
  const description = textOf(field?.admin?.description)
  const placeholder = typeof field?.admin?.placeholder === 'string' ? field.admin.placeholder : '在这里书写 Markdown……'

  useEffect(() => {
    setValueRef.current = setValue
    valueRef.current = value ?? ''
  }, [setValue, value])

  // Uploads run in the background: Vditor's custom handler is only read for a
  // message string, so the markdown is inserted here once the files are stored.
  const performUpload = (files: File[]) => {
    Promise.allSettled(files.map((file) => uploadMedia(file))).then((results) => {
      const uploaded = results.flatMap((result) => (result.status === 'fulfilled' ? [result.value] : []))
      const instance = instanceRef.current
      if (uploaded.length) {
        instance?.insertValue(uploaded.map(({ url, alt }) => `![${alt}](${url})`).join('\n'), true)
      }
      if (uploaded.length === files.length) return
      console.error('[markdown-editor] 部分图片上传失败', results)
      instance?.tip.show(
        uploaded.length
          ? `已插入 ${uploaded.length} 张图片，${files.length - uploaded.length} 张上传失败`
          : '图片上传失败：请确认已登录后台，或检查媒体库的类型限制',
      )
    })
  }

  useEffect(() => {
    if (readOnly || unavailable) return
    const holder = holderRef.current
    if (!holder) return
    let disposed = false
    let instance: VditorInstance | null = null

    const writeToForm = (markdown: string, immediate = false) => {
      latestRef.current = markdown
      if (syncTimerRef.current) window.clearTimeout(syncTimerRef.current)
      // Debounced: keystrokes should not revalidate the whole form on every input.
      if (immediate) {
        syncTimerRef.current = null
        pushedRef.current = markdown
        setValueRef.current(markdown)
        return
      }
      syncTimerRef.current = window.setTimeout(() => {
        syncTimerRef.current = null
        pushedRef.current = latestRef.current
        setValueRef.current(latestRef.current)
      }, SYNC_DELAY_MS)
    }

    import('vditor')
      .then(({ default: Vditor }) => {
        if (disposed) return
        instance = new Vditor(holder, {
          cdn: '/vditor',
          mode: 'ir',
          theme: 'dark',
          icon: 'ant',
          lang: 'zh_CN',
          height: 'auto',
          minHeight: 380,
          placeholder,
          // Existing article content has to seed the editor, otherwise opening a
          // saved Markdown article shows an empty editor.
          value: valueRef.current,
          cache: { enable: false },
          counter: { enable: true, type: 'markdown' },
          resize: { enable: false },
          outline: { enable: false, position: 'left' },
          link: { isOpen: false },
          toolbar: TOOLBAR,
          preview: { hljs: { style: HLJS_STYLE, lineNumber: true }, theme: { current: 'dark' } },
          input: (markdown: string) => writeToForm(markdown),
          blur: (markdown: string) => writeToForm(markdown, true),
          upload: {
            accept: 'image/*',
            multiple: true,
            // Vditor only reads the returned string as an error tip; the actual
            // upload + markdown insertion happens in performUpload.
            handler: (files: File[]) => {
              const invalid = files.find(
                (file) => !ALLOWED_TYPES.includes(file.type) || file.size > MAX_FILE_BYTES,
              )
              if (invalid) {
                return `无法上传 ${invalid.name}：仅支持 JPEG / PNG / WebP / AVIF，且单个文件不超过 10 MB`
              }
              performUpload(files)
              return null
            },
          },
        }) as unknown as VditorInstance
        instanceRef.current = instance
      })
      .catch((error) => {
        console.error('[markdown-editor] Vditor 加载失败，已回退为纯文本模式', error)
        if (!disposed) setUnavailable(true)
      })

    return () => {
      disposed = true
      if (syncTimerRef.current) {
        window.clearTimeout(syncTimerRef.current)
        syncTimerRef.current = null
        // Flush keystrokes that were still inside the debounce window.
        setValueRef.current(latestRef.current)
      }
      instanceRef.current = null
      if (instance) {
        try {
          instance.destroy()
        } catch (error) {
          console.error('[markdown-editor] 销毁 Vditor 实例失败', error)
        }
      }
    }
    // `setValue`/`placeholder` are read through refs and props; the editor must
    // only be created once per mount (and recreated when the textarea fallback
    // takes over or gives way).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readOnly, unavailable])

  // External changes (document data arriving after mount, draft restore, form
  // reset) are pushed into the editor. Our own debounced writes are recognized
  // by `pushedRef` and skipped, so typing is never rolled back.
  useEffect(() => {
    const next = value ?? ''
    if (next === pushedRef.current) return
    latestRef.current = next
    const instance = instanceRef.current
    if (!instance) return
    if (instance.getValue() !== next) instance.setValue(next, true)
  }, [value])

  if (readOnly) {
    return (
      <div className={styles.wrap}>
        <p className={styles.label}>{label}</p>
        <pre className={styles.readOnly}>{value || '（空）'}</pre>
      </div>
    )
  }

  return (
    <div className={styles.wrap} data-error={showError || undefined}>
      <label className={styles.label} id={labelId} htmlFor={`${labelId}-field`}>{label}</label>
      {description ? <p className={styles.description}>{description}</p> : null}
      {unavailable ? (
        <textarea
          id={`${labelId}-field`}
          className={styles.fallback}
          value={value ?? ''}
          rows={18}
          spellCheck={false}
          onChange={(event) => setValue(event.target.value)}
        />
      ) : (
        <div className={styles.editor} id={`${labelId}-field`} ref={holderRef} aria-labelledby={labelId} />
      )}
      {unavailable ? (
        <p className={styles.hint}>可视化编辑器加载失败，已切换为纯文本模式——Markdown 仍可正常书写与保存。</p>
      ) : (
        <p className={styles.hint}>所见即所得书写；工具栏可上传图片到媒体库并自动插入，也可直接粘贴外链图片地址。</p>
      )}
      {showError && errorMessage ? <p className={styles.error}>{String(errorMessage)}</p> : null}
    </div>
  )
}

export default MarkdownEditorField
