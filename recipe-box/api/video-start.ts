import { handleVideoStart } from '../server/videoRecipe.js'
import { withCors } from '../server/shared.js'

const handler = withCors(handleVideoStart)

export default {
  fetch(request: Request): Promise<Response> {
    return handler(request)
  },
}
