// export const pdfRect2viewRect = (rect, viewport) => {
//   return [
//     Math.round(rect[0] * viewport.width),
//     Math.round(rect[1] * viewport.height),
//     Math.round(rect[2] * viewport.width),
//     Math.round(rect[3] * viewport.height)
//   ]
// }
// export const viewRect2pdfRect = (rect, viewport) => {
//   const x = parseFloat((rect[0] / viewport.width).toFixed(8))
//   const y = parseFloat((rect[1] / viewport.height).toFixed(8))
//   const w = parseFloat((rect[2] / viewport.width).toFixed(8))
//   const h = parseFloat((rect[3] / viewport.height).toFixed(8))
//   return [x, y, w, h]
// }
// export const getAbsoluteOffset = (el, stopEl) => {
//   let reference
//   const offset = {
//     left: el.offsetLeft, top: el.offsetTop
//   }

//   reference = el.offsetParent
//   do {
//     offset.left += reference.offsetLeft
//     offset.top += (reference.offsetTop - reference.scrollTop)

//     reference = reference.offsetParent
//     if (reference === stopEl) break
//   } while(reference)

//   return offset
// }

// export const pdfPoint2viewPoint = (point, viewport, offset) => {
//   const x = Math.round(point.x * viewport.width) - (offset ? offset.x : 0);
//   const y = Math.round(point.y * viewport.height) - (offset ? offset.y : 0);
//   return { x, y };
// };
// export const pdfPath2viewPath = (path, viewport, offset) => {
//   return path.reduce((acc, num, index, arr) => {
//     if (index % 2 === 0) return acc;
//     const pdfPoint = { x: arr[index - 1], y: num };
//     const point = pdfPoint2viewPoint(pdfPoint, viewport, offset);
//     acc.push(point);
//     return acc;
//   }, []);
// };

// export const viewPoint2pdfPoint = (point, viewport, offset) => {
//   const px = point.x + (offset ? offset.x : 0);
//   const py = point.y + (offset ? offset.y : 0);
//   const x = parseFloat((px / viewport.width).toFixed(8));
//   const y = parseFloat((py / viewport.height).toFixed(8));
//   return { x, y };
// };
// export const viewPath2pdfPath = (path = [], viewport, offset) => {
//   return path.reduce((acc, point) => {
//     const pdfPoint = viewPoint2pdfPoint(point, viewport, offset);
//     return acc.concat(pdfPoint.x, pdfPoint.y);
//   }, []);
// };

export const hexColor2pdf = (hexColor = "#F04E23DC") => {
  const hex = hexColor.toLowerCase().split("").slice(1).join("");
  if (hex.length % 2 !== 0) console.warn(`wrong hex string "${hexColor}"`);
  const intRed = parseInt(hex.substring(0, 2), 16);
  const intGreen = parseInt(hex.substring(2, 4), 16);
  const intBlue = parseInt(hex.substring(4, 6), 16);
  const intAlpha = parseInt(hex.substring(6, 8) || "ff", 16);
  const pdfRed = parseFloat((intRed / 255).toFixed(8));
  const pdfGreen = parseFloat((intGreen / 255).toFixed(8));
  const pdfBlue = parseFloat((intBlue / 255).toFixed(8));
  const pdfAlpha = parseFloat((intAlpha / 255).toFixed(2));
  return [pdfRed, pdfGreen, pdfBlue, pdfAlpha];
};
export const pdfColor2hex = (pdfColor = [0, 0, 0, 1]) => {
  const red = Math.ceil(pdfColor[0] * 255).toString(16);
  const green = Math.ceil(pdfColor[1] * 255).toString(16);
  const blue = Math.ceil(pdfColor[2] * 255).toString(16);
  const alpha = Math.ceil(pdfColor[3] * 255).toString(16);
  return `#${red}${green}${blue}${alpha}`;
};
export const rgbaColor2pdf = (rgbaColor = "rgba(0, 0, 0, 1)") => {
  const regexpPattern = /rgba\(\d+\s*,\d+\s*,\d+\s*,\d+\)/i;
  const regexpResult = regexpPattern.exec(rgbaColor);
  return [0, 0, 0, 1];
};
export const pdfColor2rgba = (pdfColor = [0, 0, 0, 1]) => {
  const red = pdfColor[0] * 255;
  const green = pdfColor[1] * 255;
  const blue = pdfColor[2] * 255;
  const opacity = pdfColor[3];
  return `rgba(${red}, ${green}, ${blue}, ${opacity})`;
};
export const blob2base64 = (blob, callback) => {
  const fileReader = new FileReader();
  fileReader.onload = () => {
    callback(fileReader.result);
  };
  fileReader.onerror = (error) => {
    throw error;
  };
  fileReader.readAsDataURL(blob);
};

export const hexColor2RGBA = (hexColor) => {
  const hex = hexColor.toLowerCase().split("").slice(1).join("");
  if (hex.length % 2 !== 0) console.warn(`invalide hex color string "${hexColor}"`);
  const red = parseInt(hex.substring(0, 2), 16);
  const green = parseInt(hex.substring(2, 4), 16);
  const blue = parseInt(hex.substring(4, 6), 16);
  let alpha = parseInt(hex.substring(6, 8) || "ff", 16) / 255;
  if (alpha < 0.1) alpha = 0.1;
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
};

export const fromPdfRect = (pdfRect, viewportWidth, viewporHeight, borderSize = 0) => {
  // left, top, right, bottom
  return [
    Math.round(pdfRect[0] * viewportWidth - borderSize / 2),
    Math.round(pdfRect[1] * viewporHeight - borderSize / 2),
    Math.round(pdfRect[2] * viewportWidth - pdfRect[0] * viewportWidth + borderSize),
    Math.round(pdfRect[3] * viewporHeight - pdfRect[1] * viewporHeight + borderSize),
  ];
};

export const toPdfRect = (rect, viewportWidth, viewporHeight) => {
  return [
    parseFloat((rect[0] / viewportWidth).toFixed(8)),
    parseFloat((rect[1] / viewporHeight).toFixed(8)),
    parseFloat(((rect[2] + rect[0]) / viewportWidth).toFixed(8)),
    parseFloat(((rect[3] + rect[1]) / viewporHeight).toFixed(8)),
  ];
};

export const fromPdfPoint = (point, viewportWidth, viewporHeight, offsetX = 0, offsetY = 0) => {
  const x = Math.round(point[0] * viewportWidth) + offsetX;
  const y = Math.round(point[1] * viewporHeight) + offsetY;
  return { x, y };
};

export const toPdfPoint = (point, viewportWidth, viewporHeight, offsetX = 0, offsetY = 0) => {
  const x = parseFloat(((point.x - offsetX) / viewportWidth).toFixed(8));
  const y = parseFloat(((point.y - offsetY) / viewporHeight).toFixed(8));
  return [x, y];
};

export const fromPdfPath = (path, viewportWidth, viewporHeight, offsetX, offsetY) => {
  return path.reduce((acc, num, index, arr) => {
    if (index % 2 === 0) return acc;
    const point = fromPdfPoint([arr[index - 1], num], viewportWidth, viewporHeight, offsetX, offsetY);
    acc.push(point);
    return acc;
  }, []);
};

export const toPdfPath = (path, viewportWidth, viewporHeight, offsetX, offsetY) => {
  return path.reduce((acc, point) => {
    const pdfPoint = toPdfPoint(point, viewportWidth, viewporHeight, offsetX, offsetY);
    return acc.concat(pdfPoint);
  }, []);
};
