import { ANNOTATION_WEIGHT, FONT_FAMILY, FONT_WEIGHT, RENDERING_ORDER } from "./constants";
import moment from "moment";

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

export const fromPdfRect = (pdfRect, viewportWidth, viewporHeight) => {
  const [left, top, right, bottom] = pdfRect;
  return [
    Math.round(left * viewportWidth),
    Math.round(top * viewporHeight),
    Math.round(right * viewportWidth - left * viewportWidth),
    Math.round(bottom * viewporHeight - top * viewporHeight),
  ];
};

export const toPdfRect = (rect, viewportWidth, viewporHeight) => {
  return [
    1 * (rect[0] / viewportWidth).toFixed(8),
    1 * (rect[1] / viewporHeight).toFixed(8),
    1 * ((rect[2] + rect[0]) / viewportWidth).toFixed(8),
    1 * ((rect[3] + rect[1]) / viewporHeight).toFixed(8),
  ];
};

export const fromPdfPoint = (point, viewportWidth, viewporHeight) => {
  const x = Math.round(point[0] * viewportWidth);
  const y = Math.round(point[1] * viewporHeight);
  return { x, y };
};

export const toPdfPoint = (point, viewportWidth, viewporHeight) => {
  const x = 1 * (point.x / viewportWidth).toFixed(8);
  const y = 1 * (point.y / viewporHeight).toFixed(8);
  return [x, y];
};

export const fromPdfPath = (path, viewportWidth, viewporHeight) => {
  return path.reduce((acc, num, index, arr) => {
    if (index % 2 === 0) return acc;
    const point = fromPdfPoint([arr[index - 1], num], viewportWidth, viewporHeight);
    acc.push(point);
    return acc;
  }, []);
};

export const toPdfPath = (path, viewportWidth, viewporHeight) => {
  return path.reduce((acc, point) => {
    const pdfPoint = toPdfPoint(point, viewportWidth, viewporHeight);
    return acc.concat(pdfPoint);
  }, []);
};

// deprecated
export const shiftRect = (rect, shiftValue) => {
  const outRect = rect.slice();
  outRect[0] += rect[0] - shiftValue > 0 ? -shiftValue : shiftValue;
  outRect[1] += rect[1] - shiftValue > 0 ? -shiftValue : shiftValue;
  return outRect;
};

// deprecated
export const shiftArrow = (inSource, inTarget, shiftValue) => {
  const left = Math.min(inSource.x, inTarget.x);
  const top = Math.min(inSource.y, inTarget.y);
  const right = Math.max(inSource.x, inTarget.x);
  const bottom = Math.max(inSource.y, inTarget.y);
  const ratio = (right - left) / (bottom - top);
  const outSource = { x: inSource.x, y: inSource.y };
  const outTarget = { x: inTarget.x, y: inTarget.y };

  if (ratio <= 1) {
    // horizontal shift
    if (left - shiftValue > 0) {
      outSource.x -= shiftValue;
      outTarget.x -= shiftValue;
    } else {
      outSource.x += shiftValue;
      outTarget.x += shiftValue;
    }
  } else {
    // vertical shift
    if (top - shiftValue > 0) {
      outSource.y -= shiftValue;
      outTarget.y -= shiftValue;
    } else {
      outSource.y += shiftValue;
      outTarget.y += shiftValue;
    }
  }

  return { sourcePoint: outSource, targetPoint: outTarget };
};

// deprecated
export const shiftInk = (inPaths, shiftValue) => {
  const { left, top, right, bottom } = [].concat.apply([], inPaths).reduce(
    (acc, point) => {
      return {
        left: Math.min(acc.left, point.x),
        top: Math.min(acc.top, point.y),
        right: Math.max(acc.right, point.x),
        bottom: Math.max(acc.bottom, point.y),
      };
    },
    { left: Infinity, right: -Infinity, top: Infinity, bottom: -Infinity }
  );

  return inPaths.map((path) => {
    return path.map((point) => ({
      x: (point.x += left - shiftValue > 0 ? -shiftValue : shiftValue),
      y: (point.y += top - shiftValue > 0 ? -shiftValue : shiftValue),
    }));
  });
};

export const foliaDateFormat = (isoDate) => {
  try {
    const now = moment(new Date().toISOString());
    const printedDate = moment(isoDate);

    const isToday = now.isSame(printedDate, "day");
    const isYesterday = now.add(-1, "day").isSame(printedDate, "day");

    if (isToday) {
      return `Today, at ${printedDate.format("hh:mm A")}`;
    } else if (isYesterday) {
      return `Yesterday, at ${printedDate.format("hh:mm A")}`;
    } else {
      return printedDate.format("MMMM D, YYYY") + " at " + printedDate.format("hh:mm A");
    }
  } catch (e) {
    console.error(e);
    return "unknown date";
  }
};

