import { handleVideoChunk } from '../server/videoRecipe.js'

export default {
  fetch(request: Request): Promise<Response> {
    return handleVideoChunk(request)
  },
}
