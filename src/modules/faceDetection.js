let faceapi = null
let modelsLoaded = false

async function getFaceApi() {
  if (!faceapi) faceapi = await import('face-api.js')
  return faceapi
}

export async function loadModels() {
  if (modelsLoaded) return
  const api = await getFaceApi()
  await Promise.all([
    api.nets.tinyFaceDetector.loadFromUri('/models'),
    api.nets.faceExpressionNet.loadFromUri('/models'),
  ])
  modelsLoaded = true
}

// Maps face-api expression labels → app mood IDs
function mapExpressionToMood(expressions) {
  const [topExpr, topConf] = Object.entries(expressions).sort((a, b) => b[1] - a[1])[0]

  const moodId =
    topExpr === 'happy'     && topConf > 0.7 ? 'ecstatic'
    : topExpr === 'happy'                    ? 'happy'
    : topExpr === 'neutral'                  ? 'calm'
    : topExpr === 'surprised'                ? 'ecstatic'
    : topExpr === 'sad'                      ? 'sad'
    : topExpr === 'fearful'                  ? 'anxious'
    : topExpr === 'angry'   && topConf > 0.6 ? 'angry'
    : topExpr === 'angry'                    ? 'frustrated'
    : topExpr === 'disgusted'                ? 'frustrated'
    : 'calm'

  return { moodId, confidence: topConf, expression: topExpr, expressions }
}

export async function detectMood(videoEl) {
  if (!videoEl || videoEl.readyState < 2) return null
  const api = await getFaceApi()
  const detection = await api
    .detectSingleFace(videoEl, new api.TinyFaceDetectorOptions())
    .withFaceExpressions()
  if (!detection) return null
  return mapExpressionToMood(detection.expressions)
}
