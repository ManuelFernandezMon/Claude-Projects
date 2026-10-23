import { handleVideoExtract } from '../server/videoRecipe.js'
import { withCors } from '../server/shared.js'

const handler = withCors(handleVideoExtract)

export default {
  fetch(request: Request): Promise<Response> {
    return handler(request)
  },
}
