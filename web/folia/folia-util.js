export const pdfRect2viewRect = (rect, viewport) => {
  return [
    (rect[0] * viewport.width), (rect[1] * viewport.height),
    (rect[2] * viewport.width), (rect[3] * viewport.height)
  ]
}

export const pdfPoint2viewPoint = (point, viewport) => {
  const x = point[0] * viewport.width
  const y = point[1] * viewport.height
  return [x, y]
}

export const pdfPath2viewPath = (path, viewport) => {
  const viewPath = []
  for (const point of path) {
    viewPath.push(pdfPoint2viewPoint(point, viewport))
  }
  return viewPath
}

export const pdfPaths2viewPaths = (paths, viewport) => {
  const viewPaths = []
  for (const path of paths) {
    viewPaths.push(pdfPath2viewPath(path, viewport))
  }
  return viewPaths
}

export const viewRect2pdfRect = (rect, viewport) => {}
export const viewPoint2pdfPoint = (point, viewport) => {}
export const viewPath2pdfPath = (path, viewport) => {}
export const viewPaths2pdfPaths = (paths, viewport) => {}




