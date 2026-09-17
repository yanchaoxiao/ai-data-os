import { FileText, Globe, Upload as UploadIcon, BookOpen } from 'lucide-react'
import type { KBArticle } from '../../lib/api'

const STATUS_STYLES: Record<string, string> = {
  published: 'bg-emerald-100 text-emerald-700 ring-emerald-200',
  pending: 'bg-amber-100 text-amber-700 ring-amber-200',
  ai_reviewed: 'bg-amber-100 text-amber-700 ring-amber-200',
  rejected: 'bg-red-100 text-red-600 ring-red-200',
  community: 'bg-gray-100 text-gray-600 ring-gray-200',
}

const STATUS_LABELS: Record<string, string> = {
  published: '已发布',
  pending: '审核中',
  ai_reviewed: '待审核',
  rejected: '已拒绝',
  community: '社区',
}

const SOURCE_ICONS: Record<string, React.ReactNode> = {
  markdown: <BookOpen size={13} />,
  file: <FileText size={13} />,
  url: <Globe size={13} />,
  upload: <UploadIcon size={13} />,
}

interface ArticleCardProps {
  article: KBArticle
  categoryName?: string
  onClick: () => void
}

export default function ArticleCard({ article, categoryName, onClick }: ArticleCardProps) {
  const statusCls = STATUS_STYLES[article.status] ?? STATUS_STYLES.community
  const statusLabel = STATUS_LABELS[article.status] ?? article.status
  const sourceIcon = SOURCE_ICONS[article.source_type] ?? <FileText size={13} />
  const excerpt = article.content
    ? article.content.replace(/[#*`\[\]\n]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 90)
    : ''

  return (
    <button
      onClick={onClick}
      className="group w-full text-left p-4 rounded-xl border border-gray-100 bg-white hover:shadow-md hover:border-teal-200 transition-all"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-teal-500">{sourceIcon}</span>
            <h3 className="text-sm font-semibold text-gray-800 line-clamp-1 group-hover:text-teal-700 transition-colors">
              {article.title}
            </h3>
          </div>
          {excerpt && (
            <p className="text-xs text-gray-400 line-clamp-2 mb-2 leading-relaxed">
              {excerpt}
            </p>
          )}
          <div className="flex items-center gap-2 text-[11px] text-gray-400">
            {categoryName && (
              <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-medium">
                {categoryName}
              </span>
            )}
            <span className="capitalize">{article.source_type}</span>
            <span>{'\u00b7'}</span>
            <span>{new Date(article.updated_at).toLocaleDateString('zh-CN')}</span>
          </div>
        </div>
        <span className={`shrink-0 text-[11px] px-2 py-0.5 rounded-full font-medium ring-1 ${statusCls}`}>
          {statusLabel}
        </span>
      </div>
    </button>
  )
}
