import type { PayloadComponent } from '../../../config/types.js'

export function parsePayloadComponent(PayloadComponent: PayloadComponent): {
  exportName: string
  path: string
} {
  if (!PayloadComponent) {
    return null!
  }

  const pathAndMaybeExport =
    typeof PayloadComponent === 'string' ? PayloadComponent : PayloadComponent.path

  let path: string | undefined = ''
  let exportName: string | undefined = 'default'

  if (pathAndMaybeExport?.includes('#')) {
    ;[path, exportName] = pathAndMaybeExport.split('#')
  } else {
    path = pathAndMaybeExport
  }

  if (typeof PayloadComponent === 'object' && PayloadComponent.exportName) {
    exportName = PayloadComponent.exportName
  }

  return { exportName: exportName!, path: path! }
}
