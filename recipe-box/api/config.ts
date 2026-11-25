import { handleCloudConfig } from '../server/cloudConfig.js'
import { withCors } from '../server/shared.js'

const handler = withCors(handleCloudConfig)

export default {
  fetch(request: Request): Promise<Response> {
    return handler(request)
  },
}
