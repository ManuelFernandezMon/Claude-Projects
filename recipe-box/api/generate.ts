import { handleGenerate } from '../server/generateRecipe'

export default {
  fetch(request: Request): Promise<Response> {
    return handleGenerate(request)
  },
}
