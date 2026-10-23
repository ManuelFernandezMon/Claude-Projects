import { handleExtract } from '../server/extractRecipe.js'
import { withCors } from '../server/shared.js'

const handler = withCors(handleExtract)

export default {
  fetch(request: Request): Promise<Response> {
    return handler(request)
  },
}
