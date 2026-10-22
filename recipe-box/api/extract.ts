import { handleExtract } from '../server/extractRecipe.js'

export default {
  fetch(request: Request): Promise<Response> {
    return handleExtract(request)
  },
}
