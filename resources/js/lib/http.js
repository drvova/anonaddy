const isPlainObject = value => Object.prototype.toString.call(value) === '[object Object]'

const appendQueryParam = (searchParams, key, value) => {
  if (value === undefined) {
    return
  }

  if (value === null) {
    searchParams.append(key, '')
    return
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      appendQueryParam(searchParams, `${key}[${isPlainObject(item) || Array.isArray(item) ? index : ''}]`, item)
    })
    return
  }

  if (value instanceof Date) {
    searchParams.append(key, value.toISOString())
    return
  }

  if (isPlainObject(value)) {
    Object.entries(value).forEach(([nestedKey, nestedValue]) => {
      appendQueryParam(searchParams, `${key}[${nestedKey}]`, nestedValue)
    })
    return
  }

  searchParams.append(key, String(value))
}

const buildUrl = (url, params) => {
  if (!params || !Object.keys(params).length) {
    return new URL(url, window.location.href).toString()
  }

  const requestUrl = new URL(url, window.location.href)

  Object.entries(params).forEach(([key, value]) => {
    appendQueryParam(requestUrl.searchParams, key, value)
  })

  return requestUrl.toString()
}

const getCookie = name => {
  const match = document.cookie.match(new RegExp(`(^|;\\s*)${name}=([^;]*)`))

  return match ? decodeURIComponent(match[2]) : null
}

const parseHeaders = xhr => {
  const headers = {}

  xhr
    .getAllResponseHeaders()
    .trim()
    .split(/\r?\n/)
    .filter(Boolean)
    .forEach(header => {
      const separatorIndex = header.indexOf(':')

      if (separatorIndex === -1) {
        return
      }

      const key = header.slice(0, separatorIndex).trim().toLowerCase()
      const value = header.slice(separatorIndex + 1).trim()

      headers[key] = value
    })

  return headers
}

const parseBody = (text, headers, responseType = 'json') => {
  if (responseType === 'text') {
    return text
  }

  if (!text) {
    return text
  }

  const contentType = headers['content-type']?.toLowerCase() ?? ''

  if (contentType.includes('application/json') || contentType.includes('+json')) {
    return JSON.parse(text)
  }

  return text
}

const getMessage = (status, data, fallback = 'Request failed') => {
  if (typeof data === 'string' && data.length) {
    return data
  }

  if (data && typeof data.message === 'string' && data.message.length) {
    return data.message
  }

  if (status) {
    return `Request failed with status ${status}`
  }

  return fallback
}

const isUrlSameOrigin = url => {
  const requestUrl = new URL(url, window.location.href)

  return requestUrl.origin === window.location.origin
}

const prepareHeaders = ({ headers, url, withXSRFToken }) => {
  const requestHeaders = {
    Accept: 'application/json, text/plain, */*',
    'X-Requested-With': 'XMLHttpRequest',
    ...headers,
  }
  const lowerCaseHeaders = Object.keys(requestHeaders).reduce((normalized, key) => {
    normalized[key.toLowerCase()] = key
    return normalized
  }, {})

  if (
    !lowerCaseHeaders['x-xsrf-token'] &&
    (withXSRFToken === true || (withXSRFToken == null && isUrlSameOrigin(url)))
  ) {
    const xsrfToken = getCookie('XSRF-TOKEN')

    if (xsrfToken) {
      requestHeaders['X-XSRF-TOKEN'] = xsrfToken
    }
  }

  return requestHeaders
}

const prepareBody = (method, data, headers) => {
  if (data === undefined || data === null || ['GET', 'HEAD'].includes(method)) {
    return null
  }

  if (
    data instanceof FormData ||
    data instanceof URLSearchParams ||
    data instanceof Blob ||
    data instanceof ArrayBuffer
  ) {
    return data
  }

  if (typeof data === 'string') {
    return data
  }

  const hasContentTypeHeader = Object.keys(headers).some(key => key.toLowerCase() === 'content-type')

  if (!hasContentTypeHeader) {
    headers['Content-Type'] = 'application/json'
  }

  return JSON.stringify(data)
}

