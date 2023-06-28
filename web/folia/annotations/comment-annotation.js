import { FOLIA_LAYER_ROLES } from "../folia-page-layer";
import FoliaBaseAnnotation from "./base-annotation";
import { ANNOTATION_TYPES } from "../constants";
import { toPdfRect, fromPdfRect, fromPdfPoint, toPdfPoint } from "../folia-util";

class FoliaCommentAnnotation extends FoliaBaseAnnotation {
  editablePropertiesList = ["text"];

  constructor(...props) {
    super(...props);
    this.annotationDIV.style.backgroundColor = "red";
    this.annotationDIV.style.width = "24px";
    this.annotationDIV.style.height = "24px";

    const comment = document.createElement("folia-comment");
    comment.setAttribute("opened", "false");
    comment.setAttribute("userName", this.foliaPageLayer.dataProxy.userEmail);
    comment.addEventListener("submit", (e) => {
      this.annotationData = {
        __typename: ANNOTATION_TYPES.COMMENT,
        text: e.detail.text,
        anchorPoint: toPdfPoint(
          { x, y },
          this.foliaPageLayer.viewport.width,
          this.foliaPageLayer.viewport.height
        ),
      };
      this.foliaPageLayer.eventBus.dispatch("stop-drawing");
    });
    this.annotationDIV.appendChild(comment);
  }

  getRawData() {
    const { id, addedAt, deletedAt, collaboratorEmail, page, anchorPoint, text } = this.annotationRawData;
    return {
      __typename: ANNOTATION_TYPES.IMAGE,
      id,
      addedAt: this.isDirty || addedAt,
      deletedAt,
      collaboratorEmail,
      page,
      anchorPoint,
      text,
    };
  }

  updateRects() {
    const point = {
      x: this.annotationDIV.offsetLeft,
      y: this.annotationDIV.offsetTop,
    };
    this.annotationRawData.anchorPoint = toPdfPoint(point, this.viewport.width, this.viewport.height);
    this.render();
  }

  render() {
    const { width: viewportWidth, height: viewportHeight } = this.viewport;
    const { x, y } = fromPdfPoint(this.annotationRawData.anchorPoint, viewportWidth, viewportHeight);
    this.annotationDIV.style.left = `${x}px`;
    this.annotationDIV.style.top = `${y}px`;
  }
}

export default FoliaCommentAnnotation;
