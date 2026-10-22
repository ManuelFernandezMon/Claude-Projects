import { handleExtract } from '../server/extractRecipe'

export default {
  fetch(request: Request): Promise<Response> {
    return handleExtract(request)
  },
}
