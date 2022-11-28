function toFixed(value, fractionDigits) {
  return parseFloat(Number(value).toFixed(fractionDigits))
}

export const pdfRect2viewRect = (rect, viewport) => {
  return [
    Math.round(rect[0] * viewport.width),
    Math.round(rect[1] * viewport.height),
    Math.round(rect[2] * viewport.width),
    Math.round(rect[3] * viewport.height)
  ]
}
export const pdfPoint2viewPoint = (point, viewport, offset) => {
  const x = Math.round(point.x * viewport.width) - (offset ? offset.x : 0)
  const y = Math.round(point.y * viewport.height) - (offset ? offset.y : 0)
  return {x, y}
}
export const pdfPath2viewPath = (path, viewport, offset) => {
  return path.reduce((acc, num, index, arr) => {
    if (index % 2 === 0) return acc
    const pdfPoint = {x: arr[index-1], y: num}
    const point = pdfPoint2viewPoint(pdfPoint, viewport, offset)
    acc.push(point)
    return acc
  }, [])
}

export const viewRect2pdfRect = (rect, viewport) => {
  const x = toFixed(rect[0] / viewport.width, 8)
  const y = toFixed(rect[1] / viewport.height, 8)
  const w = toFixed(rect[2] / viewport.width, 8)
  const h = toFixed(rect[3] / viewport.height, 8)
  return [x, y, w, h]
}
export const viewPoint2pdfPoint = (point, viewport) => {
  const x = toFixed((point.x) / viewport.width,8)
  const y = toFixed((point.y) / viewport.height,8)
  return {x, y}
}
export const viewPath2pdfPath = (path = [], viewport) => {
  return path.reduce((acc, point) => {
    const pdfPoint = viewPoint2pdfPoint(point, viewport)
    return acc.concat(pdfPoint.x, pdfPoint.y)
  }, [])
}

export const rgbaColor2pdf = (rgbaColor = 'rgba(0, 0, 0, 1)') => {
  const regexpPattern = /rgba\(\d+\s*,\d+\s*,\d+\s*,\d+\)/i
  const regexpResult = regexpPattern.exec(rgbaColor)
  return [0, 0, 0, 1]
}
export const pdfColor2rgba = (pdfColor = [0, 0, 0, 1]) => {
  const red = pdfColor[0] * 255
  const green = pdfColor[1] * 255
  const blue = pdfColor[2] * 255
  const opacity = pdfColor[3]
  return `rgba(${red}, ${green}, ${blue}, ${opacity})`
}

export const blob2base64 = async (blob) => {
  return new Promise((resolve, reject) => {
    try {
      const fileReader = new FileReader()
      fileReader.onload = () => {
        resolve(fileReader.result)
      }
      fileReader.onerror = reject
      fileReader.readAsDataURL(blob)
    } catch (e) {
      reject(e)
    }
  })
}



