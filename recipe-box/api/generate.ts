import { handleGenerate } from '../server/generateRecipe.js'
import { withCors } from '../server/shared.js'

const handler = withCors(handleGenerate)

export default {
  fetch(request: Request): Promise<Response> {
    return handler(request)
  },
}
