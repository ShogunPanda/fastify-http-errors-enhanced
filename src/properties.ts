import { GenericObject, NodeError } from './interfaces'

const processRoot = process.cwd()

export function addAdditionalProperties(target: GenericObject, source: GenericObject): void {
  for (const v in source) {
    if (v === 'status' || v === 'statusCode' || v === 'expose' || v === 'headers') {
      continue
    }

    target[v] = source[v]
  }
}

export function serializeError(error: Error): GenericObject {
  const serialized: GenericObject = {
    message: `[${(error as NodeError).code ?? error.name}] ${error.message}`,
    stack: (error.stack ?? '')
      .split('\n')
      .slice(1)
      .map((s: string) => s.trim().replace(/^at /, '').replace(processRoot, '$ROOT'))
  }

  addAdditionalProperties(serialized, error)
  serialized.code = undefined

  return serialized
}
