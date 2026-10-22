import { handleVideoFind } from '../server/videoRecipe.js'

export default {
  fetch(request: Request): Promise<Response> {
    return handleVideoFind(request)
  },
}