export const _foliaDateFormat = (isoDate) => {
  try {
    const formatter = Intl.DateTimeFormat("en-US", { hour: "2-digit", minute: "2-digit" });
    const fullFormatter = Intl.DateTimeFormat("en-US", {
      month: "short",
      year: "numeric",
      hour12: "2-digit",
      minute: "2-digit",
    });
    const now = new Date();
    const printedDate = new Date(isoDate);

    const isToday =
      now.getDay() === printedDate.getDay() &&
      now.getMonth() === printedDate.getMonth() &&
      now.getFullYear() === printedDate.getFullYear();

    const isYesterday =
      now.getDay() - printedDate.getDay() === 1 &&
      now.getMonth() === printedDate.getMonth() &&
      now.getFullYear() === printedDate.getFullYear();

    if (isToday) {
      // today + time
      console.log("1", { now, printedDate }, `Today, ${formatter.format(printedDate)}`);
      return `Today, ${formatter.format(printedDate)}`;
    } else if (isYesterday) {
      // yesterday + time
      console.log("1", { now, printedDate }, `Yesterday, at ${formatter.format(printedDate)}`);
      return `Yesterday, at ${formatter.format(printedDate)}`;
    } else {
      console.log("1", { now, printedDate }, fullFormatter.format(printedDate));
      return fullFormatter.format(printedDate);
    }
  } catch (e) {
    return "unknown date";
  }
};

export const setTextAreaDynamicHeight = (textArea) => {
  if (!textArea) return;
  textArea.style.height = "auto";
  const textAreaStyles = window.getComputedStyle(textArea);
  const paddingTop = parseInt(textAreaStyles.getPropertyValue("padding-top"), 10);
  const paddingBottom = parseInt(textAreaStyles.getPropertyValue("padding-bottom"), 10);
  const height = textArea.scrollHeight - paddingTop - paddingBottom;
  textArea.style.height = height + "px";
};

export const addAnnotationEl = (containerEl, annotationEl) => {
  const annoWeight = Array.from(annotationEl.classList).reduce((acc, className) => {
    return Math.max(acc, ANNOTATION_WEIGHT.indexOf(className));
  }, -1);
  const children = containerEl.children;
  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    const childWeight = Array.from(child.classList).reduce((acc, className) => {
      return Math.max(acc, ANNOTATION_WEIGHT.indexOf(className));
    }, -1);
    if (childWeight < annoWeight) {
      return containerEl.insertBefore(annotationEl, child);
    } else if (childWeight === annoWeight) {
      const childAddedAt = parseInt(child.dataset["timestamp"], 10);
      const annoAddedAt = parseInt(annotationEl.dataset["timestamp"], 10);
      if (childAddedAt > annoAddedAt) {
        return containerEl.insertBefore(annotationEl, child);
      }
    }
  }
  return containerEl.appendChild(annotationEl);
};

export const getInitials = (username = "") => {
  const dividers = [" ", ".", "_", "-", "+"];
  const name = username.toUpperCase().split("@")[0];
  const nameDividerPosition = [...name].findIndex((ch, index) => {
    return dividers.includes(ch);
  });

  return name[0] + name[Math.max(0, nameDividerPosition) + 1];
};

export const getRelativePoint = (e) => {
  return {
    x: e.layerX,
    y: e.layerY,
  };
  // let reference;
  // const offset = {
  //   left: e.target.offsetLeft - e.target.scrollLeft,
  //   top: e.target.offsetTop - e.target.scrollTop,
  // };
  // reference = e.target.offsetParent;
  // do {
  //   offset.left += reference.offsetLeft - reference.scrollLeft;
  //   offset.top += reference.offsetTop - reference.scrollTop;
  //   reference = reference.offsetParent;
  // } while (reference);

  // return {
  //   x: Math.round(e.pageX - offset.left),
  //   y: Math.round(e.pageY - offset.top),
  // };
};

export const setRectNewPosition = (rect, viewport, position, _lineWidth = 0) => {
  const lineWidth = _lineWidth * viewport.scale;
  const viewportRect = fromPdfRect(rect, viewport.width, viewport.height);
  return toPdfRect(
    [
      Math.max(
        lineWidth / 2,
        Math.min(position.x - viewportRect[2] / 2, viewport.width - viewportRect[2] - lineWidth / 2)
      ),
      Math.max(
        lineWidth / 2,
        Math.min(position.y - viewportRect[3] / 2, viewport.height - viewportRect[3] - lineWidth / 2)
      ),
      viewportRect[2],
      viewportRect[3],
    ],
    viewport.width,
    viewport.height
  );
};

