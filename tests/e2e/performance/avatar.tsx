// Controlled browser rendering evidence; no credentials, Host or remote service.
import { createRoot } from 'react-dom/client'
import { AwikiAvatar, AwikiAvatarProvider } from '../../../src/client/AwikiAvatar.tsx'
import type { AwikiConversationId, AwikiDid } from '../../../src/types.ts'

const query = new URLSearchParams(location.search)
const images = query.get('mode') !== 'fallback'
const did = (value: string) => `did:benchmark:${value}` as AwikiDid
createRoot(document.getElementById('root')!).render(
  <AwikiAvatarProvider owner={`benchmark-${query.get('round')}`} profile={null}
    avatarDisplayProfiles={async dids => dids.map(value => ({ did: value, cacheHit: true,
      avatarUri: images ? `https://avatar-benchmark.invalid/${encodeURIComponent(value)}.jpg` : null }))}
    avatarGroup={async value => ({ groupDid: value, conversationId: value as unknown as AwikiConversationId,
      title: '四人群', memberCount: 4, avatarMembers: Array.from({ length: 4 }, (_, index) =>
        ({ memberKey: `${value}:${index}`, memberDid: did(`${value}:${index}`) })) })}>
    <main id="conversations" style={{ height: '90vh', overflowY: 'scroll', width: 420 }}>
      {Array.from({ length: 1000 }, (_, index) => <div key={index} style={{ height: 68, display: 'flex', alignItems: 'center', gap: 12 }}>
        <AwikiAvatar name={`会话 ${index}`} {...index % 5 === 0 ? { groupDid: did(`group:${index}`) } : { did: did(`peer:${index}`) }} />
        <span>会话 {index}<br /><small>同一数据集 · 头像滚动测量</small></span>
      </div>)}
    </main>
  </AwikiAvatarProvider>,
)
