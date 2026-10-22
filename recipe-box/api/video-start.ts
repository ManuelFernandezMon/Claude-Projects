import { handleVideoStart } from '../server/videoRecipe.js'

export default {
  fetch(request: Request): Promise<Response> {
    return handleVideoStart(request)
  },
}
