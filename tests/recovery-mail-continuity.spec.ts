import { afterEach, describe, expect, it } from 'vitest'
import type { Context } from '@deepseek-ai/cordis'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type {
  AwikiDid,
  AwikiMailAuthStatusClass,
  AwikiMailClosedClassification,
  AwikiMailIngressClassification,
} from '../src/types.ts'
import { AWIKI_CLEAR_LOCAL_DATA_CONFIRMATION, AWIKI_LOGOUT_CONFIRMATION } from '../src/types.ts'
import { failedMailRecoveryObservability } from '../src/mail-recovery-observability.ts'
import { MAIL_ACCOUNT, setup } from './harness.ts'

let context: Context | undefined

afterEach(async () => {
  await context?.fiber.dispose()
  context = undefined
})

describe('AWiki applied identity recovery Mail continuity', () => {
  it('restores the historical mailbox on first use', async () => {
    const harness = await setup()
    context = harness.ctx

    const result = await harness.ctx.awiki.activateRecovery({ operationId: 'recovery-1' })

    expect(result).toMatchObject({
      ok: true,
      value: {
        phase: 'applied',
        mailRecoveryObservability: {
          current_principal_matches_recovery: true,
          request_generation_classification: 'current',
          mail_ingress_classification: 'reached',
          auth_status_class: 'accepted',
          retryable: false,
          mail_closed_classification: 'success',
        },
      },
    })
    expect(harness.client.mailAccountCalls).toBe(1)
  })

  it('preserves every closed Mail/auth classification and retryability without copying service rules', async () => {
    const harness = await setup()
    context = harness.ctx
    const cases: readonly {
      closed: Exclude<AwikiMailClosedClassification, 'success' | 'unknown'>
      ingress: AwikiMailIngressClassification
      auth: AwikiMailAuthStatusClass
      code?: string
      retryable: boolean
    }[] = [
      {
        closed: 'authentication_rejected', ingress: 'reached', auth: 'rejected',
        code: 'device.auth_generation_stale', retryable: false,
      },
      {
        closed: 'dependency_unavailable', ingress: 'reached', auth: 'dependency_unavailable',
        code: 'authentication.dependency_unavailable', retryable: true,
      },
      { closed: 'no_active_handle', ingress: 'reached', auth: 'accepted', retryable: false },
      { closed: 'multiple_active_handles', ingress: 'reached', auth: 'accepted', retryable: false },
      { closed: 'no_mailbox', ingress: 'reached', auth: 'accepted', retryable: false },
      { closed: 'owner_conflict', ingress: 'reached', auth: 'accepted', retryable: false },
    ]

    for (const candidate of cases) {
      harness.client.getMailAccount = () => Promise.reject(Object.assign(
        new Error('private DID mailbox token body must not escape'),
        {
          mail_ingress_classification: candidate.ingress,
          auth_status_class: candidate.auth,
          ...candidate.code === undefined ? {} : { auth_stable_machine_code: candidate.code },
          retryable: candidate.retryable,
          mail_closed_classification: candidate.closed,
          did: 'did:wba:private.example:secret',
          mailbox_id: 'private-mailbox-id',
          raw_error_body: 'Bearer private-token MIME private-body',
        },
      ))

      const result = await harness.ctx.awiki.activateRecovery({ operationId: 'recovery-1' })

      expect(result).toMatchObject({
        ok: true,
        value: {
          phase: 'applied',
          mailRecoveryObservability: {
            current_principal_matches_recovery: true,
            request_generation_classification: 'current',
            mail_ingress_classification: candidate.ingress,
            auth_status_class: candidate.auth,
            retryable: candidate.retryable,
            mail_closed_classification: candidate.closed,
            ...candidate.code === undefined ? {} : { auth_stable_machine_code: candidate.code },
          },
        },
      })
      expect(JSON.stringify(result)).not.toMatch(/private|did:wba|mailbox-id|Bearer|MIME/u)
    }
  })

  it('fails an unknown error closed while keeping the applied Human recovery active', async () => {
    const harness = await setup()
    context = harness.ctx
    harness.client.getMailAccount = () => Promise.reject(Object.assign(
      new Error('private mail failure token=secret'),
      {
        mail_ingress_classification: 'unknown',
        auth_status_class: 'unknown',
        retryable: true,
        auth_stable_machine_code: 'private secret body',
        mail_closed_classification: 'unknown',
        raw_error_body: 'MIME private-body',
      },
    ))

    const result = await harness.ctx.awiki.activateRecovery({ operationId: 'recovery-1' })

    expect(result).toMatchObject({
      ok: true,
      value: {
        phase: 'applied',
        mailRecoveryObservability: {
          current_principal_matches_recovery: true,
          request_generation_classification: 'current',
          mail_ingress_classification: 'unknown',
          auth_status_class: 'unknown',
          retryable: false,
          mail_closed_classification: 'unknown',
        },
      },
    })
    expect(JSON.stringify(result)).not.toMatch(/private|secret|MIME/u)
    await expect(harness.ctx.awiki.getSession()).resolves.toMatchObject({
      ok: true,
      value: { status: 'active' },
    })
  })

  it('fails contradictory tuples and present hostile machine codes closed as a whole', () => {
    const base = {
      mail_ingress_classification: 'reached',
      auth_status_class: 'rejected',
      retryable: true,
      mail_closed_classification: 'authentication_rejected',
    }
    const contradictoryOrMalformed: unknown[] = [
      { ...base, auth_status_class: 'accepted' },
      { ...base, mail_closed_classification: 'dependency_unavailable' },
      {
        ...base,
        mail_ingress_classification: 'not_reached',
        auth_status_class: 'accepted',
        mail_closed_classification: 'owner_conflict',
      },
      { ...base, auth_stable_machine_code: 'PRIVATE TOKEN BODY' },
      { ...base, auth_stable_machine_code: 'a'.repeat(129) },
      { ...base, auth_stable_machine_code: 42 },
    ]
    const throwingCode = { ...base }
    Object.defineProperty(throwingCode, 'auth_stable_machine_code', {
      get() { throw new Error('private token getter') },
    })
    contradictoryOrMalformed.push(throwingCode)

    for (const error of contradictoryOrMalformed) {
      expect(failedMailRecoveryObservability(error)).toEqual({
        current_principal_matches_recovery: true,
        request_generation_classification: 'current',
        mail_ingress_classification: 'unknown',
        auth_status_class: 'unknown',
        retryable: false,
        mail_closed_classification: 'unknown',
      })
    }
  })

  it('does not call Mail or publish a session for a principal mismatch', async () => {
    const harness = await setup()
    context = harness.ctx
    harness.client.recoveryProgress = {
      ...harness.client.recoveryProgress,
      currentDid: 'did:wba:other.example:recovered' as AwikiDid,
    }
    const sessions: unknown[] = []
    harness.ctx.on('awiki/session', session => { sessions.push(session) })

    await expect(harness.ctx.awiki.activateRecovery({ operationId: 'recovery-1' })).resolves.toEqual({
      ok: false,
      error: {
        code: 'remote',
        message: 'The AWiki service rejected the operation.',
        mailRecoveryObservability: {
          current_principal_matches_recovery: false,
          request_generation_classification: 'current',
          mail_ingress_classification: 'not_reached',
          auth_status_class: 'unknown',
          retryable: false,
          mail_closed_classification: 'unknown',
        },
      },
    })
    expect(harness.client.mailAccountCalls).toBe(0)
    expect(sessions).toEqual([])
  })

  it('drops a late Mail completion after provider generation replacement', async () => {
    const harness = await setup()
    context = harness.ctx
    let releaseMail!: () => void
    let markStarted!: () => void
    const started = new Promise<void>((resolve) => { markStarted = resolve })
    const pending = new Promise<void>((resolve) => { releaseMail = resolve })
    harness.client.getMailAccount = async () => {
      markStarted()
      await pending
      return MAIL_ACCOUNT
    }
    const sessions: unknown[] = []
    harness.ctx.on('awiki/session', session => { sessions.push(session) })

    const activation = harness.ctx.awiki.activateRecovery({ operationId: 'recovery-1' })
    await started
    await harness.providerFiber.dispose()
    releaseMail()

    await expect(activation).resolves.toEqual({
      ok: false,
      error: {
        code: 'remote',
        message: 'The AWiki service rejected the operation.',
        mailRecoveryObservability: {
          current_principal_matches_recovery: true,
          request_generation_classification: 'replaced',
          mail_ingress_classification: 'unknown',
          auth_status_class: 'unknown',
          retryable: false,
          mail_closed_classification: 'unknown',
        },
      },
    })
    expect(sessions).toEqual([])
  })

  it('fences a pending Mail completion as soon as sign-out is requested', async () => {
    const harness = await setup()
    context = harness.ctx
    let releaseMail!: () => void
    let markStarted!: () => void
    const started = new Promise<void>((resolve) => { markStarted = resolve })
    const pending = new Promise<void>((resolve) => { releaseMail = resolve })
    harness.client.getMailAccount = async () => {
      markStarted()
      await pending
      return MAIL_ACCOUNT
    }
    const sessions: unknown[] = []
    harness.ctx.on('awiki/session', session => { sessions.push(session) })

    const activation = harness.ctx.awiki.activateRecovery({ operationId: 'recovery-1' })
    await started
    const signOut = harness.ctx.awiki.logout({ confirmation: AWIKI_LOGOUT_CONFIRMATION })
    releaseMail()

    await expect(activation).resolves.toMatchObject({
      ok: false,
      error: {
        mailRecoveryObservability: {
          current_principal_matches_recovery: true,
          request_generation_classification: 'replaced',
          mail_ingress_classification: 'unknown',
          auth_status_class: 'unknown',
          retryable: false,
          mail_closed_classification: 'unknown',
        },
      },
    })
    await expect(signOut).resolves.toMatchObject({ ok: true, value: { status: 'signed-out' } })
    expect(sessions).toEqual([{ status: 'signed-out' }])
    expect(JSON.stringify({ activation: await activation, sessions })).not.toMatch(/mailbox|Bearer|MIME|token=/u)
    await expect(harness.ctx.awiki.getSession()).resolves.toMatchObject({
      ok: true,
      value: { status: 'signed-out' },
    })
  })

  it('fences sign-out requested while the recovered identity lookup is pending', async () => {
    const harness = await setup()
    context = harness.ctx
    const originalGetIdentity = harness.client.getIdentity.bind(harness.client)
    let identityCalls = 0
    let releaseIdentity!: () => void
    let markStarted!: () => void
    const started = new Promise<void>((resolve) => { markStarted = resolve })
    const pending = new Promise<void>((resolve) => { releaseIdentity = resolve })
    harness.client.getIdentity = async () => {
      identityCalls += 1
      if (identityCalls === 1) {
        markStarted()
        await pending
      }
      return originalGetIdentity()
    }
    const sessions: unknown[] = []
    harness.ctx.on('awiki/session', session => { sessions.push(session) })

    const activation = harness.ctx.awiki.activateRecovery({ operationId: 'recovery-1' })
    await started
    const signOut = harness.ctx.awiki.logout({ confirmation: AWIKI_LOGOUT_CONFIRMATION })
    releaseIdentity()

    await expect(activation).resolves.toMatchObject({
      ok: false,
      error: {
        mailRecoveryObservability: {
          current_principal_matches_recovery: true,
          request_generation_classification: 'replaced',
          retryable: false,
        },
      },
    })
    await expect(signOut).resolves.toMatchObject({ ok: true, value: { status: 'signed-out' } })
    expect(harness.client.mailAccountCalls).toBe(0)
    expect(sessions).toEqual([{ status: 'signed-out' }])
  })

  it('fences a queued Recovery callback when sign-out is requested before it enters', async () => {
    const harness = await setup()
    context = harness.ctx
    const originalActivate = harness.client.activateRecovery.bind(harness.client)
    const originalGetIdentity = harness.client.getIdentity.bind(harness.client)
    let activationCalls = 0
    let releaseIdentity!: () => void
    let markIdentityStarted!: () => void
    let markSecondCoreStarted!: () => void
    const identityStarted = new Promise<void>((resolve) => { markIdentityStarted = resolve })
    const secondCoreStarted = new Promise<void>((resolve) => { markSecondCoreStarted = resolve })
    const pendingIdentity = new Promise<void>((resolve) => { releaseIdentity = resolve })
    harness.client.activateRecovery = (request) => {
      activationCalls += 1
      if (activationCalls === 2) markSecondCoreStarted()
      return originalActivate(request)
    }
    let identityCalls = 0
    harness.client.getIdentity = async () => {
      identityCalls += 1
      if (identityCalls === 1) {
        markIdentityStarted()
        await pendingIdentity
      }
      return originalGetIdentity()
    }
    const sessions: unknown[] = []
    harness.ctx.on('awiki/session', session => { sessions.push(session) })

    const occupying = harness.ctx.awiki.activateRecovery({ operationId: 'recovery-1' })
    await identityStarted
    const queued = harness.ctx.awiki.activateRecovery({ operationId: 'recovery-1' })
    await secondCoreStarted
    await Promise.resolve()
    const signOut = harness.ctx.awiki.logout({ confirmation: AWIKI_LOGOUT_CONFIRMATION })
    releaseIdentity()

    await expect(occupying).resolves.toMatchObject({
      ok: false,
      error: { mailRecoveryObservability: { request_generation_classification: 'replaced', retryable: false } },
    })
    await expect(queued).resolves.toMatchObject({
      ok: false,
      error: { mailRecoveryObservability: { request_generation_classification: 'replaced', retryable: false } },
    })
    await expect(signOut).resolves.toMatchObject({ ok: true, value: { status: 'signed-out' } })
    expect(harness.client.mailAccountCalls).toBe(0)
    expect(sessions).toEqual([{ status: 'signed-out' }])
  })

  it('fences a pending Mail completion before Clear Local Data runs', async () => {
    const harness = await setup()
    context = harness.ctx
    let releaseMail!: () => void
    let markStarted!: () => void
    const started = new Promise<void>((resolve) => { markStarted = resolve })
    const pending = new Promise<void>((resolve) => { releaseMail = resolve })
    harness.client.getMailAccount = async () => {
      markStarted()
      await pending
      return MAIL_ACCOUNT
    }
    const sessions: unknown[] = []
    harness.ctx.on('awiki/session', session => { sessions.push(session) })

    const activation = harness.ctx.awiki.activateRecovery({ operationId: 'recovery-1' })
    await started
    const clear = harness.ctx.awiki.clearLocalData({ confirmation: AWIKI_CLEAR_LOCAL_DATA_CONFIRMATION })
    releaseMail()

    await expect(activation).resolves.toMatchObject({
      ok: false,
      error: {
        mailRecoveryObservability: {
          current_principal_matches_recovery: true,
          request_generation_classification: 'replaced',
          mail_ingress_classification: 'unknown',
          auth_status_class: 'unknown',
          retryable: false,
          mail_closed_classification: 'unknown',
        },
      },
    })
    await expect(clear).resolves.toEqual({ ok: true, value: { cleared: true } })
    expect(sessions).toEqual([{ status: 'unregistered' }])
    expect(harness.client.localDataCleared).toBe(1)
    expect(JSON.stringify({ activation: await activation, sessions })).not.toMatch(/mailbox|Bearer|MIME|token=/u)
  })

  it('fences Clear Local Data requested while the recovered identity lookup is pending', async () => {
    const harness = await setup()
    context = harness.ctx
    const originalGetIdentity = harness.client.getIdentity.bind(harness.client)
    let releaseIdentity!: () => void
    let markStarted!: () => void
    const started = new Promise<void>((resolve) => { markStarted = resolve })
    const pending = new Promise<void>((resolve) => { releaseIdentity = resolve })
    harness.client.getIdentity = async () => {
      markStarted()
      await pending
      return originalGetIdentity()
    }
    const sessions: unknown[] = []
    harness.ctx.on('awiki/session', session => { sessions.push(session) })

    const activation = harness.ctx.awiki.activateRecovery({ operationId: 'recovery-1' })
    await started
    const clear = harness.ctx.awiki.clearLocalData({ confirmation: AWIKI_CLEAR_LOCAL_DATA_CONFIRMATION })
    releaseIdentity()

    await expect(activation).resolves.toMatchObject({
      ok: false,
      error: {
        mailRecoveryObservability: {
          current_principal_matches_recovery: true,
          request_generation_classification: 'replaced',
          retryable: false,
        },
      },
    })
    await expect(clear).resolves.toEqual({ ok: true, value: { cleared: true } })
    expect(harness.client.mailAccountCalls).toBe(0)
    expect(sessions).toEqual([{ status: 'unregistered' }])
  })

  it('fences a queued Recovery callback when Clear Local Data is requested before it enters', async () => {
    const harness = await setup()
    context = harness.ctx
    const originalActivate = harness.client.activateRecovery.bind(harness.client)
    const originalGetIdentity = harness.client.getIdentity.bind(harness.client)
    let activationCalls = 0
    let releaseIdentity!: () => void
    let markIdentityStarted!: () => void
    let markSecondCoreStarted!: () => void
    const identityStarted = new Promise<void>((resolve) => { markIdentityStarted = resolve })
    const secondCoreStarted = new Promise<void>((resolve) => { markSecondCoreStarted = resolve })
    const pendingIdentity = new Promise<void>((resolve) => { releaseIdentity = resolve })
    harness.client.activateRecovery = (request) => {
      activationCalls += 1
      if (activationCalls === 2) markSecondCoreStarted()
      return originalActivate(request)
    }
    harness.client.getIdentity = async () => {
      markIdentityStarted()
      await pendingIdentity
      return originalGetIdentity()
    }
    const sessions: unknown[] = []
    harness.ctx.on('awiki/session', session => { sessions.push(session) })

    const occupying = harness.ctx.awiki.activateRecovery({ operationId: 'recovery-1' })
    await identityStarted
    const queued = harness.ctx.awiki.activateRecovery({ operationId: 'recovery-1' })
    await secondCoreStarted
    await Promise.resolve()
    const clear = harness.ctx.awiki.clearLocalData({ confirmation: AWIKI_CLEAR_LOCAL_DATA_CONFIRMATION })
    releaseIdentity()

    await expect(occupying).resolves.toMatchObject({
      ok: false,
      error: { mailRecoveryObservability: { request_generation_classification: 'replaced', retryable: false } },
    })
    await expect(queued).resolves.toMatchObject({
      ok: false,
      error: { mailRecoveryObservability: { request_generation_classification: 'replaced', retryable: false } },
    })
    await expect(clear).resolves.toEqual({ ok: true, value: { cleared: true } })
    expect(harness.client.mailAccountCalls).toBe(0)
    expect(sessions).toEqual([{ status: 'unregistered' }])
  })

  it('drops a pending Mail completion when the Host service unloads', async () => {
    const harness = await setup()
    context = harness.ctx
    let releaseMail!: () => void
    let markStarted!: () => void
    const started = new Promise<void>((resolve) => { markStarted = resolve })
    const pending = new Promise<void>((resolve) => { releaseMail = resolve })
    harness.client.getMailAccount = async () => {
      markStarted()
      await pending
      return MAIL_ACCOUNT
    }
    const sessions: unknown[] = []
    harness.ctx.on('awiki/session', session => { sessions.push(session) })

    const activation = harness.ctx.awiki.activateRecovery({ operationId: 'recovery-1' })
    await started
    await harness.serviceFiber.dispose()
    releaseMail()

    await expect(activation).resolves.toMatchObject({
      ok: false,
      error: { mailRecoveryObservability: { request_generation_classification: 'replaced', retryable: false } },
    })
    expect(sessions).toEqual([])
    expect(JSON.stringify(await activation)).not.toMatch(/mailbox|Bearer|MIME|token=/u)
  })

  it('does not persist a receipt and makes a fresh Mail first-use request after restart', async () => {
    const stateRoot = await mkdtemp(join(tmpdir(), 'dsh-awiki-mail-restart-'))
    try {
      const first = await setup({ stateRoot })
      context = first.ctx
      first.client.getMailAccount = () => Promise.reject(Object.assign(
        new Error('private mailbox body'),
        {
          mail_ingress_classification: 'reached',
          auth_status_class: 'rejected',
          auth_stable_machine_code: 'device.auth_generation_stale',
          retryable: false,
          mail_closed_classification: 'authentication_rejected',
          raw_error_body: 'Bearer private-token MIME private-body',
        },
      ))
      await expect(first.ctx.awiki.activateRecovery({ operationId: 'recovery-1' })).resolves.toMatchObject({
        ok: true,
        value: { mailRecoveryObservability: { mail_closed_classification: 'authentication_rejected' } },
      })
      await first.ctx.fiber.dispose()
      context = undefined

      const restarted = await setup({ stateRoot })
      context = restarted.ctx
      restarted.client.recoveryProgress = { ...restarted.client.recoveryProgress, phase: 'applied' }

      const result = await restarted.ctx.awiki.getRecoveryStatus({ operationId: 'recovery-1' })

      expect(restarted.client.mailAccountCalls).toBe(1)
      expect(result).toMatchObject({
        ok: true,
        value: {
          mailRecoveryObservability: {
            current_principal_matches_recovery: true,
            request_generation_classification: 'current',
            mail_ingress_classification: 'reached',
            auth_status_class: 'accepted',
            retryable: false,
            mail_closed_classification: 'success',
          },
        },
      })
      expect(JSON.stringify(result)).not.toMatch(/auth_generation_stale|mailbox|Bearer|MIME|private/u)
    } finally {
      await context?.fiber.dispose()
      context = undefined
      await rm(stateRoot, { recursive: true, force: true })
    }
  })
})
