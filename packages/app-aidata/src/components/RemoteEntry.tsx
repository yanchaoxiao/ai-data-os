'use client'
/* eslint-disable @typescript-eslint/no-var-requires */

import { useEffect, useState } from 'react'
import ChatPage from '../app/page'

export default function RemoteEntry() {
  const [path, setPath] = useState<string | null>(null)

  useEffect(() => {
    setPath(window.location.pathname)
  }, [])

  if (path === null) return null

  if (path.startsWith('/aidata/registry')) {
    const RegistryPage = require('../app/registry/page').default
    return <RegistryPage />
  }
  if (path.startsWith('/aidata/dashboard')) {
    const DashboardPage = require('../app/dashboard/page').default
    return <DashboardPage />
  }
  if (path.startsWith('/aidata/evolution')) {
    const EvolutionPage = require('../app/evolution/page').default
    return <EvolutionPage />
  }
  if (path.startsWith('/aidata/attribution')) {
    const AttributionPage = require('../app/attribution/page').default
    return <AttributionPage />
  }
  if (path.startsWith('/aidata/knowledge/article/')) {
    const ArticlePage = require('../app/knowledge/article/[id]/page').default
    return <ArticlePage />
  }
  if (path.startsWith('/aidata/knowledge/editor')) {
    const EditorPage = require('../app/knowledge/editor/page').default
    return <EditorPage />
  }
  if (path.startsWith('/aidata/knowledge')) {
    const KnowledgePage = require('../app/knowledge/page').default
    return <KnowledgePage />
  }

  return <ChatPage />
}