export class HttpError extends Error {
  constructor(
    message,
    { status = 0, data = null, headers = {}, url = null, cancelled = false, hasResponse = true } = {},
  ) {
    super(message)
    this.name = cancelled ? 'HttpCancelledError' : 'HttpError'
    this.status = status
    this.data = data
    this.headers = headers
    this.url = url
    this.cancelled = cancelled

    if (hasResponse) {
      this.response = {
        data: this.data,
        status: this.status,
        headers: this.headers,
      }
    }
  }
}

export const requestRaw = ({
  method = 'get',
  url,
  data,
  params,
  headers = {},
  withCredentials = false,
  withXSRFToken,
  signal,
  onUploadProgress,
  responseType = 'json',
} = {}) => {
  const requestMethod = method.toUpperCase()
  const requestUrl = buildUrl(url, params)
  const requestHeaders = prepareHeaders({ headers, url: requestUrl, withXSRFToken })
  const requestBody = prepareBody(requestMethod, data, requestHeaders)

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    const abortRequest = () => xhr.abort()
    const cleanup = () => signal?.removeEventListener('abort', abortRequest)
    const rejectError = error => {
      cleanup()
      reject(error)
    }

    xhr.open(requestMethod, requestUrl, true)
    xhr.withCredentials = withCredentials

    Object.entries(requestHeaders).forEach(([key, value]) => {
      if (requestBody instanceof FormData && key.toLowerCase() === 'content-type') {
        return
      }

      xhr.setRequestHeader(key, String(value))
    })

    if (onUploadProgress) {
      xhr.upload.onprogress = event => {
        const progress = event.lengthComputable ? event.loaded / event.total : undefined

        onUploadProgress({
          loaded: event.loaded,
          total: event.lengthComputable ? event.total : undefined,
          progress,
          percentage: progress ? Math.round(progress * 100) : 0,
        })
      }
    }

    if (signal) {
      if (signal.aborted) {
        rejectError(
          new HttpError('Request was cancelled', {
            url: requestUrl,
            cancelled: true,
            hasResponse: false,
          }),
        )
        return
      }

      signal.addEventListener('abort', abortRequest, { once: true })
    }

    xhr.onerror = () => {
      rejectError(new HttpError('Network error', { url: requestUrl, hasResponse: false }))
    }

    xhr.onabort = () => {
      rejectError(
        new HttpError('Request was cancelled', {
          url: requestUrl,
          cancelled: true,
          hasResponse: false,
        }),
      )
    }

    xhr.onload = () => {
      cleanup()

      const responseHeaders = parseHeaders(xhr)
      let responseData

      try {
        responseData = parseBody(xhr.responseText, responseHeaders, responseType)
      } catch {
        rejectError(
          new HttpError('Invalid JSON response', {
            status: xhr.status,
            data: xhr.responseText,
            headers: responseHeaders,
            url: requestUrl,
          }),
        )
        return
      }

      const response = {
        status: xhr.status,
        data: responseData,
        headers: responseHeaders,
      }

      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(response)
        return
      }

      reject(
        new HttpError(getMessage(xhr.status, responseData), {
          ...response,
          url: requestUrl,
        }),
      )
    }

    xhr.send(requestBody)
  })
}

const request = async config => {
  const response = await requestRaw(config)

  return response.data
}

const http = {
  request,
  get(url, options = {}) {
    return request({ ...options, method: 'get', url })
  },
  post(url, data, options = {}) {
    return request({ ...options, method: 'post', url, data })
  },
  put(url, data, options = {}) {
    return request({ ...options, method: 'put', url, data })
  },
  patch(url, data, options = {}) {
    return request({ ...options, method: 'patch', url, data })
  },
  delete(url, options = {}) {
    return request({ ...options, method: 'delete', url })
  },
}

export default http
