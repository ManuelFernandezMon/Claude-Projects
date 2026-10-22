import { handleVideoExtract } from '../server/videoRecipe.js'

export default {
  fetch(request: Request): Promise<Response> {
    return handleVideoExtract(request)
  },
}
