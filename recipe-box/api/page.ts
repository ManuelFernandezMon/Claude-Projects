import { handlePageText } from '../server/pageText.js'
import { withCors } from '../server/shared.js'

const handler = withCors(handlePageText)

export default {
  fetch(request: Request): Promise<Response> {
    return handler(request)
  },
}
