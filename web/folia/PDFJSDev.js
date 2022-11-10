import pdfjsBuild from "../../build/version.json";

const PDFJSDev = function () {}

PDFJSDev.prototype.eval = function (key) {
  switch (key) {
    case 'BUNDLE_VERSION': return pdfjsBuild.version
    default: return true
  }
}

PDFJSDev.prototype.test = function (key) {
  switch (key) {
    case '!PRODUCTION || GENERIC': return false
    default: return true
  }
}

export default PDFJSDev
