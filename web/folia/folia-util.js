import { ANNOTATION_WEIGHT } from "./constants";

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

export const shiftRect = (rect, shiftValue) => {
  const outRect = rect.slice();
  outRect[0] += rect[0] - shiftValue > 0 ? -shiftValue : shiftValue;
  outRect[1] += rect[1] - shiftValue > 0 ? -shiftValue : shiftValue;
  return outRect;
};

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
      return `Today, at ${formatter.format(printedDate)}`;
    } else if (isYesterday) {
      // yesterday + time
      return `Yesterday, at ${formatter.format(printedDate)}`;
    } else {
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
