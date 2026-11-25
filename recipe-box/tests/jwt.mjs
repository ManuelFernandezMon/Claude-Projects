const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url')
/** A token shaped like Supabase's (the mock only reads the user id from it). */
export const jwtFor = (sub, email) => `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub, email, role: 'authenticated', exp: 4102444800 })}.sig`