export const setArrowNewPosition = (_sourcePoint, _targetPoint, viewport, position, _lineWidth = 0) => {
  const sourcePoint = fromPdfPoint(_sourcePoint, viewport.width, viewport.height);
  const targetPoint = fromPdfPoint(_targetPoint, viewport.width, viewport.height);
  const lineWidth = _lineWidth * viewport.scale;

  const arrowRect = [
    Math.min(sourcePoint.x, targetPoint.x),
    Math.min(sourcePoint.y, targetPoint.y),
    Math.max(sourcePoint.x, targetPoint.x) - Math.min(sourcePoint.x, targetPoint.x),
    Math.max(sourcePoint.y, targetPoint.y) - Math.min(sourcePoint.y, targetPoint.y),
  ];
  const directionX = Math.sign(targetPoint.x - sourcePoint.x);
  const directionY = Math.sign(targetPoint.y - sourcePoint.y);

  const deltaX = arrowRect[0] - position.x + arrowRect[2] / 2;
  const deltaY = arrowRect[1] - position.y + arrowRect[3] / 2;

  // prettier-ignore
  const newArrowRect = [
    Math.min(
      Math.max(arrowRect[0] - deltaX, lineWidth / 2),
      viewport.width - arrowRect[2] - lineWidth / 2
    ),
    Math.min(
      Math.max(arrowRect[1] - deltaY, lineWidth / 2),
      viewport.height - arrowRect[3] - lineWidth / 2
    ),
    arrowRect[2],
    arrowRect[3],
  ];

  return {
    targetPoint: toPdfPoint(
      {
        x: directionX === -1 ? newArrowRect[0] : newArrowRect[0] + newArrowRect[2],
        y: directionY === -1 ? newArrowRect[1] : newArrowRect[1] + newArrowRect[3],
      },
      viewport.width,
      viewport.height
    ),
    sourcePoint: toPdfPoint(
      {
        x: directionX === -1 ? newArrowRect[0] + newArrowRect[2] : newArrowRect[0],
        y: directionY === -1 ? newArrowRect[1] + newArrowRect[3] : newArrowRect[1],
      },
      viewport.width,
      viewport.height
    ),
  };
};

export const setPathsNewPosition = (_paths, viewport, position, _lineWidth = 0) => {
  const lineWidth = _lineWidth * viewport.scale;
  const { left, top, right, bottom } = _paths.flat().reduce(
    (acc, path, index, arr) => {
      if (index % 2 !== 0) {
        const point = [arr[index - 1], arr[index]];
        const viewportPoint = fromPdfPoint(point, viewport.width, viewport.height);
        return {
          left: Math.min(acc.left, viewportPoint.x),
          top: Math.min(acc.top, viewportPoint.y),
          right: Math.max(acc.right, viewportPoint.x),
          bottom: Math.max(acc.bottom, viewportPoint.y),
        };
      } else {
        return acc;
      }
    },
    { left: Infinity, right: -Infinity, top: Infinity, bottom: -Infinity }
  );

  const posLeft = Math.max(
    lineWidth / 2,
    Math.min(position.x - (right - left) / 2, viewport.width - (right - left) - lineWidth / 2)
  );
  const posTop = Math.max(
    lineWidth / 2,
    Math.min(position.y - (bottom - top) / 2, viewport.height - (bottom - top) - lineWidth / 2)
  );

  const paths = _paths.map((path) => {
    const viewportPath = fromPdfPath(path, viewport.width, viewport.height).map((point) => {
      return {
        x: point.x - left + posLeft,
        y: point.y - top + posTop,
      };
    });
    return toPdfPath(viewportPath, viewport.width, viewport.height);
  });
  return paths;
};

export const setTextRectNewPosition = (viewport, text, _fontFamily, _fontSize, _fontWeight) => {
  const fontFamily = FONT_FAMILY[_fontFamily];
  const fontSize = _fontSize * viewport.scale;
  const fontWeight = FONT_WEIGHT[_fontWeight];

  const canvas = document.createElement("canvas");
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext("2d");
  ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
  const textRect = ctx.measureText(text);

  return toPdfRect(
    [0, 0, textRect.width, textRect.fontBoundingBoxAscent + textRect.fontBoundingBoxDescent],
    viewport.width,
    viewport.height
  );
};

export const sortObjects = (obj1, obj2) => {
  // console.log(obj1.addedAt, obj2.addedAt);
  const date1 = new Date(obj1.addedAt);
  const date2 = new Date(obj2.addedAt);
  return date1.getTime() - date2.getTime();

  // if (obj1.__typename === obj2.__typename) {
  // } else {
  //   const index1 = RENDERING_ORDER.findIndex((objType) => objType === obj1.__typename);
  //   const index2 = RENDERING_ORDER.findIndex((objType) => objType === obj2.__typename);
  //   return index2 - index1;
  // }
};

export const areArraysSimilar = (arr1, arr2) => {
  if (!Array.isArray(arr1)) return false;
  if (!Array.isArray(arr2)) return false;
  if (arr1.length !== arr2.length) return false;
  return arr1.every((arr1item, arr1index) => {
    return arr2[arr1index] === arr1item;
  });
};
