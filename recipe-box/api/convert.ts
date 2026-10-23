import { handleConvert } from '../server/convertRecipe.js'
import { withCors } from '../server/shared.js'

const handler = withCors(handleConvert)

export default {
  fetch(request: Request): Promise<Response> {
    return handler(request)
  },
}
