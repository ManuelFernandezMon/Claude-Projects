import { handleGenerate } from '../server/generateRecipe.js'

export default {
  fetch(request: Request): Promise<Response> {
    return handleGenerate(request)
  },
}
