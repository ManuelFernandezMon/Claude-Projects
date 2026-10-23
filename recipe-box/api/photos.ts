import { handlePhotoSearch } from '../server/photoSearch.js'
import { withCors } from '../server/shared.js'

const handler = withCors(handlePhotoSearch)

export default {
  fetch(request: Request): Promise<Response> {
    return handler(request)
  },
}
