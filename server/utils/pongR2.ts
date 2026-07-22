import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3'

let client: S3Client | null = null

function configValue(value: unknown, name: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw createError({
      statusCode: 503,
      message: `論文檔案服務尚未設定（缺少 ${name}）`,
    })
  }
  return value.trim()
}

export function getPongR2Config() {
  const config = useRuntimeConfig()
  return {
    endpoint: configValue(config.r2Endpoint, 'R2_ENDPOINT'),
    accessKeyId: configValue(config.r2AccessKey, 'R2_ACCESS_KEY'),
    secretAccessKey: configValue(config.r2SecretKey, 'R2_SECRET_KEY'),
    bucket: configValue(config.r2Bucket, 'R2_BUCKET'),
  }
}

export function getPongR2Client() {
  if (client) return client

  const config = getPongR2Config()
  client = new S3Client({
    region: 'auto',
    endpoint: config.endpoint,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  })
  return client
}

export async function getPongR2Object(key: string, range?: string) {
  const config = getPongR2Config()
  return getPongR2Client().send(new GetObjectCommand({
    Bucket: config.bucket,
    Key: key,
    ...(range ? { Range: range } : {}),
  }))
}
