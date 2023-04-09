import {rest} from 'msw'
import {setupServer} from 'msw/node'
import {deletePackageVersion, deletePackageVersions} from './delete-version'
import * as assert from 'node:assert'

describe('delete tests - mock rest', () => {
  let server = setupServer()

  before(() => {
    server = setupServer()
    server.listen()
  })

  after(() => {
    server.close()
  })

  it('deletePackageVersion', async () => {
    server.use(
      rest.delete(
        'https://api.github.com/users/test-owner/packages/npm/test-package/versions/123',
        async (req, res, ctx) => {
          return res(ctx.status(204))
        }
      )
    )

    const result = await deletePackageVersion(
      123,
      'test-owner',
      'test-package',
      'npm',
      'test-token'
    )
    assert.ok(result)
  })

  it('deletePackageVersions', async () => {
    server.use(
      rest.delete(
        'https://api.github.com/users/test-owner/packages/npm/test-package/versions/*',
        async (req, res, ctx) => {
          return res(ctx.status(204))
        }
      )
    )

    const result = await deletePackageVersions(
      [123, 456, 789],
      'test-owner',
      'test-package',
      'npm',
      'test-token'
    )

    assert.strictEqual(result, true)
  })

  it('deletePackageVersions - GHES', async () => {
    process.env.GITHUB_API_URL = 'https://github.someghesinstance.com/api/v3'

    server.use(
      rest.delete(
        'https://github.someghesinstance.com/api/v3/users/test-owner/packages/npm/test-package/versions/*',
        async (req, res, ctx) => {
          return res(ctx.status(204))
        }
      )
    )

    const result = await deletePackageVersions(
      [123, 456, 789],
      'test-owner',
      'test-package',
      'npm',
      'test-token'
    )
    assert.strictEqual(result, true)

    delete process.env.GITHUB_API_URL
  })

  it('deletePackageVersion - API error', async () => {
    server.use(
      rest.delete(
        'https://api.github.com/users/test-owner/packages/npm/test-package/versions/123',
        async (req, res, ctx) => {
          return res(ctx.status(500))
        }
      )
    )

    try {
      await deletePackageVersion(
        123,
        'test-owner',
        'test-package',
        'npm',
        'test-token'
      )
      throw new Error('should not get here.')
    } catch (err) {
      assert.strictEqual((err as any).name, 'HttpError')
      assert.strictEqual((err as any).status, 500)
    }
  })

  it('deletePackageVersions - API error for some versions', async () => {
    server.use(
      rest.delete(
        'https://api.github.com/users/test-owner/packages/npm/test-package/versions/:versionId',
        async (req, res, ctx) => {
          if (req.params.versionId === '456') {
            return res(ctx.status(500))
          }
          return res(ctx.status(204))
        }
      )
    )

    try {
      await deletePackageVersions(
        [123, 456, 789],
        'test-owner',
        'test-package',
        'npm',
        'test-token'
      )
      throw new Error('Must failed!')
    } catch (error) {
      assert.ok((error as Error).message.includes('delete version API failed'))
    }
  })
})
