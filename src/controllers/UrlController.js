import Crypto from 'crypto'
import { redis } from '../utils/redis'

const BASE_URL = 'http://localhost:3000/'
const URL_HSET = 'url-hset'

function randomString() {
  return Crypto.randomBytes(32).toString('base64').slice(0, 5)
}

async function getOrGenUrl(path) {
  if (path) {
    const x = await redis.hexists(`${URL_HSET}:${path}`, 'origin')
    if (!x) return path
    throw Error('Exists')
  } else {
    let newPath
    do {
      newPath = randomString()
      /* eslint-disable */
    } while (!(await redis.hgetall(`${URL_HSET}:${newPath}`)))
    return newPath
  }
}

async function addUrl(req, res) {
  const { user } = req
  const { origin, path } = req.body
  let newPath
  try {
    newPath = await getOrGenUrl(path)
    await redis.hset(`${URL_HSET}:${newPath}`, 'user', user._id.toString(), 'origin', origin, 'clicked', 0)
  } catch (err) {
    if (err.message == 'Exists') return res.json({ error: { message: 'Path Exists.' } })
    console.log(err)
    return res.json({ error: { message: 'ERROR' } })
  }
  return res.json({ data: { origin, shortUrl: `${BASE_URL}${newPath}` } })
}

async function redirectUrl(req, res) {
  const { path } = req.params
  const url = await redis.hget(`${URL_HSET}:${path}`, 'origin')
  if (url) {
    await redis.hincrby(`${URL_HSET}:${path}`, 'clicked', 1)
    return res.redirect(url)
  }
  return res.sendStatus(404)
}

module.exports = {
  addUrl,
  redirectUrl,
}